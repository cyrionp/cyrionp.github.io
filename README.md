# cyrionp.github.io

Abdulkadir Durmaz'ın kişisel sayfası — kaydırmalı tek sayfa, [Three.js](https://threejs.org) ile canlı bir arka plan.

- `index.html` — içerik (About, Experience, Projects, Skills, Education, Contact)
- `assets/css/style.css` — stil (mobil uyumlu, `prefers-reduced-motion` destekli)
- `assets/js/scene.js` — Three.js sahnesi, bölümlere göre değişen küre
- `assets/js/scroll.js` — üst bar, ilerleme çubuğu, kaydırma efektleri
- `assets/js/ui.js` — başlık / yazı animasyonları, buton ve kart efektleri
- `assets/js/terminal.js` — gizli terminal (<kbd>`</kbd> tuşu ya da telefonda `AD` logosuna uzun bas)
- `assets/vendor/`, `assets/fonts/` — Three.js ve fontlar repoda, harici CDN yok
- `404.html` — bulunamayan sayfalar

Derleme adımı yok; GitHub Pages doğrudan servis eder. Lokal: `python3 -m http.server`.
