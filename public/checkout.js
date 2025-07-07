// Header & Footer laden
fetch("header.html")
  .then(res => res.text())
  .then(data => document.getElementById("site-header").innerHTML = data);

fetch("footer.html")
  .then(res => res.text())
  .then(data => document.getElementById("site-footer").innerHTML = data);

// Daten aus LocalStorage
const product = localStorage.getItem("selectedProduct") || "Poster";
const size = localStorage.getItem("selectedSize") || "A3";
const imageUrl = localStorage.getItem("generatedImage") || "https://res.cloudinary.com/dntk0kj6v/image/upload/v1751542396/Platzhalter_ds7tj4.png";

// Preislogik
let price = 19.99;
if (size === "A2") price = 29.99;
if (size === "A1") price = 39.99;

// Anzeige
document.getElementById("product") && (document.getElementById("product").textContent = product);
document.getElementById("size") && (document.getElementById("size").textContent = size);
document.getElementById("price") && (document.getElementById("price").textContent = price.toFixed(2) + " €");
document.getElementById("checkout-image") && (document.getElementById("checkout-image").src = imageUrl);

// Formular absenden
document.getElementById("buyBtn").addEventListener("click", async () => {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const street = document.getElementById("street").value.trim();
  const houseNumber = document.getElementById("houseNumber").value.trim();
  const zip = document.getElementById("zip").value.trim();
  const city = document.getElementById("city").value.trim();
  const birthday = document.getElementById("birthday").value.trim();
  const gender = document.querySelector("input[name='gender']:checked")?.value || "";
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const payment = document.querySelector("input[name='payment']:checked")?.value || "";

  // Pflichtfelder prüfen
  if (!firstName || !lastName || !street || !houseNumber || !zip || !city || !birthday || !gender || !email || !payment) {
    alert("Bitte fülle alle Pflichtfelder aus und wähle eine Zahlungsart!");
    return;
  }

  try {
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product,
        size,
        imageUrl,
        recipient: {
          name: `${firstName} ${lastName}`,
          address1: `${street} ${houseNumber}`,
          zip,
          city,
          country_code: "DE",
          email
        },
        // Du kannst birthday, gender, phone, payment speichern oder mailen – Printful ignoriert das aber!
        extra: {
          birthday,
          gender,
          phone,
          payment
        }
      }),
    });

    const data = await res.json();
    console.log(data);
    if (res.ok) {
      window.location.href = "thankyou.html";
    } else {
      alert("Es gab ein Problem mit deiner Bestellung.");
    }
  } catch (err) {
    console.error(err);
    alert("Es gab ein Problem beim Absenden.");
  }
});




