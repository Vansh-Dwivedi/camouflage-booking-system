/**
 * REAL CREDENTIALS FOR CAMOUFLAGE BOOKING SYSTEM
 * DO NOT SHARE - FOR AUTHORIZED PERSONNEL ONLY
 */

// ========================================
// ADMIN ACCOUNT
// ========================================
const ADMIN_CREDENTIALS = {
  email: 'admin@camouflage.studio',
  password: 'Camouflage@123',
  role: 'admin',
  phone: '+1(555) 000-0001'
};

// ========================================
// CUSTOMER ACCOUNT
// ========================================
const CUSTOMER_CREDENTIALS = {
  email: 'customer@camouflage.studio',
  password: 'Customer@123',
  role: 'customer',
  phone: '+1(555) 000-0002'
};

// ========================================
// ADDITIONAL TEST ACCOUNTS
// ========================================
const TEST_ACCOUNTS = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    password: 'Customer@123',
    role: 'customer',
    phone: '+1(555) 000-0003'
  },
  {
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    password: 'Customer@123',
    role: 'customer',
    phone: '+1(555) 000-0004'
  }
];

// Export for use in other modules
module.exports = {
  ADMIN_CREDENTIALS,
  CUSTOMER_CREDENTIALS,
  TEST_ACCOUNTS
};

/**
 * CREDENTIAL USAGE INSTRUCTIONS
 * 
 * 1. ADMIN LOGIN:
 *    URL: http://localhost:5000/auth
 *    Email: admin@camouflage.studio
 *    Password: Camouflage@123
 *    Features: Full admin panel, manage services, bookings, customers
 * 
 * 2. CUSTOMER LOGIN:
 *    URL: http://localhost:5000/auth
 *    Email: customer@camouflage.studio
 *    Password: Customer@123
 *    Features: Book services, view bookings, manage account
 * 
 * 3. QUICK ACCESS BUTTONS:
 *    The login page has "Quick Access" buttons for rapid testing:
 *    - Admin Access: Pre-fills admin credentials
 *    - Customer Access: Pre-fills customer credentials
 * 
 * PASSWORD REQUIREMENTS:
 * ✓ Minimum 6 characters
 * ✓ Uppercase letter (Camouflage, Customer)
 * ✓ Lowercase letters (amouflage, ustomer)
 * ✓ Number (@ symbol is allowed)
 * ✓ Special character (@)
 * 
 * SECURITY NOTES:
 * - These are test accounts for development/demo purposes
 * - Change passwords before production deployment
 * - Use strong, unique passwords for production
 * - Enable multi-factor authentication for real accounts
 * - Store credentials securely in environment variables
 * - Never commit real credentials to version control
 */
