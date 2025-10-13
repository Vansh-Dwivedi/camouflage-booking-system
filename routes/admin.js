const express = require('express');
const { Op, fn, col } = require('sequelize');
const { Booking, Service, User, Setting } = require('../models');
const { auth, isAdmin } = require('../middleware/auth');
const { enqueue } = require('../utils/notificationQueue');
const { twilioHealthCheck } = require('../utils/twilio');

const router = express.Router();

// Get admin dashboard data
router.get('/dashboard', auth, isAdmin, async (req, res) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0,0,0,0);
    const endDate = new Date();
    endDate.setHours(23,59,59,999);

    // Parallel basic stats
    const [totalBookings, totalServices, totalCustomers, recentBookings] = await Promise.all([
      Booking.count(),
      Service.count({ where: { isActive: true } }),
      User.count({ where: { role: 'customer' } }),
      Booking.findAll({
        where: { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } },
        include: [
          { model: Service, as: 'service', attributes: ['name','category','price','duration'] },
          { model: User, as: 'customer', attributes: ['name','email'] }
        ],
        order: [['createdAt','DESC']],
        limit: 10
      })
    ]);

    // Status distribution
    const statusRows = await Booking.findAll({
      attributes: ['status',[fn('COUNT', col('id')),'count']],
      where: { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } },
      group: ['status'],
      raw: true
    });
    const bookingsByStatus = statusRows.reduce((acc,r)=>{ acc[r.status]=parseInt(r.count); return acc;},{});

    // Revenue (confirmed + completed) derived from service price or pricing.finalPrice if present
    const revenueBookings = await Booking.findAll({
      where: { status: { [Op.in]: ['confirmed','completed'] }, createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } },
      include: [{ model: Service, as: 'service', attributes: ['price'] }]
    });
    let totalRevenue = 0;
    revenueBookings.forEach(b => {
      const finalPrice = (b.pricing && b.pricing.finalPrice) ? parseFloat(b.pricing.finalPrice) : (b.service ? parseFloat(b.service.price) : 0);
      totalRevenue += finalPrice || 0;
    });
    const averageBookingValue = revenueBookings.length ? totalRevenue / revenueBookings.length : 0;

    // Popular services
    const popularServiceRows = await Booking.findAll({
      attributes: [
        ['serviceId','serviceId'],
        [fn('COUNT', col('Booking.id')),'bookingCount']
      ],
      where: { createdAt: { [Op.gte]: startDate, [Op.lte]: endDate } },
      include: [{ model: Service, as: 'service', attributes: ['name','category','price'] }],
      group: ['Booking.serviceId','service.id','service.name','service.category','service.price'],
      order: [[fn('COUNT', col('Booking.id')),'DESC']],
      limit: 5
    });
    const popularServices = popularServiceRows.map(r => ({
      name: r.service?.name || 'N/A',
      category: r.service?.category || 'N/A',
      bookingCount: parseInt(r.dataValues.bookingCount || 0),
      revenue: ((r.service ? parseFloat(r.service.price) : 0) * parseInt(r.dataValues.bookingCount || 0))
    }));

    const stats = {
      totalBookings,
      totalServices,
      totalCustomers,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageBookingValue: parseFloat(averageBookingValue.toFixed(2)),
      bookingsByStatus,
      popularServices
    };

    const formattedRecentBookings = recentBookings.map(b => ({
      id: b.id,
      customerInfo: b.customer ? { name: b.customer.name, email: b.customer.email } : (b.customerInfo || { name: 'Guest', email: 'N/A' }),
      service: { name: b.service?.name || 'N/A', category: b.service?.category || 'N/A' },
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      pricing: { finalPrice: (b.pricing && b.pricing.finalPrice) ? b.pricing.finalPrice : (b.service ? b.service.price : 0) },
      createdAt: b.createdAt
    }));

    return res.json({
      success: true,
      data: {
        stats,
        recentBookings: formattedRecentBookings,
        period: { days, startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success:false, message:'Failed to load dashboard data', error: error.message });
  }
});

// --- Notification / Twilio Settings ---
const NOTIFICATION_SETTING_KEY = 'notifications.twilio';

router.get('/settings/notifications', auth, isAdmin, async (req, res) => {
  try {
    let row = await Setting.findOne({ where: { key: NOTIFICATION_SETTING_KEY } });
    let value = row ? JSON.parse(row.value) : {};
    // Overlay environment (env wins, and marked readOnly)
    const overlay = (envName, field) => {
      if (process.env[envName]) {
        value[field] = process.env[envName];
        value[field + 'ReadOnly'] = true;
      }
    };
    overlay('TWILIO_FROM_SMS','fromSms');
    overlay('TWILIO_FROM_WHATSAPP','fromWhatsapp');
    overlay('TWILIO_OWNER_PHONE_SMS','ownerPhoneSms');
    overlay('TWILIO_OWNER_PHONE_WHATSAPP','ownerPhoneWhatsapp');
    overlay('TWILIO_DEFAULT_COUNTRY_CODE','defaultCountryCode');
    overlay('TWILIO_ACCOUNT_SID','accountSid');
    overlay('TWILIO_AUTH_TOKEN','authToken');
    value.enabled = value.enabled !== false; // default true
    value.whatsappEnabled = value.whatsappEnabled || false;
    value.reminderHours = value.reminderHours || 24;
    res.json({ success:true, data: value });
  } catch (e) {
    res.status(500).json({ success:false, message:'Failed to load notification settings', error:e.message });
  }
});

router.put('/settings/notifications', auth, isAdmin, async (req, res) => {
  try {
    const incoming = req.body || {};
    // Prevent overriding env-injected sensitive data
    ['accountSid','authToken','fromSms','fromWhatsapp'].forEach(f => {
      if (process.env['TWILIO_' + f.toUpperCase()]) delete incoming[f];
    });
    let row = await Setting.findOne({ where: { key: NOTIFICATION_SETTING_KEY } });
    if (!row) {
      row = await Setting.create({ key: NOTIFICATION_SETTING_KEY, value: JSON.stringify(incoming) });
    } else {
      await row.update({ value: JSON.stringify(incoming) });
    }
    res.json({ success:true, message:'Notification settings saved', data: incoming });
  } catch (e) {
    res.status(500).json({ success:false, message:'Failed to save notification settings', error:e.message });
  }
});

// Get all bookings (admin view) - Sequelize
router.get('/bookings', auth, isAdmin, async (req, res) => {
  try {
    const {
      status,
      serviceId,
      customerId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = req.query;

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (serviceId) where.serviceId = parseInt(serviceId, 10);
    if (customerId) where.customerId = parseInt(customerId, 10);
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[Op.gte] = new Date(startDate);
      if (endDate) where.startTime[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const orderable = ['startTime','endTime','createdAt','status'];
    const order = [[orderable.includes(sortBy) ? sortBy : 'startTime', (String(sortOrder).toLowerCase()==='asc'?'ASC':'DESC')]];

    const include = [
      { model: Service, as: 'service', attributes: ['name','category','duration','price'] },
      { model: User, as: 'customer', attributes: ['name','email','phone'], required: !!search, where: search ? { [Op.or]: [ { name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } } ] } : undefined }
    ];

    const { rows, count } = await Booking.findAndCountAll({
      where,
      include,
      order,
      limit: parseInt(limit, 10),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: {
        bookings: rows,
        pagination: {
          current: parseInt(page, 10),
          total: Math.ceil(count / parseInt(limit, 10)),
          count: rows.length,
          totalBookings: count
        }
      }
    });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
  }
});

// --- Sequelize Admin Feature Endpoints ---

// Update booking status
router.put('/bookings/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const allowed = ['pending','confirmed','completed','cancelled','no-show'];
    if (!allowed.includes(status)) return res.status(400).json({success:false,message:'Invalid status'});
    
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Service, as: 'service', attributes: ['name'] },
        { model: User, as: 'customer', attributes: ['name', 'phone'] }
      ]
    });
    
    if (!booking) return res.status(404).json({success:false,message:'Booking not found'});
    
    const oldStatus = booking.status;
    await booking.update({ status, cancellationReason: status==='cancelled'? (reason||'Cancelled by admin'): booking.cancellationReason });
    
    // Send SMS notifications for status changes
    if (oldStatus !== status && booking.customer?.phone) {
      const context = {
        service: booking.service?.name || 'Service',
        customer: booking.customer?.name || 'Customer',
        start: booking.startTime,
        status: status
      };
      
      // Customer notification
      let notificationType = null;
      if (status === 'confirmed') {
        notificationType = 'booking_confirmed_customer';
      } else if (status === 'cancelled') {
        notificationType = 'booking_cancelled_customer';
      } else if (status === 'completed') {
        notificationType = 'booking_completed_customer';
      }
      
      if (notificationType) {
        enqueue({ 
          type: notificationType, 
          channel: 'sms', 
          to: booking.customer.phone, 
          context: context
        });
        
        // Owner notification
        const ownerSms = process.env.TWILIO_OWNER_PHONE_SMS;
        if (ownerSms) {
          enqueue({ 
            type: `booking_${status}_owner`, 
            channel: 'sms', 
            to: ownerSms, 
            context: context
          });
        }
      }
    }
    
    const io = req.app.get('io');
    io.to(`booking-${booking.serviceId}`).emit('booking-status-updated',{ bookingId: booking.id, status, updatedBy:'admin'});
    res.json({success:true,message:'Booking status updated',data:{booking}});
  } catch (e) { console.error('Update booking status error:',e); res.status(500).json({success:false,message:'Failed to update booking status',error:e.message}); }
});

// Users (generic) & customers alias
router.get(['/users','/customers'], auth, isAdmin, async (req,res)=>{
  try {
    const { role, search, page=1, limit=20 } = req.query;
    const where = {};
    if (role && role !== 'all') where.role = role;
    if (req.path.endsWith('/customers')) where.role = 'customer';
    if (search) where.name = { [Op.like]: `%${search}%` };
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { rows, count } = await User.findAndCountAll({ where, attributes:{ exclude:['password'] }, order:[['createdAt','DESC']], limit: parseInt(limit), offset });
    res.json({ success:true, data:{ users: rows, pagination:{ current:parseInt(page), total: Math.ceil(count/limit), count: rows.length, totalUsers: count } } });
  } catch(e){ console.error('Get users error',e); res.status(500).json({success:false,message:'Failed to fetch users',error:e.message}); }
});

router.put('/users/:id/status', auth, isAdmin, async (req,res)=>{
  try { const { isActive } = req.body; const user = await User.findByPk(req.params.id); if(!user) return res.status(404).json({success:false,message:'User not found'}); await user.update({ isActive: !!isActive }); res.json({success:true,message:`User ${isActive?'activated':'deactivated'} successfully`,data:{user}}); } catch(e){ console.error('Update user status error',e); res.status(500).json({success:false,message:'Failed to update user status',error:e.message}); }
});

// Services admin endpoints
router.get('/services', auth, isAdmin, async (req,res)=>{
  try { const services = await Service.findAll({ order:[['createdAt','DESC']]}); res.json({success:true,data:{services}}); } catch(e){ res.status(500).json({success:false,message:'Failed to fetch services',error:e.message}); }
});

router.post('/services', auth, isAdmin, async (req,res)=>{
  try { const service = await Service.create(req.body); res.status(201).json({success:true,message:'Service created',data:{service}}); } catch(e){ res.status(500).json({success:false,message:'Failed to create service',error:e.message}); }
});

router.put('/services/:id', auth, isAdmin, async (req,res)=>{
  try { const service = await Service.findByPk(req.params.id); if(!service) return res.status(404).json({success:false,message:'Service not found'}); await service.update(req.body); res.json({success:true,message:'Service updated',data:{service}}); } catch(e){ res.status(500).json({success:false,message:'Failed to update service',error:e.message}); }
});

router.put('/services/:id/status', auth, isAdmin, async (req,res)=>{
  try { const { isActive } = req.body; const service = await Service.findByPk(req.params.id); if(!service) return res.status(404).json({success:false,message:'Service not found'}); await service.update({ isActive: !!isActive }); res.json({success:true,message:'Service status updated',data:{service}}); } catch(e){ res.status(500).json({success:false,message:'Failed to update service status',error:e.message}); }
});

router.delete('/services/:id', auth, isAdmin, async (req,res)=>{
  try { const service = await Service.findByPk(req.params.id); if(!service) return res.status(404).json({success:false,message:'Service not found'}); await service.destroy(); res.json({success:true,message:'Service deleted'}); } catch(e){ res.status(500).json({success:false,message:'Failed to delete service',error:e.message}); }
});

// Analytics (simplified)
router.get('/analytics', auth, isAdmin, async (req,res)=>{
  try {
    const { period='30' } = req.query; const days = parseInt(period)||30; const startDate = new Date(); startDate.setDate(startDate.getDate()-days); startDate.setHours(0,0,0,0);
    const bookings = await Booking.findAll({ where:{ createdAt:{ [Op.gte]: startDate } }, include:[{model:Service,as:'service',attributes:['category','price']}], order:[['createdAt','ASC']] });
    const categoryRevenueMap = {};
    const hourly = Array.from({length:24},(_,h)=>({hour:h,bookings:0}));
    const customerCounts = {};
    bookings.forEach(b=>{
      const cat = b.service?.category || 'uncategorized';
      const price = (b.pricing?.finalPrice)|| b.service?.price || 0;
      categoryRevenueMap[cat] = categoryRevenueMap[cat] || { category:cat, revenue:0, bookings:0};
      categoryRevenueMap[cat].revenue += parseFloat(price);
      categoryRevenueMap[cat].bookings += 1;
      const hour = new Date(b.startTime).getHours();
      hourly[hour].bookings += 1;
      if (b.customerId) customerCounts[b.customerId] = (customerCounts[b.customerId]||0)+1;
    });
    const categoryRevenue = Object.values(categoryRevenueMap).sort((a,b)=>b.revenue-a.revenue);
    const retention = { new:0, returning:0 };
    Object.values(customerCounts).forEach(c=>{ if(c>1) retention.returning++; else retention.new++; });
    const customerRetention = { new:{ customers: retention.new, revenue: null}, returning:{ customers: retention.returning, revenue:null } };
    res.json({success:true,data:{ categoryRevenue, hourlyTrends:hourly, customerRetention }});
  } catch(e){ console.error('Analytics error',e); res.status(500).json({success:false,message:'Failed to fetch analytics data',error:e.message}); }
});

// Export bookings CSV
router.get('/export/bookings', auth, isAdmin, async (req,res)=>{
  try {
    const { startDate, endDate, status } = req.query; const where = {};
    if (startDate || endDate) { where.startTime = {}; if(startDate) where.startTime[Op.gte]= new Date(startDate); if(endDate) where.startTime[Op.lte]= new Date(endDate); }
    if (status && status !== 'all') where.status = status;
    const list = await Booking.findAll({ where, include:[{model:Service,as:'service',attributes:['name','category']}] , order:[['startTime','DESC']]});
    const header = 'Date,Time,Service,Category,Status,Price\n';
    const rows = list.map(b=>{ const d=new Date(b.startTime); const date=d.toLocaleDateString(); const time=d.toLocaleTimeString(); const price=(b.pricing?.finalPrice)|| b.service?.price || 0; return `${date},${time},${b.service?.name||''},${b.service?.category||''},${b.status},${price}`; }).join('\n');
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename=bookings.csv'); res.send(header+rows);
  } catch(e){ console.error('Export bookings error',e); res.status(500).json({success:false,message:'Failed to export bookings',error:e.message}); }
});

// Twilio health check endpoint (admin only)
router.get('/twilio/health', auth, isAdmin, async (req, res) => {
  try {
    const status = await twilioHealthCheck();
    // Mask FROM number for safety
    if (status.fromNumber) {
      const n = String(status.fromNumber);
      status.fromNumber = n.length > 6 ? `${n.slice(0,3)}***${n.slice(-2)}` : n;
    }
    res.json({ success: true, data: status });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Twilio health check failed', error: e.message });
  }
});

// Delete a single booking (hard delete)
router.delete('/bookings/:id', auth, isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    await booking.destroy();
    const io = req.app.get('io');
    io.to(`booking-${booking.serviceId}`).emit('booking-deleted', { bookingId: booking.id, serviceId: booking.serviceId });
    res.json({ success: true, message: 'Booking deleted' });
  } catch (e) {
    console.error('Delete booking error', e);
    res.status(500).json({ success: false, message: 'Failed to delete booking', error: e.message });
  }
});

// Bulk delete bookings (optionally by status). Requires confirm=true query.
router.delete('/bookings', auth, isAdmin, async (req, res) => {
  try {
    const { confirm = 'false', status } = req.query;
    if (String(confirm).toLowerCase() !== 'true') {
      return res.status(400).json({ success: false, message: 'Confirmation required. Add ?confirm=true to proceed.' });
    }
    const where = {};
    if (status && status !== 'all') where.status = status;
    const deleted = await Booking.destroy({ where });
    res.json({ success: true, message: `Deleted ${deleted} booking(s)`, data: { deleted } });
  } catch (e) {
    console.error('Bulk delete bookings error', e);
    res.status(500).json({ success: false, message: 'Failed to bulk delete bookings', error: e.message });
  }
});

module.exports = router;