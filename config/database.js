const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize with SQLite
// For Vercel deployment, use in-memory database for serverless functions
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

let sequelize;

try {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: isVercel ? ':memory:' : path.join(__dirname, '..', 'database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      // Add options to handle SQLite3 in serverless environment
      busy_timeout: 30000,
    },
    define: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    pool: {
      max: 1, // Reduce pool size for serverless
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} catch (error) {
  console.error('Initial Sequelize setup failed:', error);
  // Fallback: try without dialectOptions
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:', // Force in-memory for problematic environments
    logging: false,
    define: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  });
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to SQLite database:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };