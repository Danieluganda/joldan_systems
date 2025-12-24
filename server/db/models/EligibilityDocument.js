// EligibilityDocument.js
// Trading license, tax clearance, etc.

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const EligibilityDocument = sequelize.define('EligibilityDocument', {
  bidder_id: { type: DataTypes.INTEGER, allowNull: false },
  document_type: { type: DataTypes.STRING, allowNull: false },
  document_url: { type: DataTypes.STRING },
  expiry_date: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING, defaultValue: 'valid' }
});

module.exports = EligibilityDocument;
