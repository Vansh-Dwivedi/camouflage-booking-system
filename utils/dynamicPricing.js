// utils/dynamicPricing.js - Advanced Pricing Engine
const { Op } = require('sequelize');
const { Booking, Service, User } = require('../models');

class DynamicPricingEngine {
  /**
   * Calculate dynamic price based on multiple factors
   * - Base price
   * - Demand (surge pricing)
   * - Time-based pricing
   * - Loyalty discounts
   * - Bulk booking discounts
   */
  static async calculatePrice(serviceId, customerId, bookingDate, quantity = 1) {
    try {
      const service = await Service.findByPk(serviceId);
      if (!service) return null;

      let basePrice = parseFloat(service.price);
      let multipliers = [];
      let discounts = [];

      // Factor 1: Surge Pricing (High Demand)
      const demandMultiplier = await this.calculateDemandMultiplier(serviceId, bookingDate);
      if (demandMultiplier > 1) {
        multipliers.push({
          name: 'Surge Pricing',
          value: demandMultiplier,
          reason: 'High demand for this time slot'
        });
      }

      // Factor 2: Time-based Pricing (Peak Hours)
      const timeMultiplier = this.calculateTimePricing(bookingDate);
      if (timeMultiplier > 1) {
        multipliers.push({
          name: 'Peak Hours',
          value: timeMultiplier,
          reason: 'Premium time slot'
        });
      } else if (timeMultiplier < 1) {
        discounts.push({
          name: 'Off-Peak Discount',
          value: timeMultiplier,
          percentage: Math.round((1 - timeMultiplier) * 100)
        });
      }

      // Factor 3: Loyalty Discount
      const loyaltyDiscount = await this.calculateLoyaltyDiscount(customerId);
      if (loyaltyDiscount > 0) {
        discounts.push({
          name: 'Loyalty Discount',
          percentage: loyaltyDiscount,
          reason: `Loyal customer (${await this.getCustomerStatus(customerId)})`
        });
      }

      // Factor 4: Bulk Booking Discount
      const bulkDiscount = this.calculateBulkDiscount(quantity);
      if (bulkDiscount > 0) {
        discounts.push({
          name: 'Bulk Booking Discount',
          percentage: bulkDiscount,
          reason: `Booking ${quantity} services`
        });
      }

      // Factor 5: New Customer Incentive
      const newCustomerDiscount = await this.checkNewCustomerOffer(customerId);
      if (newCustomerDiscount > 0) {
        discounts.push({
          name: 'New Customer Welcome',
          percentage: newCustomerDiscount,
          reason: 'First-time booking discount'
        });
      }

      // Calculate final price
      let finalPrice = basePrice;

      // Apply multipliers
      multipliers.forEach(m => {
        finalPrice *= m.value;
      });

      // Apply discounts
      let totalDiscountPercentage = 0;
      discounts.forEach(d => {
        totalDiscountPercentage += d.percentage;
      });

      // Cap discount at 50%
      totalDiscountPercentage = Math.min(totalDiscountPercentage, 50);
      finalPrice = finalPrice * (1 - totalDiscountPercentage / 100);

      // Calculate total for quantity
      const totalPrice = finalPrice * quantity;

      return {
        serviceId,
        customerId,
        basePrice,
        dynamicPrice: parseFloat(finalPrice.toFixed(2)),
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        quantity,
        multipliers,
        discounts,
        totalSavings: parseFloat((basePrice - finalPrice).toFixed(2)),
        percentageChange: parseFloat(((finalPrice - basePrice) / basePrice * 100).toFixed(2))
      };
    } catch (error) {
      console.error('Dynamic pricing error:', error);
      return null;
    }
  }

  /**
   * Surge Pricing: Higher prices during high demand times
   * Based on booking availability and demand
   */
  static async calculateDemandMultiplier(serviceId, bookingDate) {
    try {
      // Count bookings for this service on this date
      const bookingsOnDate = await Booking.count({
        where: {
          serviceId,
          [Op.and]: [
            { startTime: { [Op.gte]: new Date(bookingDate).setHours(0, 0, 0) } },
            { startTime: { [Op.lte]: new Date(bookingDate).setHours(23, 59, 59) } }
          ]
        }
      });

      // Calculate occupancy percentage
      const assumedDailyCapacity = 10; // Assume 10 possible bookings per day
      const occupancyPercentage = (bookingsOnDate / assumedDailyCapacity) * 100;

      // Pricing tiers
      if (occupancyPercentage > 90) return 1.5; // 50% surge
      if (occupancyPercentage > 75) return 1.35; // 35% surge
      if (occupancyPercentage > 60) return 1.2; // 20% surge
      if (occupancyPercentage > 45) return 1.1; // 10% surge

      return 1; // Normal pricing
    } catch (error) {
      return 1;
    }
  }

  /**
   * Time-based Pricing
   * Peak hours = premium price
   * Off-peak = discounted price
   */
  static calculateTimePricing(bookingDate) {
    const hour = new Date(bookingDate).getHours();

    // Peak hours: 5pm-8pm (happy hour alternative)
    if (hour >= 17 && hour < 20) return 1.25; // 25% premium

    // Morning rush: 9am-11am
    if (hour >= 9 && hour < 11) return 1.15; // 15% premium

    // Lunch: 12pm-1pm
    if (hour >= 12 && hour < 13) return 1.1; // 10% premium

    // Off-peak discount: 2pm-4pm (slowest time)
    if (hour >= 14 && hour < 16) return 0.85; // 15% discount

    // Night: 8pm+ (late availability discount)
    if (hour >= 20) return 0.9; // 10% discount

    // Late night: 10pm+ (heavily discounted)
    if (hour >= 22) return 0.75; // 25% discount

    return 1; // Regular pricing
  }

  /**
   * Loyalty Discount based on customer history
   */
  static async calculateLoyaltyDiscount(customerId) {
    try {
      const bookingCount = await Booking.count({ where: { customerId } });

      if (bookingCount >= 20) return 20; // Platinum: 20% discount
      if (bookingCount >= 10) return 15; // Gold: 15% discount
      if (bookingCount >= 5) return 10; // Silver: 10% discount
      if (bookingCount >= 3) return 5; // Bronze: 5% discount

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Bulk Booking Discount
   * More services booked = more savings
   */
  static calculateBulkDiscount(quantity) {
    if (quantity >= 10) return 20; // 20% off for 10+
    if (quantity >= 5) return 15; // 15% off for 5+
    if (quantity >= 3) return 10; // 10% off for 3+
    if (quantity >= 2) return 5; // 5% off for 2+

    return 0;
  }

  /**
   * New Customer Welcome Offer
   */
  static async checkNewCustomerOffer(customerId) {
    try {
      const bookingCount = await Booking.count({ where: { customerId } });

      // First booking: 20% discount
      if (bookingCount === 0) return 20;

      // No discount for returning customers
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get customer status for display
   */
  static async getCustomerStatus(customerId) {
    try {
      const bookingCount = await Booking.count({ where: { customerId } });

      if (bookingCount >= 20) return 'Platinum Member';
      if (bookingCount >= 10) return 'Gold Member';
      if (bookingCount >= 5) return 'Silver Member';
      if (bookingCount >= 3) return 'Bronze Member';
      if (bookingCount > 0) return 'Returning Customer';

      return 'New Customer';
    } catch (error) {
      return 'Customer';
    }
  }

  /**
   * Generate pricing report for admin
   */
  static async generatePricingReport(serviceId, days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const bookings = await Booking.findAll({
        where: {
          serviceId,
          createdAt: { [Op.gte]: startDate }
        },
        include: [{ model: Service }]
      });

      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const averagePrice = bookings.length > 0 ? totalRevenue / bookings.length : 0;

      return {
        serviceId,
        period: `Last ${days} days`,
        totalBookings: bookings.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averagePrice: parseFloat(averagePrice.toFixed(2)),
        highestPrice: bookings.length > 0 ? Math.max(...bookings.map(b => b.totalPrice)) : 0,
        lowestPrice: bookings.length > 0 ? Math.min(...bookings.map(b => b.totalPrice)) : 0
      };
    } catch (error) {
      console.error('Pricing report error:', error);
      return null;
    }
  }
}

module.exports = DynamicPricingEngine;
