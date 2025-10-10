# Camouflage Booking System - Demo Guide

## Overview
A complete booking system for makeup studios built with Node.js, similar to Square's booking system. This system allows customers to book services online and provides administrators with a comprehensive management dashboard.

## Features

### Customer Features
- **Service Browsing**: View all available makeup services with categories, descriptions, and pricing
- **Real-time Booking**: Select services, choose dates/times with live availability checking
- **Multi-step Booking Wizard**: Intuitive 4-step booking process
- **Customer Accounts**: Register, login, and manage bookings
- **Email Confirmations**: Automated booking confirmations and reminders

### Admin Features
- **Dashboard**: Overview of bookings, revenue, and key metrics
- **Service Management**: Add, edit, delete, and manage service availability
- **Booking Management**: View, update, cancel, and track all bookings
- **Customer Management**: View customer information and booking history
- **Analytics**: Revenue tracking and popular services analysis
- **Real-time Updates**: Live booking notifications and availability updates

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Git

### Installation

1. **Navigate to the project directory**:
   ```bash
   cd l:\Apps\camouflage-booking-system
   ```

2. **Install dependencies** (already done):
   ```bash
   npm install
   ```

3. **Seed the database**:
   ```bash
   node scripts/seedData.js
   ```

5. **Start the application**:
   ```bash
   npm start
   ```

6. **Access the application**:
   - Customer Interface: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin.html

## Demo Accounts

### Admin Account
- **Email**: admin@camouflage.com
- **Password**: admin123
- **Access**: Full admin dashboard with all management features

### Customer Account
- **Email**: customer@example.com
- **Password**: customer123
- **Access**: Customer booking interface

## Demo Process

### 1. Customer Booking Process

1. **Visit the Homepage** (http://localhost:3000)
   - Browse featured services
   - View service categories and descriptions
   - See real-time availability

2. **Select a Service**
   - Click "Book Now" on any service
   - Or browse all services and select one
   - Filter by category or search for specific services

3. **Choose Date & Time**
   - Use the calendar to select available dates
   - View real-time available time slots
   - See service duration and pricing

4. **Enter Customer Information**
   - Fill in personal details (name, email, phone)
   - Add any special notes or requests
   - Review booking summary

5. **Confirm Booking**
   - Review all details
   - Complete the booking
   - Receive confirmation with booking ID

### 2. Admin Management Process

1. **Login to Admin Dashboard** (http://localhost:3000/admin.html)
   - Use admin credentials
   - Access comprehensive dashboard

2. **Dashboard Overview**
   - View today's bookings count
   - Monitor total revenue
   - Track active services and customers
   - See recent bookings

3. **Manage Services**
   - Add new makeup services
   - Set pricing, duration, and availability
   - Edit existing services
   - Activate/deactivate services
   - Delete services

4. **Manage Bookings**
   - View all bookings in a table format
   - Filter by status, date, or customer
   - Update booking status (pending → confirmed → completed)
   - Cancel or reschedule bookings
   - View detailed booking information

5. **Customer Management**
   - View all registered customers
   - See customer booking history
   - Track customer lifetime value
   - Monitor frequent customers

6. **Analytics**
   - Revenue tracking by month
   - Popular services analysis
   - Booking trends and patterns
   - Customer analytics

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Services
- `GET /api/services` - Get all active services
- `GET /api/services/:id` - Get specific service
- `GET /api/services/:id/availability/:date` - Get available time slots
- `GET /api/services/meta/categories` - Get service categories

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/my` - Get user's bookings
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/bookings` - All bookings
- `PATCH /api/admin/bookings/:id/status` - Update booking status
- `GET /api/admin/services` - Manage services
- `POST /api/admin/services` - Create service
- `PUT /api/admin/services/:id` - Update service
- `DELETE /api/admin/services/:id` - Delete service
- `GET /api/admin/customers` - Customer management
- `GET /api/admin/analytics` - Analytics data

## Real-time Features

The system uses Socket.IO for real-time updates:

- **Live Availability**: Booking availability updates in real-time
- **Booking Notifications**: Instant notifications for new bookings
- **Status Updates**: Real-time booking status changes
- **Admin Alerts**: Live notifications for admin dashboard

## Database Structure

### Database Tables
1. **users** - User accounts (customers and admins)
2. **services** - Makeup services with pricing and availability
3. **bookings** - All booking records with customer and service info

### Sample Services (Pre-loaded)
- **Bridal Makeup** - $150, 120 minutes
- **Party Makeup** - $80, 90 minutes
- **Natural Look** - $60, 60 minutes
- **Glamour Makeup** - $100, 90 minutes
- **Special Effects** - $200, 150 minutes

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database
- **Sequelize** - ORM for SQLite
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive styling with Flexbox/Grid
- **Vanilla JavaScript** - Interactive functionality
- **Socket.IO Client** - Real-time updates
- **Font Awesome** - Icons

### Security Features
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Data sanitization
- **JWT Authentication** - Secure session management

## File Structure

```
camouflage-booking-system/
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── models/                   # Database models
│   ├── User.js
│   ├── Service.js
│   └── Booking.js
├── routes/                   # API routes
│   ├── auth.js
│   ├── services.js
│   ├── bookings.js
│   └── admin.js
├── middleware/               # Custom middleware
│   ├── auth.js
│   └── validation.js
├── views/                    # HTML templates
│   ├── index.html
│   ├── booking.html
│   ├── admin.html
│   └── login.html
├── public/                   # Static assets
│   ├── css/
│   │   ├── style.css
│   │   ├── booking.css
│   │   ├── admin.css
│   │   └── auth.css
│   └── js/
│       ├── app.js
│       ├── home.js
│       ├── booking.js
│       ├── admin.js
│       └── auth.js
└── scripts/
    └── seedData.js          # Database seeding
```

## Customization

### Adding New Service Categories
1. Update the `Service` model in `models/Service.js`
2. Add new categories to the enum array
3. Update the frontend category filters

### Modifying Booking Flow
1. Edit the booking steps in `views/booking.html`
2. Update the JavaScript logic in `public/js/booking.js`
3. Modify the API endpoints if needed

### Styling Customization
1. Edit CSS files in `public/css/`
2. Modify color schemes in CSS custom properties
3. Update responsive breakpoints as needed

## Deployment

### Production Setup
1. Set environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=your_jwt_secret`
   - `PORT=3000`

2. Build and start:
   ```bash
   npm run build  # If you add a build process
   npm start
   ```

### Recommended Hosting
- **Backend**: Heroku, DigitalOcean, AWS EC2
- **Database**: SQLite file (included with app) or PostgreSQL for production
- **Domain**: Namecheap, GoDaddy
- **SSL**: Let's Encrypt, Cloudflare

## Support & Maintenance

### Regular Tasks
- Monitor booking patterns
- Update service offerings
- Review customer feedback
- Backup database regularly
- Update dependencies

### Troubleshooting
- Check SQLite database file exists (`database.sqlite`)
- Verify JWT token expiration
- Monitor server logs
- Test booking flow regularly

---

**Demo Complete!** 

Your makeup studio booking system is now ready for use. The system provides a complete Square-like booking experience with real-time availability, automated workflows, and comprehensive admin management tools.

To start the demo:
1. Ensure MongoDB is running
2. Run `node scripts/seedData.js` to populate sample data
3. Start the server with `npm start`
4. Visit http://localhost:3000 to begin!