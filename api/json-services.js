const express = require('express');
const router = express.Router();

// Get all active services
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { category, search, sortBy = 'name', order = 'asc' } = req.query;
    
    let where = { isActive: true };
    
    // Filter by category
    if (category && category !== 'all') {
      where.category = category;
    }
    
    const services = await db.findAllServices(where);
    
    // Apply search filter
    let filteredServices = services;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredServices = services.filter(service => 
        service.name.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    filteredServices.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      
      if (order.toLowerCase() === 'desc') {
        return bValue.toString().localeCompare(aValue.toString());
      }
      return aValue.toString().localeCompare(bValue.toString());
    });
    
    res.json({
      success: true,
      data: {
        services: filteredServices,
        count: filteredServices.length
      }
    });
    
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading services',
      error: error.message
    });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const service = await db.findServiceById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      data: { service }
    });
    
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading service',
      error: error.message
    });
  }
});

// Get service categories
router.get('/categories/list', async (req, res) => {
  try {
    const db = req.app.get('db');
    const services = await db.findAllServices({ isActive: true });
    
    const categories = [...new Set(services.map(service => service.category))];
    
    res.json({
      success: true,
      data: { categories }
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading categories',
      error: error.message
    });
  }
});

module.exports = router;