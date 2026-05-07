require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Firebase Admin
let db = null;
try {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } catch (err) {
      console.log(`Warning: Could not load service account from ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
    }
  }
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("Firebase Admin Initialized successfully.");
  } else {
    console.log("Warning: Firebase not fully initialized. Provide a valid FIREBASE_SERVICE_ACCOUNT_PATH.");
    // Fallback if running in GCP environment without explicit keys
    // admin.initializeApp(); 
    // db = admin.firestore();
  }
} catch (e) {
  console.error("Firebase Initialization Error:", e.message);
}

// Mock endpoint for dashboard UI
app.get('/data', (req, res) => {
  // Mock data for the dashboard
  const soil = Math.floor(Math.random() * 20) + 30; // 30-50
  const water = Math.floor(Math.random() * 20) + 10; // 10-30
  const danger = false; // Set to false so it won't be always beeping initially
  res.json({ soil, water, danger });
});

// API endpoint to log sensor data to Firebase
app.post('/api/log-sensor-data', async (req, res) => {
  if (!db) {
    return res.status(500).json({ success: false, message: 'Firebase not initialized on server' });
  }
  
  const { soilMoisture, waterLevel, dangerStatus, timestamp } = req.body;
  try {
    const docRef = await db.collection('sensor_logs').add({
      soilMoisture: Number(soilMoisture),
      waterLevel: Number(waterLevel),
      dangerStatus: Boolean(dangerStatus),
      timestamp: admin.firestore.FieldValue.serverTimestamp() || timestamp
    });
    res.json({ success: true, message: 'Data logged successfully', id: docRef.id });
  } catch (error) {
    console.error("Firebase Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
