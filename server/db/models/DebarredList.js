// DebarredList.js
// Debarred firms tracking model

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const DebarredList = sequelize.define('DebarredList', {
  firm_name: { type: DataTypes.STRING, allowNull: false },
  reason: { type: DataTypes.TEXT },
  date_debarred: { type: DataTypes.DATE },
  expiry_date: { type: DataTypes.DATE }
});

module.exports = DebarredList;
