const accountSid = 'AC2e4c7dd83118888f8912c0b587d42dcc';
const authToken = '771ddb0aa955bd306be49da658f6e8cb';
const client = require('twilio')(accountSid, authToken);
client.messages
    .create({
        body: 'testing',
        from: '+12292128190',
        to: '+61433000516'
    })
    .then(message => console.log(message.sid));