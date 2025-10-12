# Camouflage Booking System

A comprehensive booking system for makeup studios similar to Square's booking system. This application allows makeup studios to manage services, appointments, and provides customers with an easy-to-use booking interface.

## Features

### Admin Features
- ✅ Add, edit, and delete services
- ✅ Set service duration, pricing, and availability
- ✅ Manage appointment slots and scheduling
- ✅ View and manage all bookings
- ✅ Dashboard with analytics
- ✅ Staff management
- ✅ Time slot management

### Customer Features  
- ✅ Browse available services
- ✅ Real-time availability checking
- ✅ Book appointments with preferred time slots
- ✅ View booking confirmation and details
- ✅ Cancel or reschedule appointments

### System Features
- ✅ Automated scheduling system
- ✅ Real-time updates using Socket.IO
- ✅ Responsive web design
- ✅ Secure authentication
- ✅ Time zone handling
- ✅ Email notifications (ready for integration)

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time Updates**: Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/camouflage-booking
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=3000
   ```

4. Seed the database with sample data:
   ```bash
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Demo Accounts

### Admin Account
- Email: admin@camouflage.com
- Password: admin123

### Customer Account  
- Email: customer@example.com
- Password: customer123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Services (Admin)
- `GET /api/services` - Get all services
- `POST /api/services` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Bookings
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking
- `GET /api/bookings/availability/:serviceId` - Check availability

### Admin
- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/dashboard` - Get dashboard data
- `GET /api/admin/users` - Get all users

## Project Structure

```
camouflage-booking-system/
├── models/             # MongoDB models
├── routes/             # Express route handlers
├── middleware/         # Custom middleware
├── public/            # Static files (CSS, JS, images)
├── views/             # HTML templates
├── scripts/           # Utility scripts
├── .env.example       # Environment variables template
├── server.js          # Main server file
└── package.json       # Dependencies and scripts
```

## Usage

1. **Admin Setup**: 
   - Login with admin credentials
   - Add services with pricing and duration
   - Set available time slots
   - Configure studio settings

2. **Customer Booking**:
   - Browse available services
   - Select preferred date and time
   - Fill booking details
   - Confirm appointment

3. **Booking Management**:
   - View upcoming appointments
   - Modify or cancel bookings
   - Track booking history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.