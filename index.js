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

// Neue Bestellung: an Printful schicken
app.post("/api/create-order", async (req, res) => {
  const { product, size, imageUrl, recipient } = req.body;

  console.log("Neue Bestellung:", product, size, imageUrl, recipient);

  if (!product || !size || !imageUrl || !recipient) {
    return res.status(400).json({ error: "Fehlende Daten für Bestellung." });
  }

  // ➜ Wähle deine Printful Variant-ID je nach Produkt + Größe
  // Beispiel: Diese IDs musst du anpassen!
  let variant_id = null;

  if (product === "poster") {
    if (size === "A3") variant_id = 4012;
    if (size === "A2") variant_id = 4013;
    if (size === "A1") variant_id = 4014;
  } else if (product === "leinwand") {
    if (size === "A3") variant_id = 5012;
    if (size === "A2") variant_id = 5013;
    if (size === "A1") variant_id = 5014;
  }

  if (!variant_id) {
    return res.status(400).json({ error: "Ungültige Produkt-/Größen-Kombination." });
  }

  // Baue Printful-Bestellung
  const printfulOrder = {
    recipient: {
      name: recipient.name,
      address1: recipient.address1,
      city: recipient.city,
      country_code: recipient.country_code || "DE",
      zip: recipient.zip,
      email: recipient.email,
    },
    items: [
      {
        variant_id: variant_id,
        quantity: 1,
        files: [
          { url: imageUrl },
        ],
      },
    ],
  };

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(process.env.PRINTFUL_API_KEY + ":").toString("base64"),
      },
      body: JSON.stringify(printfulOrder),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Printful-Fehler:", data);
      return res.status(500).json({ error: "Printful API Fehler", details: data });
    }

    console.log("✅ Printful-Bestellung erstellt:", data);
    res.json({ success: true, printful: data });

  } catch (err) {
    console.error("Fehler bei Printful-Call:", err);
    res.status(500).json({ error: "Server-Fehler bei Printful." });
  }
});



