require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/org');
const programRoutes = require('./routes/programs');
const membershipRoutes = require('./routes/membership');
const workYearRoutes = require('./routes/workyears');
const mongoose = require('mongoose');

const fileRoutes = require('./routes/files');
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB first
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/auth', authRoutes); // Authentication routes
app.use('/org', orgRoutes);   // Organization routes
app.use('/programs', programRoutes); // Program routes
app.use('/membership', membershipRoutes); // Membership routes
app.use('/files', fileRoutes); // GridFS file streaming
app.use('/workyears', workYearRoutes); // WorkYear routes

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});