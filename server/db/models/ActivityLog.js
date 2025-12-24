const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. 'create', 'update', 'approve', 'document_upload', etc.
  entityType: { type: String, required: true }, // e.g. 'Procurement', 'Document', 'Approval', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId, required: false },
  details: { type: Object }, // Additional info (fields changed, document name, etc.)
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);