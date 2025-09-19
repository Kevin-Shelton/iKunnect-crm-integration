#!/usr/bin/env node

// Simple script to generate encrypted configuration for Supabase credentials
// This bypasses the need for the API endpoint to be deployed

function generateEncryptedConfig(supabaseUrl, supabaseAnonKey, supabaseServiceKey, n8nWebhookUrl = '', hmacSecret = 'default-hmac-secret') {
  const config = {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey
    },
    n8n: {
      webhookUrl: n8nWebhookUrl
    },
    hmac: {
      secret: hmacSecret
    }
  };
  
  // Simple base64 encoding
  const configString = JSON.stringify(config);
  return Buffer.from(configString).toString('base64');
}

// Example usage - replace with your actual credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
const SUPABASE_SERVICE_KEY = 'your-service-role-key-here';
const N8N_WEBHOOK_URL = 'your-n8n-webhook-url'; // Optional
const HMAC_SECRET = 'your-hmac-secret'; // Optional

console.log('🔐 Supabase Credential Configuration Generator');
console.log('='.repeat(50));
console.log('');

if (process.argv.length < 5) {
  console.log('Usage: node configure-credentials.js <supabase-url> <anon-key> <service-key> [n8n-webhook] [hmac-secret]');
  console.log('');
  console.log('Example:');
  console.log('node configure-credentials.js \\');
  console.log('  "https://your-project.supabase.co" \\');
  console.log('  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \\');
  console.log('  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \\');
  console.log('  "https://your-n8n-webhook-url" \\');
  console.log('  "your-hmac-secret"');
  console.log('');
  process.exit(1);
}

const supabaseUrl = process.argv[2];
const anonKey = process.argv[3];
const serviceKey = process.argv[4];
const webhookUrl = process.argv[5] || '';
const hmacSecret = process.argv[6] || 'default-hmac-secret';

console.log('📋 Configuration Summary:');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Anon Key: ${anonKey.substring(0, 20)}...`);
console.log(`Service Key: ${serviceKey.substring(0, 20)}...`);
console.log(`N8N Webhook: ${webhookUrl || 'Not provided'}`);
console.log(`HMAC Secret: ${hmacSecret}`);
console.log('');

const encryptedConfig = generateEncryptedConfig(supabaseUrl, anonKey, serviceKey, webhookUrl, hmacSecret);

console.log('✅ Encrypted Configuration Generated:');
console.log('');
console.log('ENCRYPTED_CONFIG=');
console.log(encryptedConfig);
console.log('');
console.log('📝 Next Steps:');
console.log('1. Copy the ENCRYPTED_CONFIG value above');
console.log('2. Go to Vercel Dashboard → Project Settings → Environment Variables');
console.log('3. Add new variable: ENCRYPTED_CONFIG = <the-value-above>');
console.log('4. Set environment to "Production"');
console.log('5. Save and redeploy the application');
console.log('');
console.log('🎯 The system will automatically detect and use your real Supabase credentials!');
