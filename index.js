const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Statische Dateien ausliefern (z. B. public Ordner)
app.use(express.static(path.join(__dirname, "public")));

// Cloudinary konfigurieren
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Route: Index-Seite
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// AI-Bild generieren + bei Cloudinary speichern
app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Kein Prompt bereitgestellt" });

  try {
    // Anfrage an OpenAI (DALL·E)
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
      console.error("OpenAI Fehler:", errorText);
      throw new Error(`OpenAI API Fehler: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Kein Bild von OpenAI erhalten");
    }

    console.log("OpenAI Bild-URL:", imageUrl);

    // Bild bei Cloudinary speichern (Ordner "machdeinbild")
    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
      folder: "machdeinbild",
    });

    console.log("Bei Cloudinary gespeichert:", uploadResponse.secure_url);

    res.json({ imageUrl: uploadResponse.secure_url });

  } catch (err) {
    console.error("Fehler bei /generate:", err);
    res.status(500).json({ error: `Bildgenerierung fehlgeschlagen: ${err.message}` });
  }
});

// Bild zu Printful hochladen
app.post("/api/upload-file", async (req, res) => {
  const { fileUrl } = req.body;
  if (!fileUrl) return res.status(400).json({ error: "Kein Bild-URL übergeben" });

  try {
    const response = await fetch("https://api.printful.com/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
      },
      body: JSON.stringify({ url: fileUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    res.json(data);

  } catch (err) {
    console.error("Fehler beim Upload zu Printful:", err);
    res.status(500).json({ error: `Upload fehlgeschlagen: ${err.message}` });
  }
});

// Bestellung bei Printful anlegen
app.post("/api/create-order", async (req, res) => {
  const { recipient, items } = req.body;

  if (!recipient || !items) {
    return res.status(400).json({ error: "Empfänger- und Artikeldaten fehlen" });
  }

  try {
    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
      },
      body: JSON.stringify({
        recipient,
        items,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    res.json(data);

  } catch (err) {
    console.error("Fehler bei Bestellung:", err);
    res.status(500).json({ error: `Bestellung fehlgeschlagen: ${err.message}` });
  }
});

// Galerie-API: Alle Cloudinary-Bilder aus Ordner holen
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "machdeinbild/",
      max_results: 100,
    });

    res.json(result.resources);

  } catch (err) {
    console.error("Fehler bei Galerie:", err);
    res.status(500).json({ error: "Galerie konnte nicht geladen werden." });
  }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

