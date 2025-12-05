// server/routes/mpesaRoutes.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

// Format phone number to 2547XXXXXXXX
const formatPhoneNumber = (phone) => {
  let p = phone.trim();
  if (p.startsWith('0')) return '254' + p.slice(1);
  if (p.startsWith('+254')) return p.slice(1);
  if (p.startsWith('254')) return p;
  return p; // assume already correct
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
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    // Step 1: Get access token (using production URL with sandbox creds)
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.get(
      'https://api.safaricom.co.ke/oauth/v1/access_token?grant_type=client_credentials',
      {
        headers: { Authorization: `Basic ${auth}` }
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // Step 2: Initiate STK Push (production URL)
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
      TransactionDesc: 'STK Push Test'
    };

    const stkResponse = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    res.json(stkResponse.data);
  } catch (error) {
    console.error('M-Pesa STK Push Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment initiation failed',
      details: error.response?.data || error.message
    });
  }
});

// Callback endpoint (must return ResultCode: 0 within 5 seconds)
router.post('/callback', (req, res) => {
  const callbackData = req.body;
  console.log('📥 M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));
  
  // TODO: Save to DB, update user, etc.
  
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;