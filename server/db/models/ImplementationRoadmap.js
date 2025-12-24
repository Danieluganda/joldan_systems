const mongoose = require('mongoose');

const ImplementationRoadmapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  milestones: [
    {
      name: String,
      targetDate: Date,
      status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
      notes: String
    }
  ],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImplementationRoadmap', ImplementationRoadmapSchema);