const express = require('express');
const router = express.Router();

// Fallback services route for when SQLite is not available
router.get('/', async (req, res) => {
  try {
    const app = req.app;
    const useFallback = app.get('useFallback');
    
    if (useFallback) {
      const fallbackDB = app.get('fallbackDB');
      const services = await fallbackDB.findAllServices({ isActive: true });
      
      return res.json({
        success: true,
        data: {
          services,
          count: services.length
        }
      });
    }
    
    // If not using fallback, this shouldn't be reached, but just in case
    return res.status(500).json({
      success: false,
      message: 'Database not properly initialized'
    });
    
  } catch (error) {
    console.error('Fallback services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading services',
      error: error.message
    });
  }
});

module.exports = router;