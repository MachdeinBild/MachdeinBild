const product = localStorage.getItem("selectedProduct") || "Poster";
const size = localStorage.getItem("selectedSize") || "A3";
const imageUrl = localStorage.getItem("generatedImage") || "https://res.cloudinary.com/dntk0kj6v/image/upload/v1751542396/Platzhalter_ds7tj4.png";

document.getElementById("product").textContent = product;
document.getElementById("size").textContent = size;
document.getElementById("checkout-image").src = imageUrl;

let price = 19.99;
if (size === "A2") price = 29.99;
if (size === "A1") price = 39.99;
document.getElementById("price").textContent = price.toFixed(2) + " €";

document.getElementById("buyBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const zip = document.getElementById("zip").value.trim();
  const city = document.getElementById("city").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!name || !address || !zip || !city || !email) {
    alert("Bitte fülle alle Felder aus!");
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
        recipient: { name, address1: address, zip, city, country_code: "DE", email }
      }),
    });

    const data = await res.json();
    console.log(data);
    window.location.href = "thankyou.html";
  } catch (err) {
    console.error(err);
    alert("Bestellung fehlgeschlagen.");
  }
});
