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

// Statische Dateien aus dem Public-Ordner
app.use(express.static(path.join(__dirname, "public")));

// Cloudinary-Konfiguration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Root-Route: index.html ausliefern
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// DALL·E-Generierung + Cloudinary-Upload
app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Kein Prompt bereitgestellt" });

  try {
    // Anfrage an OpenAI
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
      console.error("OpenAI-Fehler:", errorText);
      throw new Error(`OpenAI API Fehler: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.data?.[0]?.url;

    if (!imageUrl) throw new Error("Keine Bild-URL von OpenAI erhalten");

    console.log("Bild-URL:", imageUrl);

    // Hochladen zu Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
      folder: "machdeinbild",
    });

    console.log("Cloudinary-Upload:", uploadResponse.secure_url);

    res.json({ imageUrl: uploadResponse.secure_url });

  } catch (err) {
    console.error("Fehler bei der Bildgenerierung:", err);
    res.status(500).json({ error: `Bildgenerierung fehlgeschlagen: ${err.message}` });
  }
});

// ✅ Helper: Printful Access Token holen
async function getPrintfulAccessToken() {
  const response = await fetch("https://www.printful.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.PRINTFUL_CLIENT_ID,
      client_secret: process.env.PRINTFUL_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fehler beim Token holen:", errorText);
    throw new Error(`Printful Token Fehler: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ✅ Produkte abrufen
app.get("/api/products", async (req, res) => {
  try {
    const token = await getPrintfulAccessToken();

    const response = await fetch("https://api.printful.com/store/products", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Fehler beim Abrufen der Produkte:", err);
    res.status(500).json({ error: "Produkte konnten nicht abgerufen werden" });
  }
});

// ✅ Datei bei Printful hochladen
app.post("/api/upload-file", async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) return res.status(400).json({ error: "fileUrl fehlt" });

  try {
    const token = await getPrintfulAccessToken();

    const response = await fetch("https://api.printful.com/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fileUrl,
        purpose: "default",
      }),
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Fehler beim Datei-Upload:", err);
    res.status(500).json({ error: "Datei-Upload zu Printful fehlgeschlagen" });
  }
});

// ✅ Bestellung erstellen
app.post("/api/create-order", async (req, res) => {
  const { recipient, items } = req.body;

  if (!recipient || !items) {
    return res.status(400).json({ error: "recipient oder items fehlen" });
  }

  try {
    const token = await getPrintfulAccessToken();

    const response = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: recipient,
        items: items,
      }),
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Fehler beim Erstellen der Bestellung:", err);
    res.status(500).json({ error: "Bestellung konnte nicht erstellt werden" });
  }
});

// ✅ Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

