# Updated GHL Workflow Instructions

**Date:** November 15, 2025  
**Status:** Ready to Implement

---

## What Changed

The system now automatically sends a hidden "initiating chat" message when customers submit their information. This triggers your GHL workflow to send the greeting message immediately.

---

## Update Your Workflow Trigger

### Current Trigger (REMOVE THIS FILTER)

If you added a filter for "Customer started a new chat", **remove it**.

### New Trigger Setup

1. **Trigger:** Customer Replied
2. **Filter:** Message Body **contains** `initiating chat`
3. **Action 1:** Send Live Chat Message (your greeting)
4. **Action 2:** #1 Send to iKunnect App (existing webhook)

---

## Step-by-Step Instructions

### 1. Edit Your Workflow

Go to: **Automation** → **Workflows** → **iKunnect - Customer Messages Sync**

### 2. Update the Trigger Filter

Click on the **"Customer Replied"** trigger box:

- Click **"+ Add Filters"**
- Select **"Contains Phrase"**
- Enter: `initiating chat`
- Save

### 3. Verify Your Actions

Make sure you have these two actions in order:

**Action 1: Send Live Chat Message**
- Conversation ID: (leave blank)
- Message: Your greeting template

**Action 2: #1 Send to iKunnect App**
- (Your existing webhook - don't change)

### 4. Save and Publish

- Click **Save**
- Toggle the workflow to **ON** (published)

---

## How It Works

1. **Customer opens chat** and submits info (name, email, phone)
2. **iKunnect automatically sends** "initiating chat" to GHL
3. **GHL workflow triggers** on "initiating chat" message
4. **GHL sends greeting** back to customer
5. **Customer sees greeting** and types their question
6. **Conversation appears** in iKunnect agent queue

---

## Important Notes

- The "initiating chat" message is **hidden from both customer and agent UI**
- It only exists to trigger the workflow
- Customers will **never see** "initiating chat" - they only see your greeting
- The greeting appears **immediately** after they submit the form

---

## Greeting Message Template

Use this in your "Send Live Chat Message" action:

```
Hi {{contact.first_name}}, thank you for visiting [Your Company Name]. While we direct you to the next available agent, how can we help you today?
```

Replace `[Your Company Name]` with your actual company name, or use `{{location.name}}` if available.

---

## Testing Checklist

After updating the workflow:

- [ ] Turn OFF "ConversationUnreadUpdate" webhook (to fix duplicates)
- [ ] Keep ON "InboundMessage" webhook only
- [ ] Open customer chat and submit info
- [ ] Verify greeting appears immediately
- [ ] Type a message
- [ ] Check iKunnect - conversation should appear with greeting + your message
- [ ] Verify no "initiating chat" message is visible
- [ ] Verify no duplicate messages appear

---

## Troubleshooting

**Greeting doesn't appear?**
- Check workflow Execution Logs
- Verify filter is set to "contains" not "exact match"
- Make sure workflow is published (toggle ON)

**Still seeing duplicates?**
- Turn off "ConversationUnreadUpdate" webhook in GHL
- Keep only "InboundMessage" webhook enabled

**"initiating chat" is visible?**
- Wait for Vercel deployment to complete
- Clear browser cache and refresh
