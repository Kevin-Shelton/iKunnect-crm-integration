# Translation Flow Testing Guide

## Overview
This guide verifies that the corrected translation flow works as expected:
- Customer messages are translated to English BEFORE sending to GHL
- Agent responses are translated to customer language BEFORE displaying to customer
- GHL only receives and sends English messages
- Agent dashboard shows English only
- Customer chat shows messages in customer's selected language

## Prerequisites
- Deployment completed on Vercel
- VERBUM_API_KEY environment variable set in Vercel
- Access to customer chat interface
- Access to agent dashboard
- Access to GHL conversation view (optional, for verification)

## Test Scenarios

### Test 1: Spanish Customer → English Agent

**Objective:** Verify Spanish customer messages are translated to English before reaching GHL and agent

**Steps:**
1. Open customer chat interface
2. Select "Spanish (Español)" from language dropdown
3. Enter name and email, click "Start Chat"
4. Customer sends: "Hola, necesito ayuda con mi pedido"
5. Open agent dashboard in another tab/window
6. Check agent dashboard shows: "Hello, I need help with my order" (English)
7. Check sentiment badge appears on customer message (e.g., 😐 Neutral)
8. Agent responds: "I'd be happy to help with your order. What's your order number?"
9. Check customer chat shows: "Estaría encantado de ayudar con tu pedido. ¿Cuál es tu número de pedido?"
10. Customer responds: "Mi número de pedido es 12345"
11. Check agent dashboard shows: "My order number is 12345" (English)

**Expected Results:**
- ✅ Agent dashboard displays all customer messages in English
- ✅ Customer chat displays all agent messages in Spanish
- ✅ Sentiment badges appear only on customer messages in agent dashboard
- ✅ GHL receives English messages only (verify in GHL if possible)
- ✅ No translation errors in browser console
- ✅ Messages appear in real-time without delay

---

### Test 2: Portuguese Customer → English Agent

**Objective:** Verify Portuguese translation works correctly

**Steps:**
1. Open customer chat interface (new session)
2. Select "Portuguese (Português)" from language dropdown
3. Enter name and email, click "Start Chat"
4. Customer sends: "Olá, preciso de ajuda urgente"
5. Check agent dashboard shows: "Hello, I need urgent help" (English)
6. Agent responds: "What can I help you with?"
7. Check customer chat shows: "Com o que posso ajudá-lo?" (Portuguese)

**Expected Results:**
- ✅ Portuguese → English translation works
- ✅ English → Portuguese translation works
- ✅ Sentiment analysis works on Portuguese messages

---

### Test 3: French Customer → English Agent

**Objective:** Verify French translation works correctly

**Steps:**
1. Open customer chat interface (new session)
2. Select "French (Français)" from language dropdown
3. Enter name and email, click "Start Chat"
4. Customer sends: "Bonjour, j'ai un problème avec mon compte"
5. Check agent dashboard shows: "Hello, I have a problem with my account" (English)
6. Agent responds: "I can help you with your account. What seems to be the issue?"
7. Check customer chat shows: "Je peux vous aider avec votre compte. Quel semble être le problème?" (French)

**Expected Results:**
- ✅ French → English translation works
- ✅ English → French translation works
- ✅ Sentiment analysis works on French messages

---

### Test 4: English Customer → English Agent (No Translation)

**Objective:** Verify no translation occurs when customer selects English

**Steps:**
1. Open customer chat interface (new session)
2. Select "English" from language dropdown
3. Enter name and email, click "Start Chat"
4. Customer sends: "Hello, I need help"
5. Check agent dashboard shows: "Hello, I need help" (same text)
6. Agent responds: "How can I help you?"
7. Check customer chat shows: "How can I help you?" (same text)

**Expected Results:**
- ✅ No translation API calls made (check browser console)
- ✅ Messages appear instantly
- ✅ Sentiment analysis still works

---

### Test 5: Sentiment Analysis Verification

**Objective:** Verify sentiment analysis works correctly on customer messages

**Steps:**
1. Open customer chat with Spanish language
2. Send positive message: "¡Excelente servicio! Estoy muy feliz"
3. Check agent dashboard shows: 😊 Positive badge with high confidence
4. Send negative message: "Esto es terrible, estoy muy molesto"
5. Check agent dashboard shows: 😟 Negative badge with high confidence
6. Send neutral message: "¿Cuál es el horario de atención?"
7. Check agent dashboard shows: 😐 Neutral badge

**Expected Results:**
- ✅ Positive sentiment detected correctly
- ✅ Negative sentiment detected correctly
- ✅ Neutral sentiment detected correctly
- ✅ Confidence scores displayed (e.g., 95%)
- ✅ Sentiment badges only on customer messages, not agent messages

---

### Test 6: Database Verification

**Objective:** Verify translation data is stored correctly in database

**Steps:**
1. After completing Test 1 (Spanish conversation)
2. Access Supabase dashboard
3. Open `chat_events` table
4. Find the conversation messages
5. Check customer message fields:
   - `text`: Should be in English (what agent sees)
   - `original_text`: Should be null (translation happens client-side)
   - `translated_text`: Should be null
   - `source_lang`: Should be "es"
   - `target_lang`: Should be "en"
   - `customer_language`: Should be "es"
   - `sentiment`: Should have value (positive/negative/neutral/mixed)
   - `sentiment_confidence`: Should have decimal value (0-1)
6. Check agent message fields:
   - `text`: Should be in English (what agent sent)
   - `original_text`: Should be null
   - `translated_text`: Should be null
   - `source_lang`: Should be "en"
   - `target_lang`: Should be "en"
   - `agent_language`: Should be "en"
   - `sentiment`: Should be null
   - `sentiment_confidence`: Should be null

**Expected Results:**
- ✅ All fields populated correctly
- ✅ Sentiment only on customer messages
- ✅ Language metadata preserved

---

### Test 7: GHL Integration Verification

**Objective:** Verify GHL only receives English messages

**Steps:**
1. Complete Test 1 (Spanish conversation)
2. Log into GoHighLevel dashboard
3. Navigate to Conversations
4. Find the test conversation
5. Verify all customer messages appear in English
6. Verify all agent messages appear in English

**Expected Results:**
- ✅ GHL shows only English messages
- ✅ No Spanish/Portuguese/French text visible in GHL
- ✅ Conversation flows naturally in English from GHL perspective

---

### Test 8: Error Handling

**Objective:** Verify graceful error handling when translation fails

**Steps:**
1. Temporarily disable VERBUM_API_KEY in Vercel (or wait for API quota limit)
2. Open customer chat with Spanish language
3. Send message: "Hola"
4. Check if message still appears (should fallback to original text)
5. Check browser console for error logs
6. Re-enable VERBUM_API_KEY

**Expected Results:**
- ✅ Message still sent even if translation fails
- ✅ Error logged to console
- ✅ User not blocked from sending messages
- ✅ Graceful degradation to original language

---

### Test 9: Real-time Translation Performance

**Objective:** Verify translation doesn't cause noticeable delays

**Steps:**
1. Open customer chat with Spanish language
2. Send 5 messages rapidly:
   - "Hola"
   - "¿Cómo estás?"
   - "Necesito ayuda"
   - "Gracias"
   - "Adiós"
3. Measure time from send to appearance in agent dashboard
4. Agent sends 3 responses rapidly
5. Measure time from send to appearance in customer chat

**Expected Results:**
- ✅ Messages appear within 1-2 seconds
- ✅ No blocking or freezing
- ✅ Smooth user experience
- ✅ Messages appear in order

---

### Test 10: Multi-language Conversation Switching

**Objective:** Verify system handles language changes mid-conversation

**Steps:**
1. Start chat with Spanish language
2. Send message: "Hola"
3. Refresh page (simulating disconnect/reconnect)
4. Select Portuguese language
5. Send message: "Olá"
6. Check agent dashboard shows both messages in English
7. Check conversation maintains continuity

**Expected Results:**
- ✅ Language change handled gracefully
- ✅ Previous messages still visible
- ✅ New messages use new language
- ✅ Agent sees all messages in English

---

## Debugging Checklist

If tests fail, check:

1. **Environment Variables:**
   - ✅ VERBUM_API_KEY set in Vercel
   - ✅ NEXT_PUBLIC_APP_URL correct
   - ✅ Supabase credentials correct

2. **Browser Console:**
   - ✅ No JavaScript errors
   - ✅ Translation API calls successful (200 status)
   - ✅ Sentiment API calls successful (200 status)

3. **Network Tab:**
   - ✅ `/api/verbum/translate` returns translations
   - ✅ `/api/verbum/sentiment` returns sentiment data
   - ✅ GHL webhook receives English text

4. **Database:**
   - ✅ Migration applied successfully
   - ✅ Translation fields exist
   - ✅ Data populating correctly

5. **Vercel Logs:**
   - ✅ No deployment errors
   - ✅ No runtime errors
   - ✅ Translation logs showing correct flow

---

## Success Criteria

All tests pass with:
- ✅ Customer messages translated to English before GHL
- ✅ Agent messages translated to customer language before display
- ✅ GHL only receives/sends English
- ✅ Agent dashboard shows English only
- ✅ Customer chat shows customer's language only
- ✅ Sentiment analysis working on customer messages
- ✅ No translation errors or delays
- ✅ Database storing correct metadata
- ✅ Graceful error handling

---

## Next Steps After Testing

1. Monitor production usage for translation accuracy
2. Collect feedback from agents on translation quality
3. Monitor Verbum API usage and costs
4. Consider caching frequently translated phrases
5. Add translation quality feedback mechanism
6. Implement language auto-detection (future enhancement)
7. Add support for agent language preferences (future enhancement)
