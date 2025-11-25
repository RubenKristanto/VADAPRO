import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import Routes
import authRoutes from './routes/auth.js';
import orgRoutes from './routes/org.js';
import programRoutes from './routes/programs.js';
import membershipRoutes from './routes/membership.js';
import processRoutes from './routes/process.js';
import workYearRoutes from './routes/workyears.js';
import fileRoutes from './routes/file.js';
import aiRoutes from './routes/ai.js';

// Setup file paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize App
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes); 
app.use('/org', orgRoutes); 
app.use('/programs', programRoutes); 
app.use('/membership', membershipRoutes); 
app.use('/process', processRoutes); 
app.use('/workyears', workYearRoutes); 
app.use('/file', fileRoutes); 
app.use('/ai', aiRoutes); 

// Serve uploaded files (Note: In Vercel, uploaded files are ephemeral and vanish. 
// You should use S3/Cloudinary for file storage, but this line won't crash the app).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route for testing
app.get('/', (req, res) => {
  res.send('VADAPRO API is running on Vercel!');
});

// Database Connection (Optimized for Serverless)
// We check if we are already connected to avoid "cold start" delays
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI); // Make sure your Vercel Env Var is named 'MONGO_URI'
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }
};

// Initialize DB connection
connectDB();

// !!! IMPORTANT FOR VERCEL !!!
// Do NOT use app.listen(). Instead, export the app.
export default app;
