app.use(express.static("public"));

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // serve index.html & assets

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// API Route für Bildgenerierung
app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Kein Prompt gesendet" });

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        size: "1024x1024",
      }),
    });

    const aiData = await aiResponse.json();
    console.log("OpenAI response:", aiData);

    if (!aiData.data || !aiData.data[0]) {
      return res.status(500).json({ error: "Bild konnte nicht erzeugt werden", details: aiData });
    }

    const imageUrl = aiData.data[0].url;

    // Upload zu Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imageUrl, {
      folder: "machdeinbild",
    });

    res.json({ imageUrl: uploadResult.secure_url });

  } catch (error) {
    console.error("Fehler im /generate:", error);
    res.status(500).json({ error: "Interner Fehler beim Bild-Upload oder Generieren" });
  }
});

// Startseite
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serverstart
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
});
