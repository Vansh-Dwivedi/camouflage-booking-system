// Legacy Sequelize models - No longer used with JSON Database
// Keeping for backwards compatibility and reference

// Note: This application now uses JSON file storage instead of Sequelize/SQLite
// The JSON database is managed in config/jsonDatabase.js
// All data operations are handled through the JSON database methods

console.log('⚠️ Sequelize models loaded for compatibility - Using JSON Database instead');

// Placeholder exports for legacy code that might still reference these
module.exports = {
  User: null, // Use jsonDatabase.findUserById(), etc.
  Service: null, // Use jsonDatabase.findAllServices(), etc.  
  Booking: null, // Use jsonDatabase.findAllBookings(), etc.
  Setting: null, // Use jsonDatabase.findAllSettings(), etc.
  
  // Helper message
  _message: 'This app now uses JSON Database. See config/jsonDatabase.js'
};