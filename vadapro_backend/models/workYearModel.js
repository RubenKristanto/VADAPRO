const mongoose = require('mongoose');

const workYearSchema = new mongoose.Schema({
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  year: { type: Number, required: true },
  notes: { type: String, trim: true },
  datasheets: [
    {
      filename: String,
      originalname: String,
      url: String,
      gridFsId: String,
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  images: [
    {
      filename: String,
      originalname: String,
      url: String,
      gridFsId: String,
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

// Ensure a program can only have one workYear for the same year
workYearSchema.index({ program: 1, year: 1 }, { unique: true });

workYearSchema.set('toJSON', { virtuals: true });
workYearSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkYear', workYearSchema, 'workyears');
