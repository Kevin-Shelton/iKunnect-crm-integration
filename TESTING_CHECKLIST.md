# Testing Checklist - Current Working State

**Date:** November 15, 2025  
**Git Checkpoint:** `checkpoint-ai-agent-working`

---

## Purpose

This checklist ensures that all critical functionality is working as expected after any code changes. Use this before deploying to production or after pulling from the checkpoint.

---

## Pre-Test Setup

Before running tests, ensure:

- [ ] Vercel deployment is complete and live
- [ ] GHL OAuth tokens are valid and stored in Supabase
- [ ] Supabase database is accessible
- [ ] GHL webhooks are configured:
  - [ ] `InboundMessage` webhook is **ON**
  - [ ] `ConversationUnreadUpdate` webhook is **OFF**
- [ ] GHL AI Agent "Max" is configured and active

---

## Test 1: Customer Chat Initiation

**Goal:** Verify that a customer can start a chat and receive an AI greeting.

### Steps:

1. Open `/customer-chat` in an incognito browser window
2. Fill out the contact form with:
   - Name: "Test User [Timestamp]"
   - Email: "test+[timestamp]@example.com"
   - Phone: "+1234567890"
3. Click "Start Chat"

### Expected Results:

- [ ] Form submits successfully
- [ ] Chat window opens
- [ ] Within 2-3 seconds, an AI greeting appears (e.g., "Hi there, It's me, Max...")
- [ ] The greeting is **NOT** "initiating chat"
- [ ] No error messages appear

---

## Test 2: Customer Message Sending

**Goal:** Verify that customer messages are sent to GHL and appear in the agent dashboard.

### Steps:

1. In the customer chat window (from Test 1), type a message: "I need help with my account"
2. Click Send or press Enter
3. Open the agent dashboard at `/` in a separate browser window
4. Wait 5-10 seconds for the conversation to appear

### Expected Results:

- [ ] Message sends successfully from customer chat
- [ ] Conversation appears in the agent dashboard's "Waiting" queue
- [ ] Conversation shows the customer's name
- [ ] Last message preview shows "I need help with my account" (NOT "initiating chat")
- [ ] Message count is accurate

---

## Test 3: Agent View of Conversation

**Goal:** Verify that agents can see the full conversation history.

### Steps:

1. In the agent dashboard, click on the conversation from Test 2
2. Review the message history

### Expected Results:

- [ ] AI greeting is visible (e.g., "Hi there, It's me, Max...")
- [ ] Customer's message "I need help with my account" is visible
- [ ] **"initiating chat" is NOT visible**
- [ ] Messages are in correct chronological order
- [ ] No duplicate messages appear

---

## Test 4: UI Filtering

**Goal:** Verify that the "initiating chat" message is filtered from all views.

### Steps:

1. Check the customer chat window
2. Check the agent dashboard conversation list
3. Check the agent chat view

### Expected Results:

- [ ] "initiating chat" does NOT appear in customer chat window
- [ ] "initiating chat" does NOT appear in agent conversation preview
- [ ] "initiating chat" does NOT appear in agent chat history
- [ ] Only real messages (AI greeting + customer messages) are visible

---

## Test 5: GHL Webhook Verification

**Goal:** Verify that webhooks are firing correctly and data is being stored.

### Steps:

1. Send a message from the customer chat
2. Check Vercel logs (or use `/api/debug/chat-events`)
3. Look for webhook logs

### Expected Results:

- [ ] Webhook logs show `[GHL Webhook]` entries
- [ ] Message is stored in Supabase `chat_events` table
- [ ] No errors in webhook processing
- [ ] Webhook returns status 200

---

## Test 6: No Duplicate Messages

**Goal:** Verify that the duplicate message issue is resolved.

### Steps:

1. Send multiple messages from customer chat
2. Check the agent dashboard

### Expected Results:

- [ ] Each message appears only ONCE in the agent view
- [ ] No duplicate messages in the conversation history
- [ ] Message order is correct

---

## Test 7: AI Agent Engagement

**Goal:** Verify that the GHL AI Agent is responding automatically.

### Steps:

1. Start a new chat (Test 1)
2. Wait for the AI greeting
3. Send a question: "What are your hours?"
4. Wait for AI response

### Expected Results:

- [ ] AI sends an initial greeting automatically
- [ ] AI responds to the customer's question
- [ ] AI responses appear in both customer chat and agent dashboard
- [ ] No manual workflow is needed

---

## Rollback Procedure

If any tests fail, you can rollback to this checkpoint:

```bash
git checkout checkpoint-ai-agent-working
git push origin main --force
```

**Warning:** This will overwrite any changes made after the checkpoint.

---

## Success Criteria

All tests must pass for the system to be considered stable and ready for production use.

If any test fails, investigate the root cause before proceeding with further development.
