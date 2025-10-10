const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Service validation
const validateService = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('category')
    .isIn(['makeup', 'skincare', 'eyebrows', 'lashes', 'hair', 'nails', 'other'])
    .withMessage('Invalid service category'),
  
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('preparationTime')
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage('Preparation time must be between 0 and 60 minutes'),
  
  body('cleanupTime')
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage('Cleanup time must be between 0 and 60 minutes'),
  
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('serviceId')
    .isInt({ min: 1 })
    .withMessage('Invalid service ID'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Invalid start time format')
    .custom((value) => {
      const bookingTime = new Date(value);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      if (bookingTime < minBookingTime) {
        throw new Error('Booking must be at least 2 hours in advance');
      }
      
      const maxBookingTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      if (bookingTime > maxBookingTime) {
        throw new Error('Booking cannot be more than 30 days in advance');
      }
      
      return true;
    }),
  
  body('customerInfo.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters'),
  
  body('customerInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('customerInfo.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('customerInfo.notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Update booking validation
const validateBookingUpdate = [
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid start time format')
    .custom((value) => {
      if (value) {
        const bookingTime = new Date(value);
        const now = new Date();
        const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        
        if (bookingTime < minBookingTime) {
          throw new Error('Booking must be at least 2 hours in advance');
        }
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show'])
    .withMessage('Invalid booking status'),
  
  body('customerInfo.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters'),
  
  body('customerInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('customerInfo.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateService,
  validateBooking,
  validateBookingUpdate,
  handleValidationErrors
};