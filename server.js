const express = require('express');
const cors = require('cors');
const path = require('path');
const { searchPinterestAPI } = require('./pinterest');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/search?q=kucing&limit=30
app.get('/api/search', async (req, res) => {
  const { q, limit } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ success: false, error: 'Parameter "q" wajib diisi.' });
  }

  const parsedLimit = Math.min(parseInt(limit) || 25, 100);

  try {
    console.log(`[Search] query="${q}" limit=${parsedLimit}`);
    const images = await searchPinterestAPI(q.trim(), parsedLimit);
    res.json({ success: true, query: q, count: images.length, images });
  } catch (err) {
    console.error('[Search Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Pinterest Search berjalan di http://localhost:${PORT}`);
});

module.exports = app;
