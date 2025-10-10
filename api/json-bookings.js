const express = require('express');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid access token'
    });
  }
};

// Get available time slots for a service on a specific date
router.get('/available-slots/:serviceId/:date', async (req, res) => {
  try {
    const { serviceId, date } = req.params;
    const db = req.app.get('db');
    
    // Get service details
    const service = await db.findServiceById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Get existing bookings for the date
    const existingBookings = await db.findAllBookings({
      serviceId,
      // Note: In a more complex system, you'd filter by date here
    });
    
    // Filter bookings for the specific date
    const dateBookings = existingBookings.filter(booking => {
      const bookingDate = moment(booking.appointmentDate).format('YYYY-MM-DD');
      return bookingDate === date && booking.status !== 'cancelled';
    });
    
    // Generate available time slots (9 AM to 6 PM, every 30 minutes)
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDateTime = moment(`${date} ${timeString}`);
        
        // Check if slot is already booked
        const isBooked = dateBookings.some(booking => {
          const bookingTime = moment(booking.appointmentDate);
          const bookingEndTime = moment(booking.appointmentDate).add(booking.duration || service.duration, 'minutes');
          return slotDateTime.isBetween(bookingTime, bookingEndTime, null, '[)');
        });
        
        if (!isBooked && slotDateTime.isAfter(moment())) {
          slots.push({
            time: timeString,
            available: true
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: { slots }
    });
    
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading available slots',
      error: error.message
    });
  }
});

// Create a new booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { serviceId, appointmentDate, notes } = req.body;
    const db = req.app.get('db');
    
    if (!serviceId || !appointmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and appointment date are required'
      });
    }
    
    // Get service details
    const service = await db.findServiceById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Get user details
    const user = await db.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create booking
    const newBooking = await db.createBooking({
      userId: req.user.userId,
      serviceId: parseInt(serviceId),
      appointmentDate: new Date(appointmentDate).toISOString(),
      duration: service.duration,
      price: service.price,
      status: 'pending',
      notes: notes || '',
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone,
      serviceName: service.name
    });
    
    res.status(201).json({
      success: true,
      data: { booking: newBooking },
      message: 'Booking created successfully'
    });
    
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
});

// Get user's bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const bookings = await db.findAllBookings({ userId: req.user.userId });
    
    // Sort by appointment date
    bookings.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    
    res.json({
      success: true,
      data: { bookings }
    });
    
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading bookings',
      error: error.message
    });
  }
});

// Cancel booking
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const booking = await db.findBookingById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user owns the booking or is admin
    if (booking.userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }
    
    const updatedBooking = await db.updateBooking(req.params.id, {
      status: 'cancelled'
    });
    
    res.json({
      success: true,
      data: { booking: updatedBooking },
      message: 'Booking cancelled successfully'
    });
    
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
});

module.exports = router;