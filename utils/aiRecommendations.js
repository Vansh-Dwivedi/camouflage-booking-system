// utils/aiRecommendations.js - AI-Powered Service Recommendations
const { Booking, Service, User } = require('../models');
const { Op } = require('sequelize');

class AIRecommendationEngine {
  /**
   * Get personalized service recommendations for a customer
   * Based on: booking history, service preferences, time of year, similar customers
   */
  static async getRecommendations(customerId, limit = 5) {
    try {
      const customer = await User.findByPk(customerId);
      if (!customer) return [];

      // Get customer's booking history
      const customerBookings = await Booking.findAll({
        where: { customerId },
        include: [{ model: Service }],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // Get all active services
      const allServices = await Service.findAll({
        where: { isActive: true },
        order: [['createdAt', 'DESC']]
      });

      // Score each service based on multiple factors
      const scoredServices = allServices.map(service => {
        let score = 0;

        // Factor 1: Customer's booking frequency (Loyalty Score)
        const bookingCount = customerBookings.length;
        score += Math.min(bookingCount, 20) * 2; // Up to 40 points

        // Factor 2: Service popularity among similar customers
        const similarCustomerScore = this.calculateSimilarCustomerScore(service, customerId);
        score += similarCustomerScore; // Up to 30 points

        // Factor 3: Time-based recommendations (seasonal services)
        const seasonalScore = this.calculateSeasonalScore(service);
        score += seasonalScore; // Up to 20 points

        // Factor 4: Cross-sell potential (services often booked together)
        const crossSellScore = this.calculateCrossSellScore(service, customerBookings);
        score += crossSellScore; // Up to 25 points

        // Factor 5: New services (show variety)
        const isNew = (new Date() - service.createdAt) / (1000 * 60 * 60 * 24) < 30;
        if (isNew) score += 10;

        return { ...service.toJSON(), recommendationScore: score };
      });

      // Sort by score and return top recommendations
      return scoredServices
        .filter(s => s.recommendationScore > 0)
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Recommendation error:', error);
      return [];
    }
  }

  /**
   * Predict customer churn (likelihood they won't book again)
   */
  static async predictChurn(customerId, thresholdDays = 60) {
    try {
      const customer = await User.findByPk(customerId);
      if (!customer) return null;

      const lastBooking = await Booking.findOne({
        where: { customerId },
        order: [['createdAt', 'DESC']]
      });

      if (!lastBooking) {
        return { churnRisk: 'high', reason: 'No booking history' };
      }

      const daysSinceLastBooking = Math.floor(
        (new Date() - new Date(lastBooking.createdAt)) / (1000 * 60 * 60 * 24)
      );

      let churnRisk = 'low';
      let riskScore = 0;

      // Calculate churn risk
      if (daysSinceLastBooking > thresholdDays * 2) {
        churnRisk = 'critical';
        riskScore = 90;
      } else if (daysSinceLastBooking > thresholdDays) {
        churnRisk = 'high';
        riskScore = 70;
      } else if (daysSinceLastBooking > thresholdDays / 2) {
        churnRisk = 'medium';
        riskScore = 40;
      } else {
        riskScore = 10;
      }

      return {
        customerId,
        churnRisk,
        riskScore,
        daysSinceLastBooking,
        lastBookingDate: lastBooking.createdAt,
        recommendedAction: this.getRetentionAction(churnRisk)
      };
    } catch (error) {
      console.error('Churn prediction error:', error);
      return null;
    }
  }

  /**
   * Get retention action based on churn risk
   */
  static getRetentionAction(churnRisk) {
    const actions = {
      low: 'Send loyalty rewards email',
      medium: 'Offer 10% discount on next booking',
      high: 'Send "We miss you" email with 20% discount',
      critical: 'Send personalized call + 30% discount + free service upgrade'
    };
    return actions[churnRisk] || 'Standard email';
  }

  /**
   * Calculate score based on what similar customers book
   */
  static async calculateSimilarCustomerScore(service, customerId) {
    try {
      // Find customers with similar booking patterns
      const thisCustomerServices = await Booking.findAll({
        where: { customerId },
        attributes: ['serviceId'],
        raw: true
      });

      const thisCustomerServiceIds = thisCustomerServices.map(b => b.serviceId);

      // Find similar customers
      const similarCustomers = await Booking.findAll({
        where: {
          serviceId: { [Op.in]: thisCustomerServiceIds },
          customerId: { [Op.ne]: customerId }
        },
        attributes: ['customerId'],
        group: ['customerId'],
        raw: true,
        limit: 100
      });

      // Count how many similar customers booked this service
      const similarCustomerBookings = await Booking.count({
        where: {
          customerId: { [Op.in]: similarCustomers.map(c => c.customerId) },
          serviceId: service.id
        }
      });

      return Math.min(similarCustomerBookings * 0.5, 30);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Seasonal recommendations (e.g., bridal makeup before wedding season)
   */
  static calculateSeasonalScore(service) {
    const currentMonth = new Date().getMonth();
    let score = 0;

    const seasonalServices = {
      'bridal': [2, 3, 4, 5], // March-June
      'party': [10, 11, 12, 0, 1], // Oct-Jan (holidays)
      'natural': [3, 4, 5, 6], // Spring-Summer
      'glam': [9, 10, 11, 12] // Fall-Winter
    };

    const serviceCategory = service.category?.toLowerCase();
    if (seasonalServices[serviceCategory]?.includes(currentMonth)) {
      score += 15;
    }

    return score;
  }

  /**
   * Cross-sell: Services often booked together
   */
  static async calculateCrossSellScore(service, customerBookings) {
    try {
      if (customerBookings.length === 0) return 0;

      const customerServiceIds = customerBookings.map(b => b.Service?.id).filter(Boolean);

      // Find services frequently booked with customer's preferred services
      const frequentPairs = await Booking.findAll({
        where: { serviceId: { [Op.in]: customerServiceIds } },
        attributes: ['serviceId'],
        include: [{
          model: Booking,
          as: 'sameDayBookings',
          required: true,
          where: { serviceId: { [Op.ne]: null } }
        }],
        raw: false
      });

      if (frequentPairs.length > 0 && service.id === frequentPairs[0].serviceId) {
        return 25;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get trending services (most booked in last 30 days)
   */
  static async getTrendingServices(limit = 5) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trendingServices = await Service.findAll({
        attributes: {
          include: [
            [require('sequelize').fn('COUNT', require('sequelize').col('Bookings.id')), 'bookingCount']
          ]
        },
        include: [{
          model: Booking,
          attributes: [],
          where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
          required: false
        }],
        group: ['Service.id'],
        order: [[require('sequelize').literal('bookingCount'), 'DESC']],
        limit,
        raw: false,
        subQuery: false
      });

      return trendingServices;
    } catch (error) {
      console.error('Error fetching trending services:', error);
      return [];
    }
  }

  /**
   * Get customer lifetime value (LTV)
   */
  static async calculateLTV(customerId) {
    try {
      const bookings = await Booking.findAll({
        where: { customerId },
        include: [{ model: Service, attributes: ['price'] }]
      });

      if (bookings.length === 0) return { ltv: 0, avgOrderValue: 0, bookingCount: 0 };

      const totalValue = bookings.reduce((sum, booking) => {
        return sum + (booking.Service?.price || 0);
      }, 0);

      const averageOrderValue = totalValue / bookings.length;
      const monthsAsCustomer = Math.max(
        (new Date() - new Date(bookings[bookings.length - 1].createdAt)) / (1000 * 60 * 60 * 24 * 30),
        1
      );
      const predictedAnnualValue = averageOrderValue * (bookings.length / monthsAsCustomer) * 12;

      return {
        ltv: totalValue,
        avgOrderValue,
        bookingCount: bookings.length,
        monthsAsCustomer: Math.floor(monthsAsCustomer),
        predictedAnnualValue: Math.floor(predictedAnnualValue)
      };
    } catch (error) {
      console.error('LTV calculation error:', error);
      return null;
    }
  }
}

module.exports = AIRecommendationEngine;
