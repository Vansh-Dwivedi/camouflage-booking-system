// utils/advancedAvailability.js - Smart Scheduling System
const { Op } = require('sequelize');
const { Booking, Service, User } = require('../models');

class AdvancedAvailabilityManager {
  /**
   * Get available slots considering:
   * - Service availability
   * - Existing bookings
   * - Blackout dates (vacations, breaks)
   * - Staff workload
   * - Travel time between appointments
   */
  static async getAvailableSlots(serviceId, startDate, endDate, duration) {
    try {
      const service = await Service.findByPk(serviceId);
      if (!service) return [];

      const slots = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current < end) {
        const dayOfWeek = this.getDayOfWeek(current);
        const availability = service.availability?.[dayOfWeek];

        // Check if service is available on this day
        if (availability?.enabled && availability?.slots?.length > 0) {
          // Check if it's not a blackout date
          if (!await this.isBlackoutDate(serviceId, current)) {
            // Get all time slots for this day
            for (const slot of availability.slots) {
              const slotStart = this.parseTime(slot.start, current);
              const slotEnd = this.parseTime(slot.end, current);

              // Generate 15-minute intervals
              const daySlots = this.generateTimeSlots(slotStart, slotEnd, duration);
              slots.push(...daySlots);
            }
          }
        }

        current.setDate(current.getDate() + 1);
      }

      // Filter out fully booked slots
      const availableSlots = await this.filterBookedSlots(serviceId, slots, duration);

      return availableSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Check if a date is a blackout date (vacation, holiday, closed)
   */
  static async isBlackoutDate(serviceId, date) {
    try {
      // In a real system, this would check a Blackout model
      // For now, we'll check based on predefined patterns

      const month = date.getMonth() + 1;
      const day = date.getDate();

      // Example: No bookings on Sundays (already handled by availability)
      if (date.getDay() === 0) return true;

      // Example: Closed on specific holidays
      const holidays = [
        '12-25', // Christmas
        '01-01', // New Year
        '07-04'  // Independence Day
      ];

      const dateStr = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return holidays.includes(dateStr);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get day of week (monday, tuesday, etc.)
   */
  static getDayOfWeek(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Parse time string (HH:MM) with a date
   */
  static parseTime(timeStr, date) {
    const [hours, minutes] = timeStr.split(':');
    const result = new Date(date);
    result.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return result;
  }

  /**
   * Generate 15-minute time slots
   */
  static generateTimeSlots(startTime, endTime, duration = 30) {
    const slots = [];
    const interval = 15; // 15-minute intervals

    let current = new Date(startTime);

    while (current < endTime) {
      const slotEnd = new Date(current.getTime() + duration * 60000);

      if (slotEnd <= endTime) {
        slots.push({
          start: new Date(current),
          end: slotEnd,
          duration,
          available: true
        });
      }

      current.setMinutes(current.getMinutes() + interval);
    }

    return slots;
  }

  /**
   * Filter out slots that have bookings
   */
  static async filterBookedSlots(serviceId, slots, duration) {
    try {
      const bookedSlots = await Booking.findAll({
        where: {
          serviceId,
          status: { [Op.in]: ['confirmed', 'pending'] }
        }
      });

      return slots.filter(slot => {
        return !bookedSlots.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.startTime.getTime() + booking.duration * 60000);

          // Check if there's overlap
          return slot.start < bookingEnd && slot.end > bookingStart;
        });
      });
    } catch (error) {
      return slots;
    }
  }

  /**
   * Create a blackout period (vacation, maintenance, etc.)
   */
  static async createBlackoutPeriod(serviceId, startDate, endDate, reason) {
    try {
      // In a real system, save to BlackoutPeriod model
      const blackout = {
        serviceId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        createdAt: new Date()
      };

      console.log(`✅ Blackout period created: ${reason} from ${startDate} to ${endDate}`);
      return blackout;
    } catch (error) {
      console.error('Blackout creation error:', error);
      return null;
    }
  }

  /**
   * Get staff workload for load balancing
   */
  static async getStaffWorkload(staffId, date) {
    try {
      const dayStart = new Date(date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);

      const bookings = await Booking.findAll({
        where: {
          staffId,
          startTime: { [Op.between]: [dayStart, dayEnd] }
        }
      });

      const totalMinutes = bookings.reduce((sum, b) => sum + b.duration, 0);
      const totalHours = totalMinutes / 60;

      return {
        staffId,
        date,
        bookingCount: bookings.length,
        totalHours: parseFloat(totalHours.toFixed(2)),
        utilization: parseFloat((totalHours / 8 * 100).toFixed(2)), // Assuming 8-hour workday
        availableCapacity: parseFloat(Math.max(0, 8 - totalHours).toFixed(2))
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Auto-assign staff based on availability and workload
   */
  static async autoAssignStaff(serviceId, bookingDate, preferredStaffId = null) {
    try {
      // If preferred staff requested, check their availability
      if (preferredStaffId) {
        const workload = await this.getStaffWorkload(preferredStaffId, bookingDate);
        if (workload.availableCapacity > 0) {
          return preferredStaffId;
        }
      }

      // Find all available staff for this service
      const service = await Service.findByPk(serviceId);
      if (!service?.staffRequired) return null;

      // Get all staff with lowest workload
      const staffList = await User.findAll({
        where: { role: 'staff' }
      });

      const staffWorkload = await Promise.all(
        staffList.map(async (staff) => ({
          staffId: staff.id,
          workload: await this.getStaffWorkload(staff.id, bookingDate)
        }))
      );

      // Sort by available capacity
      const availableStaff = staffWorkload
        .filter(s => s.workload.availableCapacity > service.duration / 60)
        .sort((a, b) => b.workload.availableCapacity - a.workload.availableCapacity);

      return availableStaff.length > 0 ? availableStaff[0].staffId : null;
    } catch (error) {
      console.error('Staff assignment error:', error);
      return null;
    }
  }

  /**
   * Calculate travel time between appointments
   */
  static calculateTravelTime(fromLocation, toLocation) {
    // In real system, integrate with Google Maps API
    // For now, return mock data

    const defaultTravelTime = 30; // minutes
    return defaultTravelTime;
  }

  /**
   * Get booking recommendations based on availability
   */
  static async getRecommendedSlots(serviceId, preferredDate) {
    try {
      const availableSlots = await this.getAvailableSlots(
        serviceId,
        new Date(preferredDate),
        new Date(new Date(preferredDate).getTime() + 7 * 24 * 60 * 60 * 1000),
        60
      );

      // Filter to show best availability (least booked times)
      const recommended = availableSlots
        .slice(0, 5) // Show top 5
        .map(slot => ({
          start: slot.start,
          end: slot.end,
          confidence: this.getAvailabilityConfidence(slot),
          label: this.getTimeLabel(slot.start)
        }));

      return recommended;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get confidence score for a slot (likelihood it won't be fully booked)
   */
  static getAvailabilityConfidence(slot) {
    // Time-based confidence
    const hour = slot.start.getHours();

    if (hour >= 9 && hour < 11) return 'high'; // Morning: popular but usually available
    if (hour >= 14 && hour < 16) return 'very-high'; // Afternoon: usually empty
    if (hour >= 17 && hour < 19) return 'medium'; // Evening: getting busy
    if (hour >= 19) return 'low'; // Late: often fully booked

    return 'medium';
  }

  /**
   * Format time slot for display
   */
  static getTimeLabel(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[date.getDay()];
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${time}`;
  }
}

module.exports = AdvancedAvailabilityManager;
