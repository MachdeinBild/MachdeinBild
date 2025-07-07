// loadLayout.js

// Header laden
fetch('header.html')
  .then(response => response.text())
  .then(data => {
    document.getElementById('site-header').innerHTML = data;
  })
  .catch(err => console.error('Fehler beim Laden des Headers:', err));

// Footer laden
fetch('footer.html')
  .then(response => response.text())
  .then(data => {
    document.getElementById('site-footer').innerHTML = data;
  })
  .catch(err => console.error('Fehler beim Laden des Footers:', err));
