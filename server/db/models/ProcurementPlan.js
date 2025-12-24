const mongoose = require('mongoose');

const ProcurementPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  fiscalYear: { type: Number, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'archived'], default: 'draft' },
  items: [
    {
      name: String,
      category: String,
      estimatedCost: Number,
      procurementMethod: String,
      plannedDate: Date,
      notes: String
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProcurementPlan', ProcurementPlanSchema);