const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for Trello origins
app.use(cors({
  origin: '*'
}));

// Set security headers to allow iframe embedding inside Trello
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://trello.com');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://trello.com");
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Gallery Viewer Trello Power-Up Server Running!`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Connector: http://localhost:${PORT}/index.html`);
  console.log(` Note: For Trello Power-Up testing, use an HTTPS tunnel`);
  console.log(`       e.g., ngrok http ${PORT} or cloudflared`);
  console.log(`====================================================`);
});
