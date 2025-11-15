# Workflow Troubleshooting Guide

## Issue: Workflow Not Triggering

If the "initiating chat" message is sent but the greeting workflow doesn't trigger, follow these steps:

### 1. Verify Workflow is Published

- Go to **Automation** → **Workflows** → **iKunnect - Customer Messages Sync**
- Look at the top right corner
- The toggle should be **ON** (blue/green), not gray
- If it's gray, click it to publish the workflow

### 2. Check the Trigger Filter

The filter must be set **exactly** like this:

- **Trigger:** Customer Replied
- **Filter Type:** Contains Phrase
- **Value:** `initiating chat` (all lowercase, no period)

**Common mistakes:**
- ❌ Using "Exact Match" instead of "Contains Phrase"
- ❌ Adding a period: "initiating chat."
- ❌ Using capital letters: "Initiating Chat"
- ❌ Adding extra spaces

### 3. Check Execution Logs

1. Open your workflow
2. Click the **"Execution Logs"** tab
3. Look for recent executions
4. If you see executions but they failed:
   - Click on the failed execution
   - Read the error message
   - Common errors:
     - "No matching filter" = Filter is too specific
     - "Workflow not published" = Toggle is OFF
     - "Action failed" = Problem with the Send Message action

### 4. Test the Trigger Manually

1. Go to your workflow
2. Click **"Test Workflow"** button
3. This will show you if the trigger is configured correctly
4. If test fails, the filter or trigger setup is wrong

### 5. Verify Webhook is Working

Check your Vercel logs or iKunnect logs to see if the "initiating chat" message is being received:

- You should see: `[GHL Webhook] Detected initiating chat message - will store but hide from UI`
- If you don't see this, the message isn't reaching GHL

### 6. Check GHL Conversation Type

The workflow might not trigger if the conversation type is wrong:

1. Open the conversation in GHL
2. Check if it shows as "Live Chat" type
3. If it shows as "SMS" or another type, the filter might not work

### 7. Alternative: Remove the Filter Temporarily

To test if the workflow works at all:

1. **Remove** the "Contains Phrase" filter
2. **Save** and **Publish**
3. Send a test message
4. If the workflow triggers now, the filter was the problem
5. Add the filter back with correct settings

### 8. Check Webhook URL

Make sure your webhook in GHL points to the correct URL:

`https://i-kunnect-crm-int.vercel.app/api/webhook/ghl`

(Replace with your actual Vercel domain)

---

## Still Not Working?

If none of the above works, there might be a delay or caching issue:

1. **Wait 5 minutes** after making changes
2. **Clear browser cache** and refresh
3. **Try with a different contact** (new name/email)
4. **Check Vercel deployment status** - make sure latest code is deployed

---

## Expected Behavior

When working correctly:

1. Customer submits form
2. "initiating chat" is sent to GHL (visible in logs)
3. Workflow triggers within 1-2 seconds
4. Greeting message is sent back
5. Customer sees greeting in chat window
6. "initiating chat" is NOT visible anywhere in the UI
