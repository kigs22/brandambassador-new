// server/routes/mpesaRoutes.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { URLSearchParams } = require('url');

dotenv.config();

const router = express.Router();

// Format phone to 2547XXXXXXXX
const formatPhoneNumber = (phone) => {
  let p = phone.trim();
  if (p.startsWith('0')) return '254' + p.slice(1);
  if (p.startsWith('+254')) return p.slice(1);
  if (p.startsWith('254')) return p;
  throw new Error('Invalid phone number format');
};

// Get access token using modern OAuth2 flow
const getAccessToken = async () => {
  try {
    const response = await axios.post(
      'https://api.safaricom.co.ke/oauth/v1/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: {
          username: process.env.MPESA_CONSUMER_KEY,
          password: process.env.MPESA_CONSUMER_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Auth Error:', error.response?.data || error.message);
    throw new Error('Failed to obtain M-Pesa access token');
  }
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

    const accessToken = await getAccessToken();

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Number(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: 'BrandAmbassador',
      TransactionDesc: 'Payment for registration'
    };

    const stkResponse = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(stkResponse.data);
  } catch (error) {
    console.error('STK Push Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment initiation failed',
      details: error.response?.data || error.message
    });
  }
});

// Callback route (must respond within 5 seconds)
router.post('/callback', (req, res) => {
  const data = req.body;
  console.log('📩 M-Pesa Callback Received:', JSON.stringify(data, null, 2));

  // TODO: Save to database, update user status, etc.

  // Must return ResultCode 0 to acknowledge
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;