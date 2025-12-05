// Validate critical env vars
const requiredEnvVars = [
  'MPESA_CONSUMER_KEY',usPWIH1KOOgmblFL39lIeeJ37AmZJKw0kD3nVv0mXu1FxsF3
  'MPESA_CONSUMER_SECRET',8IW5V2TQkgO4NghN3ocXGg9ZNvUazmIKCjO4XbFPRribwn2P79ltSyGBzuz161SC
  'MPESA_SHORTCODE',174379
  'MPESA_PASSKEY',bfb279f97bd94dd5b667ea7b5c212434d8918660b8a7d5b430a7d5b430a7d5b4
  'MPESA_CALLBACK_URL'https://brandambassador-backend-wjvx.onrender.com/api/mpesa/callback
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}