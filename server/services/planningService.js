const ProcurementPlan = require('../db/models/ProcurementPlan');
const { logActivity } = require('./activityLogService');

async function createPlan(planData, userId) {
  const plan = new ProcurementPlan({ ...planData, owner: userId });
  await plan.save();
  await logActivity({
    user: userId,
    action: 'create',
    entityType: 'ProcurementPlan',
    entityId: plan._id,
    details: { title: plan.title, fiscalYear: plan.fiscalYear },
  });
  return plan;
}

async function updatePlan(planId, updates, userId) {
  const plan = await ProcurementPlan.findByIdAndUpdate(planId, { ...updates, updatedAt: new Date() }, { new: true });
  await logActivity({
    user: userId,
    action: 'update',
    entityType: 'ProcurementPlan',
    entityId: planId,
    details: updates,
  });
  return plan;
}

async function getPlans(filter = {}, options = {}) {
  return ProcurementPlan.find(filter)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .lean();
}

module.exports = {
  createPlan,
  updatePlan,
  getPlans,
};
