const express = require('express');
const { Op } = require('sequelize');
const { Booking, Service, User } = require('../models');
const { auth, optionalAuth } = require('../middleware/auth');
const { sendSms } = require('../utils/twilio');
const { enqueue, scheduleReminder } = require('../utils/notificationQueue');
const { buildTemplate } = require('../utils/notificationTemplates');
const { validateBooking, validateBookingUpdate } = require('../middleware/validation');

const router = express.Router();

// Create new booking
router.post('/', optionalAuth, validateBooking, async (req, res) => {
  try {
    const { serviceId, startTime, customerInfo } = req.body;
    
    // Get service details
    const service = await Service.findByPk(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or not available'
      });
    }
    
    // Parse booking time
    const bookingStart = new Date(startTime);
    const totalDuration = service.preparationTime + service.duration + service.cleanupTime;
    const bookingEnd = new Date(bookingStart.getTime() + totalDuration * 60000);
    
    // Check for conflicts
    const hasConflict = await Booking.checkConflicts(serviceId, bookingStart, bookingEnd);
    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available. Please choose another time.'
      });
    }
    
    // Ensure we have a customerId: use logged-in user if present, otherwise
    // find or create a lightweight customer account based on email/phone
    let resolvedCustomerId = null;
    if (req.user && req.user.id) {
      resolvedCustomerId = req.user.id;
    } else {
      try {
        // Try find by email first
        let customer = null;
        if (customerInfo?.email) {
          customer = await User.findOne({ where: { email: customerInfo.email.toLowerCase() } });
        }
        // Fallback: try by phone if not found and phone present
        if (!customer && customerInfo?.phone) {
          customer = await User.findOne({ where: { phone: customerInfo.phone } });
        }
        // Create if still not found
        if (!customer) {
          const crypto = require('crypto');
          const tempPassword = crypto.randomBytes(12).toString('hex');
          customer = await User.create({
            name: customerInfo.name || 'Customer',
            email: (customerInfo.email || `guest_${Date.now()}@example.com`).toLowerCase(),
            password: tempPassword,
            phone: customerInfo.phone || null,
            role: 'customer',
            isActive: true
          });
        }
        resolvedCustomerId = customer.id;
      } catch (e) {
        console.warn('[Bookings] Unable to resolve/create customer user:', e.message);
      }
    }

    // Create booking
    const bookingData = {
      serviceId: serviceId,
      startTime: bookingStart,
      endTime: bookingEnd,
      customerInfo: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        notes: customerInfo.notes || ''
      },
      pricing: {
        basePrice: service.price,
        discount: 0,
        finalPrice: service.price
      },
      status: 'pending',
      paymentStatus: 'pending',
      bookingSource: 'website',
      customerId: resolvedCustomerId
    };

    
    const booking = await Booking.create(bookingData);
    
    // Fetch the booking with service details
    const bookingWithService = await Booking.findByPk(booking.id, {
      include: [
        { model: Service, as: 'service', attributes: ['name', 'duration', 'price', 'category'] }
      ]
    });

    // Notifications (queue based)
    const ownerSms = process.env.TWILIO_OWNER_PHONE_SMS;
    const customerPhone = customerInfo.phone;
    const context = {
      service: bookingWithService.service?.name || 'Service',
      customer: customerInfo.name,
      start: bookingStart,
    };
    enqueue({ type: 'booking_created_customer', channel: 'sms', to: customerPhone, context });
    enqueue({ type: 'booking_created_owner', channel: 'sms', to: ownerSms, context });
    // 24h reminder (if > 26h away to avoid immediate send)
    const hoursUntil = (bookingStart - Date.now())/3600000;
    if (hoursUntil > 26) {
      const reminderTime = new Date(bookingStart.getTime() - 24*3600000);
      scheduleReminder(reminderTime.getTime(), { type:'reminder_customer', channel:'sms', to: customerPhone, context:{ ...context, inHours:24 } });
      scheduleReminder(reminderTime.getTime(), { type:'reminder_owner', channel:'sms', to: ownerSms, context:{ ...context, inHours:24 } });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`booking-${serviceId}`).emit('booking-created', {
      serviceId,
      bookingId: booking.id,
      startTime: bookingStart,
      endTime: bookingEnd
    });
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: bookingWithService
      }
    });
    
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

// Get user's bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    let query = { customer: req.user._id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const bookings = await Booking.findAll({
      where: query,
      include: [
        { model: Service, as: 'service', attributes: ['name', 'duration', 'price', 'category'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    const total = await Booking.count({ where: query });
    
    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: bookings.length,
          totalBookings: total
        }
      }
    });
    
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Service, as: 'service', attributes: ['name', 'duration', 'price', 'category', 'description'] },
        { model: User, as: 'customer', attributes: ['name', 'email', 'phone'] }
      ]
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        booking
      }
    });
    
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
});

// Update booking
router.put('/:id', auth, validateBookingUpdate, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user can modify this booking
    if (req.user.role !== 'admin' && booking.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own bookings'
      });
    }
    
    // If updating time, check for conflicts
    if (req.body.startTime) {
      const newStartTime = new Date(req.body.startTime);
      const service = await Service.findByPk(booking.serviceId);
      const totalDuration = service.preparationTime + service.duration + service.cleanupTime;
      const newEndTime = new Date(newStartTime.getTime() + totalDuration * 60000);
      
      const hasConflict = await Booking.checkConflicts(
        booking.serviceId,
        newStartTime,
        newEndTime,
        booking.id
      );
      
      if (hasConflict) {
        return res.status(409).json({
          success: false,
          message: 'The new time slot is not available'
        });
      }
    }
    
    // Update booking
    const updates = {};
    
    if (req.body.startTime) {
      updates.startTime = new Date(req.body.startTime);
    }
    if (req.body.customerInfo) {
      updates.customerName = req.body.customerInfo.name;
      updates.customerEmail = req.body.customerInfo.email;
      updates.customerPhone = req.body.customerInfo.phone;
      updates.specialRequests = req.body.customerInfo.notes || '';
    }
    if (req.body.status && req.user.role === 'admin') {
      updates.status = req.body.status;
    }
    
    await booking.update(updates);

    // Update notification
    if (updates.startTime || updates.status) {
      const svc = await Service.findByPk(booking.serviceId);
      const context = { service: svc?.name || 'Service', customer: booking.customerName || booking.customerInfo?.name, start: booking.startTime };
      if (updates.status === 'cancelled') {
        enqueue({ type:'booking_cancelled_customer', channel:'sms', to: booking.customerPhone, context });
        enqueue({ type:'booking_cancelled_owner', channel:'sms', to: process.env.TWILIO_OWNER_PHONE_SMS, context });
      } else if (updates.startTime) {
        enqueue({ type:'booking_updated_customer', channel:'sms', to: booking.customerPhone, context });
      }
    }
    
    const updatedBooking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Service, as: 'service', attributes: ['name', 'duration', 'price', 'category'] }
      ]
    });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`booking-${booking.service}`).emit('booking-updated', {
      bookingId: booking._id,
      updates
    });
    
    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        booking: updatedBooking
      }
    });
    
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message
    });
  }
});

// Cancel booking
router.delete('/:id', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user can cancel this booking
    if (req.user.role !== 'admin' && booking.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings'
      });
    }
    
    // Check if booking can be cancelled
    if (!booking.canBeCancelled() && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled. Cancellation must be done at least 24 hours in advance.'
      });
    }
    
    // Update booking status
    await booking.update({
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by customer',
      cancelledAt: new Date(),
      cancelledBy: req.user.id
    });

    const svc = await Service.findByPk(booking.serviceId);
    const context = { service: svc?.name || 'Service', customer: booking.customerName || booking.customerInfo?.name, start: booking.startTime };
    enqueue({ type:'booking_cancelled_customer', channel:'sms', to: booking.customerPhone, context });
    enqueue({ type:'booking_cancelled_owner', channel:'sms', to: process.env.TWILIO_OWNER_PHONE_SMS, context });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`booking-${booking.serviceId}`).emit('booking-cancelled', {
      bookingId: booking.id,
      serviceId: booking.service
    });
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
    
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

// Add feedback to completed booking
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    const booking = await Booking.findByPk(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user can add feedback
    if (booking.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only provide feedback for your own bookings'
      });
    }
    
    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be provided for completed bookings'
      });
    }
    
    // Check if feedback already exists
    if (booking.feedback.rating) {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been provided for this booking'
      });
    }
    
    // Add feedback
    await booking.update({
      feedbackRating: rating,
      feedbackComment: comment || '',
      feedbackSubmittedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedback: booking.feedback
      }
    });
    
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

// Get booking statistics for a service
router.get('/stats/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        startTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    const stats = await Booking.aggregate([
      {
        $match: {
          service: mongoose.Types.ObjectId(serviceId),
          ...dateQuery
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.finalPrice' }
        }
      }
    ]);
    
    const totalBookings = await Booking.countDocuments({
      service: serviceId,
      ...dateQuery
    });
    
    res.json({
      success: true,
      data: {
        serviceId,
        totalBookings,
        stats
      }
    });
    
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics',
      error: error.message
    });
  }
});

module.exports = router;