const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Root-Route: Startseite
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Bild-Generierung über OpenAI + Upload zu Cloudinary
app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Kein Prompt bereitgestellt" });

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        model: "dall-e-3",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Fehler bei OpenAI:", errorText);
      throw new Error(`OpenAI API Fehler: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.data?.[0]?.url;

    if (!imageUrl) throw new Error("Kein Bild von OpenAI erhalten");

    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
      folder: "machdeinbild",
    });

    console.log("Bild erfolgreich hochgeladen:", uploadResponse.secure_url);
    res.json({ imageUrl: uploadResponse.secure_url });

  } catch (err) {
    console.error("Fehler bei der Generierung:", err);
    res.status(500).json({ error: err.message });
  }
});

// Galerie-API: Holt Bilder aus Cloudinary
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await cloudinary.search
      .expression("folder:machdeinbild")
      .sort_by("created_at", "desc")
      .max_results(30)
      .execute();

    res.json(result.resources);
  } catch (err) {
    console.error("Fehler bei /api/gallery:", err);
    res.status(500).json({ error: err.message });
  }
});

// Kontaktformular: E-Mail senden mit NodeMailer & IONOS
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Alle Felder sind erforderlich." });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.ionos.de",
    port: 587,
    secure: false,
    auth: {
      user: process.env.IONOS_EMAIL,
      pass: process.env.IONOS_EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"MachDeinBild Kontakt" <${process.env.IONOS_EMAIL}>`,
      to: process.env.IONOS_EMAIL,
      replyTo: email,
      subject: `Neue Nachricht von ${name}`,
      text: `Name: ${name}\nE-Mail: ${email}\nNachricht:\n${message}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Fehler beim Senden:", err);
    res.status(500).json({ error: "Nachricht konnte nicht gesendet werden." });
  }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server läuft auf Port ${PORT}`));


