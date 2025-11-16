const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  url: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const entrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  sourceFile: { type: String },
  responseCount: { type: Number, default: 0 },
  file: fileMetaSchema,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const workYearSchema = new mongoose.Schema({
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  year: { type: Number, required: true },
  entries: [entrySchema],
  createdAt: { type: Date, default: Date.now }
});

// unique per program + year
workYearSchema.index({ program: 1, year: 1 }, { unique: true });

workYearSchema.pre('findOneAndDelete', async function() {
  const Process = mongoose.model('Process');
  await Process.deleteMany({ workYear: this.getQuery()._id });
});

module.exports = mongoose.model('WorkYear', workYearSchema, 'workyears');
