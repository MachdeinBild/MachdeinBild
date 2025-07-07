// Header & Footer laden
fetch("header.html")
  .then(res => res.text())
  .then(data => document.getElementById("site-header").innerHTML = data);

fetch("footer.html")
  .then(res => res.text())
  .then(data => document.getElementById("site-footer").innerHTML = data);

// Bild-Logik
const preview = document.getElementById("preview");
const mockupBg = document.getElementById("mockup-bg");
const imageUrl = localStorage.getItem("generatedImage");

console.log("Gefundene Image-URL:", imageUrl);

if (imageUrl) {
  preview.src = imageUrl;
  preview.classList.remove('placeholder');
} else {
  preview.classList.add('placeholder');
}

// Mockup wechseln
const productSelect = document.getElementById("product");
productSelect.addEventListener("change", () => {
  mockupBg.src = productSelect.value === "poster"
    ? "poster-mockup.png"
    : "leinwand-mockup.png";
});

// Weiter-Button
const nextBtn = document.getElementById("nextBtn");
nextBtn.addEventListener("click", () => {
  const product = productSelect.value;
  const size = document.getElementById("size").value;

  localStorage.setItem("selectedProduct", product);
  localStorage.setItem("selectedSize", size);

  window.location.href = "checkout.html";
});


