const axios = require('axios');

// Your exact payload
const payload = {
  "serviceId": 4,
  "services": [{"id": 4, "name": "Express Touch-Up", "price": 25}],
  "customerName": "Test",
  "customerEmail": "test@test.test",
  "customerPhone": "+918146094888",
  "startTime": "2025-10-23T11:30:00.000Z",
  "endTime": "2025-10-23T12:00:00.000Z",
  "totalDuration": 30,
  "totalPrice": 25,
  "status": "confirmed"
};

const testBooking = async () => {
  try {
    console.log('Testing booking with payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post('http://localhost:5000/bookings', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Error response:', error.response.status);
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Error:', error.message);
    }
  }
};

testBooking();
