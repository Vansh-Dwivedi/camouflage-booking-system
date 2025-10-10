const express = require('express');
const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/database');
const { Service, Booking } = require('../models');
const { auth, isAdmin } = require('../middleware/auth');
const { validateService } = require('../middleware/validation');

const router = express.Router();

// Get all active services
router.get('/', async (req, res) => {
  try {
    const { category, search, sortBy = 'name', order = 'asc' } = req.query;
    
    let where = { isActive: true };
    
    // Filter by category
    if (category && category !== 'all') {
      where.category = category;
    }
    
    // Search functionality
    if (search) {
      // SQLite doesn't support iLike; use like
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Sort options
    const orderArray = [[sortBy, order.toUpperCase()]];
    
    const services = await Service.findAll({
      where,
      order: orderArray
    });
    
    res.json({
      success: true,
      data: {
        services,
        count: services.length
      }
    });
    
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
});

// Get service categories (place this before dynamic :id routes)
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Service.findAll({
      attributes: [[fn('DISTINCT', col('category')), 'category']],
      where: { isActive: true },
      raw: true
    });
    res.json({
      success: true,
      data: {
        categories: categories.map(item => ({
          value: item.category,
          label: item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : 'Uncategorized'
        }))
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    if (!service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service is not available'
      });
    }
    
    res.json({
      success: true,
      data: {
        service
      }
    });
    
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message
    });
  }
});

// Get service availability for a specific date
router.get('/:id/availability/:date', async (req, res) => {
  try {
    const { id, date } = req.params;
    
    const service = await Service.findByPk(id);
    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or not available'
      });
    }
    
    // Parse the date (expecting YYYY-MM-DD format)
    const requestedDate = new Date(date + 'T00:00:00');
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book appointments in the past'
      });
    }
    
    // Get existing bookings for this service on this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingBookings = await Booking.findAll({
      where: {
        serviceId: id,
        startTime: {
          [Op.between]: [startOfDay, endOfDay]
        },
        status: {
          [Op.in]: ['pending', 'confirmed', 'in-progress']
        }
      }
    });
    
    // Get available slots
    const availableSlots = service.getAvailableSlots(requestedDate, existingBookings);
    
    res.json({
      success: true,
      data: {
        date: requestedDate.toDateString(),
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          totalDuration: (service.preparationTime || 0) + (service.duration || 0) + (service.cleanupTime || 0)
        },
        availableSlots,
        bookedSlots: existingBookings.length
      }
    });
    
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability',
      error: error.message
    });
  }
});

// (moved categories route above)

// Admin routes
// Create new service
router.post('/', auth, isAdmin, validateService, async (req, res) => {
  try {
    const service = await Service.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: {
        service
      }
    });
    
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: error.message
    });
  }
});

// Update service
router.put('/:id', auth, isAdmin, validateService, async (req, res) => {
  try {
    const [updatedRows] = await Service.update(req.body, {
      where: { id: req.params.id },
      returning: true
    });
    
    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const service = await Service.findByPk(req.params.id);
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      data: {
        service
      }
    });
    
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message
    });
  }
});

// Delete service (soft delete)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const [updatedRows] = await Service.update(
      { isActive: false },
      { where: { id: req.params.id } }
    );
    
    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const service = await Service.findByPk(req.params.id);
    
    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: error.message
    });
  }
});

// Get all services (including inactive) - Admin only
router.get('/admin/all', auth, isAdmin, async (req, res) => {
  try {
    const services = await Service.findAll({ 
      order: [['createdAt', 'DESC']] 
    });
    
    res.json({
      success: true,
      data: {
        services,
        count: services.length
      }
    });
    
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
});

module.exports = router;