import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import orgRoutes from './routes/org.js';
import programRoutes from './routes/programs.js';
import membershipRoutes from './routes/membership.js';
import processRoutes from './routes/process.js';
import workYearRoutes from './routes/workyears.js';
import fileRoutes from './routes/file.js';
import aiRoutes from './routes/ai.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes); // Authentication routes
app.use('/org', orgRoutes);   // Organization routes
app.use('/programs', programRoutes); // Program routes
app.use('/membership', membershipRoutes); // Membership routes
app.use('/process', processRoutes); // Process routes
app.use('/workyears', workYearRoutes); // WorkYear routes
app.use('/file', fileRoutes); // File upload routes
app.use('/ai', aiRoutes); // AI analysis routes

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));