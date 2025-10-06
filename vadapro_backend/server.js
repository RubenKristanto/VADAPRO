require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());
<<<<<<< HEAD
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3001;

// Simple MongoDB connection check
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected successfully');
    
    // Start server after successful connection
    app.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Atlas connection failed:', err.message);
    process.exit(1);
  });
=======

app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
>>>>>>> parent of 06ebb03 (fail commit)
