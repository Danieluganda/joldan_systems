// Bidder.js
// Supplier/contractor database model

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Bidder = sequelize.define('Bidder', {
  name: { type: DataTypes.STRING, allowNull: false },
  contact_email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  registration_number: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'active' }
});

module.exports = Bidder;
