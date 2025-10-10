const { Sequelize } = require('sequelize');
const path = require('path');

// Alternative database configuration with better-sqlite3 fallback
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

let sequelize;
let dialectModule = 'sqlite3';

async function createSequelizeInstance() {
  try {
    // First try with regular sqlite3
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: isVercel ? ':memory:' : path.join(__dirname, '..', 'database.sqlite'),
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        busy_timeout: 30000,
      },
      define: {
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      },
      pool: {
        max: 1,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });

    // Test the connection
    await sequelize.authenticate();
    console.log('✅ SQLite3 connection successful');
    return sequelize;
    
  } catch (error) {
    console.log('⚠️ SQLite3 failed, trying better-sqlite3:', error.message);
    
    try {
      // Fallback to better-sqlite3
      const Database = require('better-sqlite3');
      
      // Create a minimal Sequelize-compatible wrapper for better-sqlite3
      const dbPath = isVercel ? ':memory:' : path.join(__dirname, '..', 'database-alt.sqlite');
      const db = new Database(dbPath);
      
      // Return a minimal interface compatible with our app
      return {
        authenticate: async () => Promise.resolve(),
        sync: async () => {
          // Create tables if they don't exist
          db.exec(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              name TEXT NOT NULL,
              phone TEXT,
              role TEXT DEFAULT 'customer',
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS services (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              description TEXT,
              duration INTEGER NOT NULL,
              price DECIMAL(10,2) NOT NULL,
              category TEXT NOT NULL,
              isActive BOOLEAN DEFAULT 1,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS bookings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              userId INTEGER,
              serviceId INTEGER NOT NULL,
              customerName TEXT NOT NULL,
              customerEmail TEXT NOT NULL,
              customerPhone TEXT NOT NULL,
              appointmentDate DATE NOT NULL,
              appointmentTime TIME NOT NULL,
              status TEXT DEFAULT 'pending',
              notes TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              key TEXT UNIQUE NOT NULL,
              value TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);
          
          return Promise.resolve();
        },
        query: (sql, options = {}) => {
          try {
            if (sql.includes('SELECT')) {
              return db.prepare(sql).all();
            } else {
              return db.prepare(sql).run();
            }
          } catch (error) {
            console.error('Better-sqlite3 query error:', error);
            throw error;
          }
        },
        close: () => db.close(),
        isBetterSqlite: true
      };
      
    } catch (betterSqliteError) {
      console.error('❌ Better-sqlite3 also failed:', betterSqliteError.message);
      throw new Error('No SQLite implementation available');
    }
  }
}

// Test database connection
const testConnection = async () => {
  try {
    if (!sequelize) {
      sequelize = await createSequelizeInstance();
    }
    
    if (sequelize.isBetterSqlite) {
      console.log('✅ Better-sqlite3 database connection established successfully.');
    } else {
      await sequelize.authenticate();
      console.log('✅ SQLite database connection established successfully.');
    }
  } catch (error) {
    console.error('❌ Unable to connect to any SQLite database:', error.message);
    throw error;
  }
};

module.exports = { 
  get sequelize() {
    return sequelize;
  },
  testConnection,
  createSequelizeInstance
};