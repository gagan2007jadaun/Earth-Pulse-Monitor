require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Twilio Client
let twilioClient;
try {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} catch (e) {
  console.log("Warning: Twilio credentials missing or invalid in .env file");
}

// API endpoint to trigger OTP SMS
app.post('/api/send-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  try {
    // If Twilio keys are setup, send a real SMS!
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== "your_account_sid_here") {
      await twilioClient.messages.create({
        body: `Your Earth Pulse Monitor access code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`[REAL SMS SENT] OTP ${otp} successfully sent to ${phone}`);
      return res.json({ success: true, message: 'Real SMS sent via Twilio!' });
    } else {
      // Simulate if no real keys
      console.log(`[Backend Received] Need to send OTP: ${otp} to Mobile: ${phone}`);
      console.log(`NOTE: Setup your Twilio Account in .env to send a real SMS to the device.`);
      return res.json({ success: true, message: 'Simulated on server. Setup Twilio to send real SMS.' });
    }
  } catch (error) {
    console.error("[Twilio Error]: ", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`Earth Pulse Backend is running on port ${PORT}`);
  console.log(`Ready to trigger SMS Alerts!`);
  console.log(`==========================================`);
});
