// summary-proxy.js (พอร์ต 8000)
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());

// Proxy ไปยัง API หลัก (5000)
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// GET /summary/:workoutType/:userId  --> ไปดึง /api/__summary_internal/:workoutType/:userId
app.get('/summary/:workoutType/:userId', async (req, res) => {
  try {
    const { workoutType, userId } = req.params;
    const r = await fetch(`${API_BASE}/api/__summary_internal/${workoutType}/${userId}`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Proxy failed' });
  }
});

const port = 8000;
app.listen(port, () => console.log('Summary proxy on', port));
