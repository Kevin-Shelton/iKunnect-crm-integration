# Vercel Environment Variables Troubleshooting Guide

## Issue: Environment Variables Not Accessible in Production

Based on research and common issues with Vercel deployments, here are the most likely causes and solutions for environment variables not being accessible in Next.js API routes on Vercel.

## Common Causes & Solutions

### 1. Environment Variables Not Set for Correct Environment

**Problem**: Variables are set for "Preview" but not "Production" environment.

**Solution**:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. For each variable, ensure "Production" is checked
3. Click "Save" for each variable
4. Redeploy the project

### 2. Variable Names Don't Match Code

**Problem**: Code expects `SUPABASE_URL` but Vercel has `NEXT_PUBLIC_SUPABASE_URL`.

**Solution**: Ensure exact name matching:
- Vercel Dashboard: `SUPABASE_URL`
- Code: `process.env.SUPABASE_URL`

### 3. Next.js Build-Time vs Runtime Variables

**Problem**: Some variables are only available at build time, not runtime.

**Solution**: Add variables to `next.config.js` (already implemented):
```javascript
module.exports = {
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_TOKEN: process.env.SUPABASE_SERVICE_ROLE_TOKEN,
    // ... other variables
  }
};
```

### 4. Deployment Cache Issues

**Problem**: Old deployment cache prevents new environment variables from being loaded.

**Solution**:
1. Make a small code change (add a comment)
2. Commit and push to trigger fresh deployment
3. Or use Vercel CLI: `vercel --prod --force`

### 5. Sensitive Variables Not Properly Configured

**Problem**: Vercel treats some variables as "sensitive" and restricts access.

**Solution**:
1. In Vercel Dashboard, check if variables are marked as "Sensitive"
2. If so, ensure your team has proper permissions
3. Consider using non-sensitive variables for debugging

## Debugging Steps

### Step 1: Check Environment Detection
Visit: `https://your-app.vercel.app/api/debug/env-comprehensive`

This will show:
- Which environment variables are detected
- Whether you're running on Vercel vs locally
- Production vs Preview environment
- Specific recommendations

### Step 2: Verify Variable Names
Compare the exact variable names in:
1. Vercel Dashboard (Project Settings → Environment Variables)
2. Your code (`process.env.VARIABLE_NAME`)
3. The debug endpoint output

### Step 3: Check Environment Scope
Ensure variables are set for the correct environment:
- **Production**: For `main` branch deployments
- **Preview**: For feature branch deployments
- **Development**: For local development

### Step 4: Force Fresh Deployment
```bash
# Option 1: Make a small change and push
echo "// Force deployment" >> src/app/page.tsx
git add . && git commit -m "Force deployment" && git push

# Option 2: Use Vercel CLI
vercel --prod --force
```

## Required Environment Variables

Based on your Vercel dashboard screenshot, ensure these are set:

| Variable Name | Environment | Required |
|---|---|---|
| `SUPABASE_URL` | Production | ✅ |
| `SUPABASE_SERVICE_ROLE_TOKEN` | Production | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_TOKEN` | Production | ✅ |
| `SHARED_HMAC_SECRET` | Production | ✅ |
| `N8N_AI_SUGGESTIONS_WEBHOOK_URL` | Production | ✅ |

## Testing the Fix

After making changes:

1. **Deploy**: Push changes to trigger new deployment
2. **Test Debug Endpoint**: Visit `/api/debug/env-comprehensive`
3. **Test Supabase Connection**: Visit `/api/debug/chat-events`
4. **Test Main App**: Check if agent interface works properly

## Advanced Debugging

### Check Vercel Function Logs
1. Go to Vercel Dashboard → Functions tab
2. Click on a recent function execution
3. Check logs for environment variable values

### Use Vercel CLI for Local Testing
```bash
# Pull environment variables locally
vercel env pull

# Run with Vercel's environment
vercel dev
```

### Verify with Simple Test
Create a minimal test endpoint:
```javascript
// pages/api/test-env.js
export default function handler(req, res) {
  res.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
}
```

## If Nothing Works

1. **Create New Vercel Project**: Sometimes starting fresh resolves persistent issues
2. **Contact Vercel Support**: If variables are correctly set but still not accessible
3. **Check Team Permissions**: Ensure you have proper access to view/edit environment variables

## Success Indicators

You'll know it's working when:
- `/api/debug/env-comprehensive` shows all variables as `exists: true`
- `/api/debug/chat-events` returns actual data instead of "Missing Supabase configuration"
- Agent interface displays message content instead of timestamps
