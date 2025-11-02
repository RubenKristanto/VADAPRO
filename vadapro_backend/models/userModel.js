const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3 },
  password: { type: String, required: true, minlength: 3 },
  organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }]
});

module.exports = mongoose.model('User', userSchema, 'accounts'); // Explicitly specify collection name 'accounts'