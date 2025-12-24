const ImplementationRoadmap = require('../db/models/ImplementationRoadmap');
const { logActivity } = require('./activityLogService');

async function createRoadmap(roadmapData, userId) {
  const roadmap = new ImplementationRoadmap({ ...roadmapData, owner: userId });
  await roadmap.save();
  await logActivity({
    user: userId,
    action: 'create',
    entityType: 'ImplementationRoadmap',
    entityId: roadmap._id,
    details: { title: roadmap.title },
  });
  return roadmap;
}

async function updateRoadmap(roadmapId, updates, userId) {
  const roadmap = await ImplementationRoadmap.findByIdAndUpdate(roadmapId, { ...updates, updatedAt: new Date() }, { new: true });
  await logActivity({
    user: userId,
    action: 'update',
    entityType: 'ImplementationRoadmap',
    entityId: roadmapId,
    details: updates,
  });
  return roadmap;
}

async function getRoadmaps(filter = {}, options = {}) {
  return ImplementationRoadmap.find(filter)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .lean();
}

module.exports = {
  createRoadmap,
  updateRoadmap,
  getRoadmaps,
};
