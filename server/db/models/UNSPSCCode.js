// UNSPSCCode.js
// UN Standard Product codes model

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const UNSPSCCode = sequelize.define('UNSPSCCode', {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING },
  parent_code: { type: DataTypes.STRING }
});

module.exports = UNSPSCCode;
