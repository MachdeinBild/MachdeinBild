const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
const path = require("path"); // Für das Servieren von statischen Dateien
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Cloudinary-Konfiguration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Statische Dateien (wie index.html, CSS, JS) aus dem Ordner 'public' servieren
app.use(express.static(path.join(__dirname, 'public')));

// Route für den Root-Pfad, der die index.html ausliefert
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    // Anfrage an OpenAI, um das Bild zu generieren
    const aiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "256x256",
        model: "dall-e-3",
      }),
    });

    // Überprüfen, ob die Antwort der OpenAI-API erfolgreich war
    if (!aiResponse.ok) {
      throw new Error(`OpenAI API Fehler: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.data && aiData.data[0] && aiData.data[0].url;

    if (!imageUrl) {
      throw new Error("Kein Bild von OpenAI erhalten");
    }

    console.log("Bild-URL von OpenAI erhalten:", imageUrl);

    // Bild auf Cloudinary hochladen
    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
      folder: "machdeinbild",
    });

    console.log("Bild erfolgreich auf Cloudinary hochgeladen:", uploadResponse.secure_url);

    // Erfolgreiche Antwort zurück an den Client
    res.json({ imageUrl: uploadResponse.secure_url });

  } catch (err) {
    // Detailliertes Fehler-Logging
    console.error("Fehler bei der Bildgenerierung:", err);
    res.status(500).json({ error: `Bildgenerierung fehlgeschlagen: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

