# Critical Fixes Testing Checklist

## Deployment: 2024-11-15

### Issues Fixed

1. ✅ Customer messages not translating to English on agent side
2. ✅ Duplicate messages on agent dashboard
3. ✅ Language indicator not visible on agent dashboard
4. ✅ First message not translated to customer language
5. ✅ Typing indicators appearing/disappearing too quickly

---

## Testing Instructions

### Test 1: Customer Message Translation (Spanish → English)

**Expected Flow:**
1. Customer selects "Spanish (Español)" from language dropdown
2. Customer sends: "Hola, necesito ayuda"
3. **Agent Dashboard should show:** "Hello, I need help" (English)
4. **Database should store:** English translation

**How to Verify:**
- Open customer chat: `https://ikunnect-crm-int.vercel.app/customer-chat`
- Open agent dashboard: `https://ikunnect-crm-int.vercel.app/`
- Open browser console (F12) to see translation logs
- Look for: `[Customer Chat] Translation successful: Hello, I need help`

**What to Check:**
- [ ] Customer message appears in Spanish on customer side
- [ ] Same message appears in English on agent dashboard
- [ ] Console shows successful translation log
- [ ] No duplicate messages on agent side

---

### Test 2: Agent Response Translation (English → Spanish)

**Expected Flow:**
1. Agent responds in English: "How can I help you?"
2. **Customer should see:** "¿Cómo puedo ayudarte?" (Spanish)
3. **Agent Dashboard shows:** "How can I help you?" (English)

**How to Verify:**
- Agent types response in English
- Customer chat should show Spanish translation
- Check console for: `[Customer Chat] Translation successful: ¿Cómo puedo ayudarte?`

**What to Check:**
- [ ] Agent message appears in English on agent dashboard
- [ ] Same message appears in Spanish on customer side
- [ ] Console shows successful translation log
- [ ] First automated greeting is also translated

---

### Test 3: Language Indicator Visibility

**Expected Appearance:**

**Customer Chat (Top Right):**
```
🌐 Spanish
```

**Agent Dashboard (Sticky Banner at Top of Messages):**
```
🌐 Customer Language: Spanish | Messages shown in English
```

**What to Check:**
- [ ] Customer chat shows language badge in top-right corner
- [ ] Agent dashboard shows sticky language banner
- [ ] Banner stays visible when scrolling messages
- [ ] Banner has gradient blue background
- [ ] Banner shows "Messages shown in English" label

---

### Test 4: No Duplicate Messages

**Expected Behavior:**
- Each message appears only once on agent dashboard
- No duplicates even if sent within 5 seconds

**How to Test:**
1. Customer sends: "Test message 1"
2. Wait 2 seconds
3. Customer sends: "Test message 2"
4. Check agent dashboard

**What to Check:**
- [ ] Each message appears exactly once
- [ ] No duplicate messages on agent side
- [ ] Console shows: `[SimpleMessages] Filtered duplicate message` if any duplicates detected

---

### Test 5: Typing Indicators

**Expected Timing:**

**Customer Side:**
- Customer sends message
- Wait 1 second
- "Agent is typing..." appears
- Agent sends message
- Typing indicator stays for 800ms after message appears
- Then disappears

**Agent Side:**
- Agent starts typing
- "Customer is typing..." appears on customer side
- Agent stops typing
- Indicator disappears after 2 seconds of inactivity

**What to Check:**
- [ ] Typing indicators don't appear immediately
- [ ] Indicators stay visible for realistic duration
- [ ] Smooth transitions (not flickering)
- [ ] Natural conversation flow

---

### Test 6: First Message Translation

**Expected Flow:**
1. Customer selects Spanish and starts chat
2. Automated greeting appears: "Hi there, its me, Max..."
3. **Customer should see Spanish translation immediately**

**What to Check:**
- [ ] First automated message is translated
- [ ] Translation appears without delay
- [ ] Console shows translation log for first message

---

## Debug Console Logs to Look For

### Successful Customer Message Translation:
```
[Customer Chat] Sending message - Language: es -> Agent: en
[Customer Chat] Original message: Hola, necesito ayuda
[Customer Chat] Translation needed, calling API...
[Customer Chat] Translation successful: Hello, I need help
[Customer Chat] Sending to iKunnect CRM: Hello, I need help
```

### Successful Agent Message Translation:
```
[Customer Chat] Translating agent message to es : How can I help you?
[Customer Chat] Translation successful: ¿Cómo puedo ayudarte?
```

### Duplicate Detection:
```
[SimpleMessages] Filtered duplicate message: msg_123 Test message
```

---

## Known Issues & Limitations

### Translation API
- If Verbum API fails, original text is shown (fallback behavior)
- Console will show: `[Customer Chat] Translation API failed: 500`
- This is expected behavior to prevent blocking communication

### Language Detection
- Customer language is stored in session storage
- Persists during chat session
- Cleared when browser tab is closed

### Deduplication
- Messages within 5 seconds with same text+sender are deduplicated
- Uses trimmed text comparison (ignores whitespace)
- Based on timestamp proximity

---

## Troubleshooting

### If customer messages show in Spanish on agent side:

1. **Check console logs:**
   - Look for translation success/failure messages
   - Verify Verbum API is being called

2. **Check session storage:**
   - Open DevTools → Application → Session Storage
   - Verify `customer_language` is set correctly (e.g., "es")

3. **Check translation API:**
   - Open Network tab
   - Look for POST to `/api/verbum/translate`
   - Check request payload and response

### If language indicator not showing:

1. **Check customer language:**
   - Must be non-English (not "en")
   - Stored in session storage

2. **Check component rendering:**
   - Language indicator only shows for non-English customers
   - Check browser console for React errors

### If typing indicators are instant:

1. **Check timing values:**
   - Customer: 1000ms delay, 800ms persistence
   - Agent: 2000ms inactivity timeout

2. **Check SSE connection:**
   - Typing indicators use Server-Sent Events
   - Check Network tab for `/api/sse` connection

---

## Success Criteria

All tests pass when:

- ✅ Customer messages translate to English before reaching agent
- ✅ Agent messages translate to customer language
- ✅ Language indicators visible on both sides
- ✅ No duplicate messages
- ✅ Typing indicators have realistic timing
- ✅ First message is translated
- ✅ Console logs show successful translations

---

## Next Steps After Testing

If issues found:
1. Document the issue with screenshots
2. Check browser console for error messages
3. Verify Verbum API key is configured
4. Test with different languages (Portuguese, French)

If all tests pass:
1. Mark this deployment as stable
2. Monitor production logs for translation errors
3. Collect user feedback on translation quality
