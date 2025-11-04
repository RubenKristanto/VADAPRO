const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  url: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const workYearSchema = new mongoose.Schema({
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  year: { type: Number, required: true },
  // Entries represent uploaded data entries (CSV uploads or manually created entries)
  entries: [{
    name: { type: String, required: true },
    sourceFile: { type: String },
    responseCount: { type: Number, default: 0 },
    file: fileMetaSchema,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// unique per program + year
workYearSchema.index({ program: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('WorkYear', workYearSchema, 'workyears');
