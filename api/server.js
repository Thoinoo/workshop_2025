require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Config
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());             // autorise le front en dev
app.use(express.json());     // parse JSON

// Routes API
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/hello', (req, res) => res.json({ message: 'Hello depuis Node 👋' }));

app.listen(PORT, () => {
  console.log(`API sur http://localhost:${PORT}`);
});
