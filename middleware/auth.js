const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found.' 
      });
    }

    req.user = user.toJSON(); // Convert to plain object and remove password
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin rights required.' 
    });
  }
};

// Check if user is staff or admin
const isStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Staff rights required.' 
    });
  }
};

// Optional auth - continues even if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return next();

    const token = authHeader.replace('Bearer ', '');
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(); // silently continue if token invalid/expired
    }

    if (!decoded || !decoded.userId) return next();

    // Sequelize version
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    if (user && user.isActive) {
      req.user = user; // attach sequelize instance
    }
    return next();
  } catch (error) {
    return next();
  }
};

module.exports = {
  auth,
  isAdmin,
  isStaff,
  optionalAuth
};