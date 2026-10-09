# 🖼️ Trello Gallery Viewer Power-Up

A modern, responsive, and feature-packed **Gallery Viewer Power-Up** for Trello boards and cards.

---

## 📁 Project Structure

```
Gallary Viewer/
├── public/
│   ├── index.html                 # Main Power-Up iframe connector entry point
│   ├── assets/
│   │   └── icon.svg               # Power-Up SVG icon
│   ├── css/
│   │   ├── global.css             # Base design tokens & Atlassian-aligned styles
│   │   ├── gallery-modal.css      # Lightbox & fullscreen modal styling
│   │   ├── card-section.css       # Embedded card-back section widget
│   │   └── settings.css           # Power-Up configuration pop-up UI
│   ├── js/
│   │   ├── connector.js           # TrelloPowerUp.initialize capabilities definitions
│   │   ├── gallery-modal.js       # Lightbox, zoom, navigation & slideshow logic
│   │   ├── card-section.js        # Card-back thumbnail strip logic
│   │   ├── board-gallery.js       # Board-wide aggregate image browser
│   │   ├── settings.js            # User/Board preference storage
│   │   └── trello-api.js          # Attachment filters & image format helpers
│   └── views/
│       ├── gallery-modal.html     # Fullscreen interactive Lightbox & Grid view
│       ├── card-section.html      # Embedded thumbnail view on card back
│       ├── board-gallery.html     # Board-level media gallery modal
│       └── settings.html          # Settings pop-up dialog
├── server.js                      # Express dev server with CORS & Trello iframe headers
├── package.json                   # Dependencies & scripts
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
└── README.md                      # Documentation & registration guide
```

---

## ⚡ Features & Capabilities

- **Card Buttons**: Open the interactive Fullscreen Lightbox directly from any card.
- **Board Button**: Open the Board Media Gallery to browse all image attachments across lists.
- **Card Badges & Detail Badges**: Live counters showing image count directly on card front & back.
- **Card Back Section**: Seamless embedded thumbnail carousel directly on the card view.
- **Interactive Lightbox Modal**:
  - Fullscreen viewing with Next / Previous controls & keyboard shortcuts (← / → / Space / Esc).
  - Smooth Zoom-in / Zoom-out controls.
  - Automatic Slideshow mode.
  - Toggle between Single Lightbox and Multi-column Masonry Grid view.
- **Custom Settings & OAuth**:
  - Configurable default view mode, slideshow speed, and autoplay.
  - Built-in Trello Token Authorization flow (`authorization-status` & `show-authorization`) for private board/card attachments.

---

## 🔑 Trello API Key Configuration

To enable the OAuth authorization flow:
1. Obtain your Trello API Key from [trello.com/power-ups/admin](https://trello.com/power-ups/admin).
2. Set `TRELLO_APP_KEY` in `public/js/auth.js` (or in `.env`).

---

## 🚀 Quick Start & Local Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm start
```
The server will run on `http://localhost:3000`.

### 3. Expose via HTTPS Tunnel (Required for Trello)
Trello requires all Power-Up iframe URLs to be served over **HTTPS**. Use ngrok or Cloudflare Tunnels:

```bash
npx ngrok http 3000
```
Copy the generated HTTPS URL (e.g. `https://xxxx-xx.ngrok-free.app`).

---

## 🛠️ Registering on Trello Developer Portal

1. Go to [Trello Power-Up Admin Portal](https://trello.com/power-ups/admin).
2. Click **New Power-Up**.
3. Fill in the details:
   - **Name**: `Gallery Viewer`
   - **Iframe connector URL**: `https://<YOUR_HTTPS_TUNNEL_URL>/index.html`
   - **Icon**: `https://<YOUR_HTTPS_TUNNEL_URL>/assets/icon.svg`
4. Under **Capabilities**, enable:
   - Card buttons
   - Board buttons
   - Card badges
   - Card detail badges
   - Card back section
   - Show settings
   - Authorization status & Show authorization
5. Open your Trello Board, go to **Power-Ups** -> **Custom**, and enable **Gallery Viewer**.

