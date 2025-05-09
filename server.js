// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const videoRoutes = require('./BE/routes/videoRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ghostdystube', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB conectado');
}).catch((err) => {
  console.error('❌ Erro ao conectar no MongoDB:', err);
});

// Test route
app.get('/', (req, res) => {
  res.send('GhostDystube API rodando!');
});
// vídeo...
app.use('/api/videos', videoRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
