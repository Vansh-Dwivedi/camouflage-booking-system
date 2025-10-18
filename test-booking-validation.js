/**
 * Test script to verify both booking payload formats work
 * Run: node test-booking-validation.js
 */

const http = require('http');
const querystring = require('querystring');

// Test data
const testCases = [
  {
    name: 'Flat structure (from booking.js)',
    payload: {
      serviceId: 1,
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+12345678901',
      startTime: new Date(Date.now() + 3 * 3600000).toISOString(),
      endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      totalDuration: 60,
      totalPrice: 50,
      services: [{ id: 1, name: 'Test Service', price: 50 }]
    }
  },
  {
    name: 'Nested structure (from booking-multi.js)',
    payload: {
      serviceId: 1,
      customerInfo: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+12345678901'
      },
      startTime: new Date(Date.now() + 3 * 3600000).toISOString(),
      endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      status: 'pending'
    }
  },
  {
    name: 'Mixed structure (both flat and nested)',
    payload: {
      serviceId: 1,
      customerName: 'Bob Smith',
      customerEmail: 'bob@example.com',
      customerPhone: '+12345678901',
      customerInfo: {
        name: 'Bob Smith',
        email: 'bob@example.com',
        phone: '+12345678901'
      },
      startTime: new Date(Date.now() + 3 * 3600000).toISOString(),
      endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      status: 'pending'
    }
  }
];

async function testPayload(testCase) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          testName: testCase.name,
          statusCode: res.statusCode,
          response: JSON.parse(data)
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(JSON.stringify(testCase.payload));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Booking Validation\n');
  console.log('⏳ Running tests...\n');

  for (const testCase of testCases) {
    try {
      const result = await testPayload(testCase);
      console.log(`✅ ${result.testName}`);
      console.log(`   Status: ${result.statusCode}`);
      if (result.statusCode === 201) {
        console.log(`   ✨ Success! Booking created`);
      } else if (result.statusCode === 400) {
        console.log(`   ❌ Validation errors:`);
        if (result.response.errors) {
          result.response.errors.forEach(err => {
            console.log(`      - ${err.param}: ${err.msg}`);
          });
        }
      } else {
        console.log(`   Status: ${result.response.message}`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
    }
    console.log();
  }
}

// Run tests
runTests().catch(console.error);
