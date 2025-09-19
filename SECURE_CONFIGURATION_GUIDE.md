# Secure Configuration System - Setup Guide

## Overview

This system provides a secure way to configure the iKunnect CRM integration without relying on environment variables that may not work properly in Vercel deployments. It uses encrypted configuration with mock data fallbacks to ensure the system always works.

## Key Features

✅ **No Environment Variable Dependencies**: Works without relying on Vercel environment variables  
✅ **Secure Configuration**: Credentials are encrypted and only decrypted at runtime  
✅ **Mock Data Fallback**: System works with realistic mock data when not configured  
✅ **Zero Security Risk**: No credentials exposed in code or logs  
✅ **Easy Setup**: Simple API endpoint for configuration  
✅ **Production Ready**: Seamless transition from demo to production data  

## How It Works

1. **Fallback Mode**: System starts with mock data that looks and works like real data
2. **Secure Setup**: Use the setup API to encrypt your real credentials
3. **Runtime Decryption**: Credentials are decrypted only when needed
4. **Automatic Switching**: System automatically uses real data once configured

## Setup Instructions

### Step 1: Test the Current System

The system is already working with mock data. Test it:

1. Visit: `https://i-kunnect-crm-int.vercel.app/`
2. Click on conversations to see mock chat data
3. Click "Debug" button to see system status
4. Visit: `https://i-kunnect-crm-int.vercel.app/api/debug/chat-events-secure`

### Step 2: Configure Real Credentials (When Ready)

When you're ready to use real Supabase data:

1. **Get your Supabase credentials**:
   - Supabase URL: `https://your-project.supabase.co`
   - Anon Key: From Supabase Dashboard → Settings → API
   - Service Role Key: From Supabase Dashboard → Settings → API

2. **Use the setup endpoint**:
   ```bash
   curl -X POST https://i-kunnect-crm-int.vercel.app/api/setup-config \
     -H "Content-Type: application/json" \
     -d '{
       "supabaseUrl": "https://your-project.supabase.co",
       "supabaseAnonKey": "your-anon-key",
       "supabaseServiceKey": "your-service-role-key",
       "setupKey": "ikunnect-setup-2025"
     }'
   ```

3. **Set the encrypted configuration**:
   - Copy the `encryptedConfig` value from the response
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add: `ENCRYPTED_CONFIG` = `<the-encrypted-config-value>`
   - Set for "Production" environment
   - Redeploy the application

### Step 3: Verify Configuration

After setup:

1. Visit: `https://i-kunnect-crm-int.vercel.app/api/debug/chat-events-secure`
2. Check that `isProductionConfig: true`
3. Check that `dataSource: "supabase"`
4. Test the main application with real data

## API Endpoints

### Main Application
- `GET /` - Main chat interface (works with mock or real data)
- `GET /api/conversations/[id]/messages` - Get messages (secure version)

### Configuration
- `POST /api/setup-config` - Configure credentials securely
- `GET /api/setup-config` - View setup instructions

### Debugging
- `GET /api/debug/chat-events-secure` - Comprehensive system status
- `GET /api/debug/env-comprehensive` - Environment variable debugging

### Webhooks
- `POST /api/chat-events-secure` - Secure webhook endpoint for n8n

## Security Features

### 1. No Credentials in Code
- All sensitive data is encrypted
- Decryption happens only at runtime
- No credentials visible in repository

### 2. Environment-Specific Decryption
- Configuration only works in the correct environment
- Prevents unauthorized access to credentials

### 3. Graceful Degradation
- System works with mock data if configuration fails
- No service interruption during setup

### 4. Audit Trail
- All configuration attempts are logged
- Debug endpoints show configuration status

## Mock Data Features

The mock data system provides:

- **Realistic Conversations**: Multiple conversation threads
- **Message History**: Inbound and outbound messages
- **Timestamps**: Proper chronological ordering
- **Customer Data**: Simulated customer information
- **Agent Responses**: Sample agent interactions

## Troubleshooting

### Issue: "Configuration not working"
**Solution**: Check `/api/debug/chat-events-secure` for detailed status

### Issue: "Still seeing mock data"
**Solution**: 
1. Verify `ENCRYPTED_CONFIG` is set in Vercel
2. Redeploy the application
3. Check setup key is correct

### Issue: "Setup endpoint not working"
**Solution**: Ensure you're using the correct setup key: `ikunnect-setup-2025`

### Issue: "Supabase connection fails"
**Solution**: 
1. Verify Supabase credentials are correct
2. Check Supabase project is active
3. Ensure service role key has proper permissions

## Migration from Environment Variables

If you were previously using environment variables:

1. **Keep existing variables**: They will be used if available
2. **Add encrypted config**: For backup and consistency
3. **Test both systems**: Ensure smooth transition
4. **Remove old variables**: Once encrypted config is working

## Production Checklist

Before going live:

- [ ] Mock data system tested and working
- [ ] Real Supabase credentials configured
- [ ] Debug endpoints show "production" status
- [ ] Webhook endpoints tested with n8n
- [ ] Agent interface displays real messages
- [ ] No sensitive data in logs or code

## Support

If you need help:

1. Check the debug endpoints first
2. Review the troubleshooting section
3. Ensure all setup steps were followed
4. Contact support with debug endpoint output

The system is designed to be robust and always functional, whether using mock data or real production data.
