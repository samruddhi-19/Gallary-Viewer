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

// Proxy download endpoint for cross-origin images
app.get('/api/download', async (req, res) => {
  const fileUrl = req.query.url;
  let fileName = req.query.filename || 'downloaded-image.png';

  if (!fileUrl) {
    return res.status(400).send('Missing url parameter');
  }

  // Sanitize filename to avoid header injection
  fileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');

  try {
    const response = await fetch(fileUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image: ' + response.statusText);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (error) {
    console.error('Error proxying download:', error);
    return res.status(500).send('Error downloading file');
  }
});

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
