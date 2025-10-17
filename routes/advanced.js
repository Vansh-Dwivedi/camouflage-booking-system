// routes/advanced.js - Advanced Features API
const express = require('express');
const { auth, isAdmin } = require('../middleware/auth');
const AIRecommendationEngine = require('../utils/aiRecommendations');
const DynamicPricingEngine = require('../utils/dynamicPricing');
const AdvancedAvailabilityManager = require('../utils/advancedAvailability');

const router = express.Router();

// ============================================================
// AI RECOMMENDATIONS
// ============================================================

/**
 * GET /api/advanced/recommendations/:customerId
 * Get personalized service recommendations
 */
router.get('/recommendations/:customerId', auth, async (req, res) => {
  try {
    const recommendations = await AIRecommendationEngine.getRecommendations(
      req.params.customerId,
      req.query.limit || 5
    );

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

/**
 * GET /api/advanced/trending-services
 * Get trending services
 */
router.get('/trending-services', async (req, res) => {
  try {
    const trending = await AIRecommendationEngine.getTrendingServices(
      req.query.limit || 5
    );

    res.json({
      success: true,
      data: { trending }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get trending services',
      error: error.message
    });
  }
});

/**
 * GET /api/advanced/churn-risk/:customerId
 * Predict customer churn
 */
router.get('/churn-risk/:customerId', auth, isAdmin, async (req, res) => {
  try {
    const churnData = await AIRecommendationEngine.predictChurn(
      req.params.customerId,
      req.query.threshold || 60
    );

    res.json({
      success: true,
      data: churnData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate churn risk',
      error: error.message
    });
  }
});

/**
 * GET /api/advanced/ltv/:customerId
 * Get customer lifetime value
 */
router.get('/ltv/:customerId', auth, isAdmin, async (req, res) => {
  try {
    const ltv = await AIRecommendationEngine.calculateLTV(req.params.customerId);

    res.json({
      success: true,
      data: ltv
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate LTV',
      error: error.message
    });
  }
});

// ============================================================
// DYNAMIC PRICING
// ============================================================

/**
 * POST /api/advanced/calculate-price
 * Calculate dynamic price
 */
router.post('/calculate-price', auth, async (req, res) => {
  try {
    const { serviceId, bookingDate, quantity = 1 } = req.body;
    const customerId = req.user.id;

    const pricing = await DynamicPricingEngine.calculatePrice(
      serviceId,
      customerId,
      bookingDate,
      quantity
    );

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate price',
      error: error.message
    });
  }
});

/**
 * GET /api/advanced/pricing-report/:serviceId
 * Get pricing analytics
 */
router.get('/pricing-report/:serviceId', auth, isAdmin, async (req, res) => {
  try {
    const report = await DynamicPricingEngine.generatePricingReport(
      req.params.serviceId,
      req.query.days || 7
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate pricing report',
      error: error.message
    });
  }
});

// ============================================================
// ADVANCED AVAILABILITY
// ============================================================

/**
 * GET /api/advanced/available-slots/:serviceId
 * Get available booking slots
 */
router.get('/available-slots/:serviceId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const slots = await AdvancedAvailabilityManager.getAvailableSlots(
      req.params.serviceId,
      new Date(startDate),
      new Date(endDate),
      30
    );

    res.json({
      success: true,
      data: {
        slots: slots.slice(0, 20),
        totalAvailable: slots.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots',
      error: error.message
    });
  }
});

/**
 * POST /api/advanced/blackout-period
 * Create blackout period (admin only)
 */
router.post('/blackout-period', auth, isAdmin, async (req, res) => {
  try {
    const { serviceId, startDate, endDate, reason } = req.body;

    if (!serviceId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'serviceId, startDate, and endDate are required'
      });
    }

    const blackout = await AdvancedAvailabilityManager.createBlackoutPeriod(
      serviceId,
      startDate,
      endDate,
      reason || 'Studio closed'
    );

    res.json({
      success: true,
      message: 'Blackout period created',
      data: blackout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create blackout period',
      error: error.message
    });
  }
});

/**
 * GET /api/advanced/recommended-slots/:serviceId
 * Get AI-recommended best slots
 */
router.get('/recommended-slots/:serviceId', async (req, res) => {
  try {
    const { preferredDate } = req.query;

    if (!preferredDate) {
      return res.status(400).json({
        success: false,
        message: 'preferredDate is required'
      });
    }

    const slots = await AdvancedAvailabilityManager.getRecommendedSlots(
      req.params.serviceId,
      preferredDate
    );

    res.json({
      success: true,
      data: { slots }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommended slots',
      error: error.message
    });
  }
});

/**
 * GET /api/advanced/staff-workload/:staffId
 * Get staff workload for a date
 */
router.get('/staff-workload/:staffId', auth, isAdmin, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date is required'
      });
    }

    const workload = await AdvancedAvailabilityManager.getStaffWorkload(
      req.params.staffId,
      new Date(date)
    );

    res.json({
      success: true,
      data: workload
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get staff workload',
      error: error.message
    });
  }
});

module.exports = router;
