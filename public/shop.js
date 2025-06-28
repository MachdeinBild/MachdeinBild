// Buttons & Felder aus dem HTML holen
const generateBtn = document.getElementById("generateBtn");
const orderBtn = document.getElementById("orderBtn");
const preview = document.getElementById("preview");
const promptInput = document.getElementById("prompt");

const nameInput = document.getElementById("name");
const addressInput = document.getElementById("address");
const zipInput = document.getElementById("zip");
const cityInput = document.getElementById("city");
const phoneInput = document.getElementById("phone");

// Speichert Cloudinary-URL & Printful-File-ID
let cloudinaryUrl = "";
let printfulFileId = "";

// Bild generieren
generateBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert("Bitte gib einen Prompt ein!");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generiere...";

  try {
    // 1) Anfrage an deinen Node-Server (/generate)
    const genRes = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const genData = await genRes.json();
    cloudinaryUrl = genData.imageUrl;

    // Bild anzeigen
    preview.src = cloudinaryUrl;
    preview.style.display = "block";

    // 2) Bild zu Printful hochladen (/api/upload-file)
    const uploadRes = await fetch("/api/upload-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: cloudinaryUrl }),
    });

    const uploadData = await uploadRes.json();
    printfulFileId = uploadData.result.id;

    console.log("File-ID von Printful:", printfulFileId);

    // Bestellung möglich machen
    orderBtn.disabled = false;

  } catch (err) {
    console.error(err);
    alert("Fehler beim Generieren oder Hochladen.");
  }

  generateBtn.disabled = false;
  generateBtn.textContent = "Bild generieren";
});

// Bestellung abschicken
orderBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const address = addressInput.value.trim();
  const zip = zipInput.value.trim();
  const city = cityInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !address || !zip || !city || !phone) {
    alert("Bitte fülle alle Felder aus!");
    return;
  }

  orderBtn.disabled = true;
  orderBtn.textContent = "Bestellung wird gesendet...";

  try {
    // 3) Bestellung anlegen (/api/create-order)
    const orderRes = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: {
          name: name,
          address1: address,
          city: city,
          country_code: "DE",
          zip: zip,
          phone: phone,
        },
        items: [
          {
            variant_id: 123456, // <-- HIER DEINE echte Variant-ID von Printful!
            quantity: 1,
            files: [{ id: printfulFileId }],
          },
        ],
      }),
    });

    const orderData = await orderRes.json();
    console.log("Bestellung:", orderData);

    alert("Bestellung erfolgreich aufgegeben! 🎉");

  } catch (err) {
    console.error(err);
    alert("Fehler bei der Bestellung.");
  }

  orderBtn.disabled = false;
  orderBtn.textContent = "Bestellung aufgeben";
});
