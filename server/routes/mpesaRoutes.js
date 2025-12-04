// server/routes/mpesaRoutes.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

// Helper: Format phone number (0712345678 → 254712345678)
const formatPhoneNumber = (phone) => {
  let p = phone.trim();
  if (p.startsWith('0')) return '254' + p.slice(1);
  if (p.startsWith('+254')) return p.slice(1);
  if (p.startsWith('254')) return p;
  throw new Error('Invalid phone number. Use format: 0712345678');
};

// Get access token from Daraja
const getAccessToken = async () => {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/access_token?grant_type=client_credentials',
      {
        headers: { Authorization: `Basic ${auth}` }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('❌ M-Pesa Auth Error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

// Generate password (shortcode + passkey + timestamp)
const generatePassword = (timestamp) => {
  return Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
};

// STK Push endpoint
router.post('/stkpush', async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone and amount are required' });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = generatePassword(timestamp);
    const accessToken = await getAccessToken();

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: 'BrandAmbassador',
      TransactionDesc: 'Payment for ambassador registration'
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ STK Push Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initiation failed', details: error.message });
  }
});

// Callback endpoint (must be public)
router.post('/callback', (req, res) => {
  const callbackData = req.body;
  console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));
  
  // TODO: Save to database, update user status, etc.
  
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;