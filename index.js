
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
   const aiResponse = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: "image-alpha-001",
    prompt: prompt,
    size: "1024x1024",
    response_format: "url"
  })
});

    
const aiData = await aiResponse.json();
console.log("OpenAI response:", aiData); // <-- zum Testen
if (!aiData.data || !aiData.data[0]) {
  return res.status(500).json({ error: "Fehler beim Bildabruf von OpenAI", details: aiData });
}
const imageUrl = aiData.data[0].url;

    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
      folder: "machdeinbild",
    });

    res.json({ imageUrl: uploadResponse.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
