// utils/waitlistManager.js - Smart Waitlist & Queue System
const { Waitlist, Booking, Service, User } = require('../models');
const { Op } = require('sequelize');
const { sendSMS } = require('./twilio');
const nodemailer = require('nodemailer');

class WaitlistManager {
  /**
   * Add customer to waitlist
   */
  static async addToWaitlist(customerId, serviceId, preferences = {}) {
    try {
      // Check if already on waitlist
      const existing = await Waitlist.findOne({
        where: { customerId, serviceId, status: 'active' }
      });

      if (existing) {
        return {
          success: false,
          message: 'Customer already on waitlist for this service'
        };
      }

      // Get current position
      const position = await Waitlist.count({
        where: { serviceId, status: 'active' }
      });

      // Set expiration to 30 days from now
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const waitlistEntry = await Waitlist.create({
        customerId,
        serviceId,
        preferredDates: preferences.preferredDates || [],
        preferredTimes: preferences.preferredTimes || [],
        notificationMethod: preferences.notificationMethod || 'both',
        position: position + 1,
        expirationDate,
        autoBooking: preferences.autoBooking !== false
      });

      console.log(`✅ Customer ${customerId} added to waitlist for service ${serviceId}, position: ${position + 1}`);

      return {
        success: true,
        message: `Added to waitlist. Position: ${position + 1}`,
        data: waitlistEntry
      };
    } catch (error) {
      console.error('Waitlist error:', error);
      return {
        success: false,
        message: 'Failed to add to waitlist',
        error: error.message
      };
    }
  }

  /**
   * Try to auto-fill waitlist when a booking is cancelled
   */
  static async handleAvailableSlot(serviceId, date, time) {
    try {
      // Get first customer on waitlist
      const customer = await Waitlist.findOne({
        where: {
          serviceId,
          status: 'active',
          autoBooking: true
        },
        order: [['position', 'ASC']],
        include: [{ model: User }]
      });

      if (!customer) {
        console.log(`No waitlist customers for service ${serviceId}`);
        return null;
      }

      // Check if slot matches preferences
      if (customer.preferredDates.length > 0) {
        const dateStr = new Date(date).toISOString().split('T')[0];
        if (!customer.preferredDates.includes(dateStr)) {
          // Skip this customer, move to next
          return await this.handleAvailableSlot(serviceId, date, time);
        }
      }

      if (customer.preferredTimes.length > 0) {
        if (!customer.preferredTimes.includes(time)) {
          return await this.handleAvailableSlot(serviceId, date, time);
        }
      }

      // Auto-book the customer
      const service = await Service.findByPk(serviceId);
      const bookingDate = new Date(date);
      const [hours, minutes] = time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const booking = await Booking.create({
        customerId: customer.customerId,
        serviceId,
        startTime: bookingDate,
        duration: service.duration,
        status: 'confirmed',
        totalPrice: service.price,
        notes: 'Auto-booked from waitlist'
      });

      // Update waitlist status
      await Waitlist.update(
        { status: 'filled' },
        { where: { id: customer.id } }
      );

      // Notify customer
      await this.notifyCustomer(customer, 'booked', booking);

      // Update positions for remaining waitlist
      await this.updateWaitlistPositions(serviceId);

      console.log(`✅ Waitlist customer ${customer.customerId} auto-booked for service ${serviceId}`);

      return booking;
    } catch (error) {
      console.error('Waitlist fulfillment error:', error);
      return null;
    }
  }

  /**
   * Update positions in waitlist
   */
  static async updateWaitlistPositions(serviceId) {
    try {
      const activeWaitlist = await Waitlist.findAll({
        where: { serviceId, status: 'active' },
        order: [['dateAdded', 'ASC']]
      });

      for (let i = 0; i < activeWaitlist.length; i++) {
        await activeWaitlist[i].update({ position: i + 1 });
      }
    } catch (error) {
      console.error('Position update error:', error);
    }
  }

  /**
   * Notify customer about waitlist or booking
   */
  static async notifyCustomer(waitlistEntry, type, booking = null) {
    try {
      const user = await User.findByPk(waitlistEntry.customerId);
      if (!user) return;

      let subject = '';
      let message = '';

      if (type === 'booked') {
        subject = '🎉 Great news! Your spot is booked!';
        const date = new Date(booking.startTime).toLocaleDateString();
        const time = new Date(booking.startTime).toLocaleTimeString();
        message = `Your waitlist spot has been booked!\n\nDate: ${date}\nTime: ${time}`;
      } else if (type === 'expired') {
        subject = '⏰ Your waitlist entry has expired';
        message = 'Your waitlist entry has expired. Please add yourself again if interested.';
      }

      // Send notification
      if (waitlistEntry.notificationMethod === 'email' || waitlistEntry.notificationMethod === 'both') {
        await this.sendEmail(user.email, subject, message);
      }

      if (waitlistEntry.notificationMethod === 'sms' || waitlistEntry.notificationMethod === 'both') {
        if (user.phone) {
          await sendSMS(user.phone, message);
        }
      }

      console.log(`📧 Customer ${user.email} notified about ${type}`);
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  /**
   * Send email notification
   */
  static async sendEmail(email, subject, message) {
    try {
      // In production, configure real email service
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'noreply@camouflage.com',
          pass: process.env.EMAIL_PASSWORD || 'password'
        }
      });

      await transporter.sendMail({
        from: 'noreply@camouflage.com',
        to: email,
        subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`
      });

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  /**
   * Get waitlist for a service
   */
  static async getWaitlist(serviceId) {
    try {
      const waitlist = await Waitlist.findAll({
        where: { serviceId, status: 'active' },
        include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }],
        order: [['position', 'ASC']]
      });

      return waitlist;
    } catch (error) {
      console.error('Get waitlist error:', error);
      return [];
    }
  }

  /**
   * Clean up expired waitlist entries
   */
  static async cleanupExpired() {
    try {
      const now = new Date();
      const result = await Waitlist.update(
        { status: 'expired' },
        {
          where: {
            expirationDate: { [Op.lt]: now },
            status: 'active'
          }
        }
      );

      console.log(`🧹 Cleaned up ${result[0]} expired waitlist entries`);
      return result[0];
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get waitlist position for customer
   */
  static async getCustomerPosition(customerId, serviceId) {
    try {
      const entry = await Waitlist.findOne({
        where: { customerId, serviceId, status: 'active' }
      });

      if (!entry) {
        return {
          onWaitlist: false,
          message: 'Not on waitlist'
        };
      }

      return {
        onWaitlist: true,
        position: entry.position,
        addedDate: entry.dateAdded,
        expirationDate: entry.expirationDate
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove from waitlist
   */
  static async removeFromWaitlist(customerId, serviceId) {
    try {
      const result = await Waitlist.update(
        { status: 'cancelled' },
        { where: { customerId, serviceId, status: 'active' } }
      );

      if (result[0] > 0) {
        await this.updateWaitlistPositions(serviceId);
        console.log(`✅ Customer ${customerId} removed from waitlist`);
        return { success: true };
      }

      return { success: false, message: 'Not on waitlist' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = WaitlistManager;
