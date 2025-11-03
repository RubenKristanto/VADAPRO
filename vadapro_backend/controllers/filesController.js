const mongoose = require('mongoose');

// Stream a GridFS file by id
exports.streamFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid file id' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    // Find the file document first to set headers
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const fileDoc = files[0];

    // Set content type and disposition
    const contentType = fileDoc.metadata?.contentType || 'application/octet-stream';
    const originalName = fileDoc.metadata?.originalname || fileDoc.filename || 'file';
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `attachment; filename="${originalName}"`);

    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(id));
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Error streaming file:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
