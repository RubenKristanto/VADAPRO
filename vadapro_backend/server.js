require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    database: {
      status: statusMap[dbStatus] || 'unknown',
      readyState: dbStatus,
      connected: dbStatus === 1,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown'
    },
    server: {
      status: 'running',
      port: PORT || process.env.PORT || 3001
    }
  };

  const httpStatus = dbStatus === 1 ? 200 : 503;
  res.status(httpStatus).json(healthCheck);
});

app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3001;

// MongoDB connection with updated options for Mongoose 8.x
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      // Removed deprecated options: bufferMaxEntries and bufferCommands
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Full error:', err);
    return false;
  }
}

// Start server only after successful database connection
async function startServer() {
  const dbConnected = await connectToDatabase();
  
  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Server will not start.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`✅ Health check available at http://localhost:${PORT}/health`);
  });
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️ Received SIGINT. Graceful shutdown...');
  await mongoose.connection.close();
  console.log('📤 Database connection closed.');
  process.exit(0);
});

// Start the server
startServer();