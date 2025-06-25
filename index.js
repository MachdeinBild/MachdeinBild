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

app.use(express.static(path.join(__dirname, "public")));


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Route für den Root-Pfad, der die index.html ausliefert
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Kein Prompt bereitgestellt" });

  try {
    // Anfrage an OpenAI, um das Bild zu generieren
    const aiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: req.body.prompt, // Das Prompt für die Bildgenerierung
        n: 1,                    // Anzahl der zu generierenden Bilder
        size: "1024x1024",       // Größe des Bildes
        model: "dall-e-3",       // Das verwendete Modell (z.B. DALL-E 3)
      }),
    });

    // Überprüfen, ob die Antwort der OpenAI-API erfolgreich war
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text(); // Hole den Fehlertext
      console.error("Fehler bei der OpenAI-Anfrage:", errorText); // Protokolliere den Fehler
      throw new Error(`OpenAI API Fehler: ${aiResponse.statusText}`);
    }

    // Verarbeite die Antwort
    const aiData = await aiResponse.json();
    const imageUrl = aiData.data && aiData.data[0] && aiData.data[0].url;

    if (!imageUrl) {
      console.error("Kein Bild-URL von OpenAI erhalten:", aiData);
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
