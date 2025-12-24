// workplanService.js
// Annual workplan management
const OrganizationWorkplan = require('../db/models/OrganizationWorkplan');

module.exports = {
  async createWorkplan(data) {
    return OrganizationWorkplan.create(data);
  },
  async getWorkplans() {
    return OrganizationWorkplan.findAll();
  },
  async updateWorkplan(id, data) {
    return OrganizationWorkplan.update(data, { where: { id } });
  }
};
