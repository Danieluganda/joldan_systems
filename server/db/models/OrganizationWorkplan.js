// OrganizationWorkplan.js
// Annual workplan model

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const OrganizationWorkplan = sequelize.define('OrganizationWorkplan', {
  year: { type: DataTypes.INTEGER, allowNull: false },
  department: { type: DataTypes.STRING, allowNull: false },
  objectives: { type: DataTypes.TEXT },
  budget: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING, defaultValue: 'draft' }
});

module.exports = OrganizationWorkplan;
