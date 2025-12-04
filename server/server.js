// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mpesaRoutes = require('./routes/mpesaRoutes'); // ← Add this

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '✅ BrandAmbassador Backend is LIVE!' });
});

// M-Pesa routes
app.use('/api/mpesa', mpesaRoutes); // ← Register M-Pesa routes

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});