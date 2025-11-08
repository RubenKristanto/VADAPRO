require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/org');
const programRoutes = require('./routes/programs');
const membershipRoutes = require('./routes/membership');
const processRoutes = require('./routes/process');
const workYearRoutes = require('./routes/workyears');
const fileRoutes = require('./routes/file');
const path = require('path');
const mongoose = require('mongoose');

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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));