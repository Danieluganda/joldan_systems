// Shortlist.js
// Pre-qualification shortlist model

const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Shortlist = sequelize.define('Shortlist', {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  bidder_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }
});

module.exports = Shortlist;
