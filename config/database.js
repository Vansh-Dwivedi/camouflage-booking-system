// JSON Database Configuration
const jsonDb = require('./jsonDatabase');

// Initialize JSON database
const initializeDatabase = async () => {
  try {
    await jsonDb.initialize();
    console.log('✅ JSON database initialized successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to initialize JSON database:', error.message);
    return false;
  }
};

// Test database connection (compatibility function)
const testConnection = async () => {
  return await initializeDatabase();
};

module.exports = { 
  db: jsonDb,
  testConnection,
  initializeDatabase
};