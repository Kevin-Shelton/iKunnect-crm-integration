# Translation & Sentiment Analysis Testing Guide

## ✅ System Deployed

All translation and sentiment analysis features have been implemented and deployed to production.

---

## 🧪 Testing Checklist

### 1. **Language Selector in Customer Form**

**Test:** Open customer chat page
- ✅ Language dropdown appears with globe icon
- ✅ Shows "Preferred Language" label
- ✅ Defaults to "English"
- ✅ Contains 133 languages
- ✅ Can select different language (e.g., Spanish, Portuguese, French)

**How to test:**
1. Go to `/customer-chat`
2. Look for language dropdown below phone field
3. Click dropdown and verify language list appears
4. Select "Spanish (Español)"

---

### 2. **Customer Message Translation (Customer → Agent)**

**Test:** Customer sends message in Spanish, agent sees English

**Steps:**
1. Open `/customer-chat`
2. Fill form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Language: **Spanish (Español)**
3. Click "Start Chat"
4. Type message in Spanish: `"Necesito ayuda con mi cuenta"`
5. Send message

**Expected in Agent Dashboard:**
- ✅ Message appears in English: "I need help with my account"
- ✅ Shows translation indicator: 🌐 "Translated from ES"
- ✅ "View original" button appears
- ✅ Clicking "View original" shows: "Necesito ayuda con mi cuenta"
- ✅ Sentiment badge appears (e.g., 😐 Neutral)

---

### 3. **Agent Message Translation (Agent → Customer)**

**Test:** Agent sends message in English, customer sees Spanish

**Steps:**
1. Agent types in dashboard: "How can I help you?"
2. Sends message

**Expected in Customer Chat:**
- ✅ Customer sees: "¿Cómo puedo ayudarte?"
- ✅ Message appears in customer's selected language
- ✅ No translation indicator shown to customer (seamless experience)

---

### 4. **Sentiment Analysis**

**Test:** Different sentiments are detected and displayed

**Test Messages:**

| Customer Message (English) | Expected Sentiment | Emoji |
|----------------------------|-------------------|-------|
| "I love your service!" | Positive | 😊 |
| "This is terrible, I'm very upset" | Negative | 😟 |
| "I have a question about my account" | Neutral | 😐 |
| "It's okay but could be better" | Mixed | 😕 |

**Expected in Agent Dashboard:**
- ✅ Sentiment badge appears below customer message
- ✅ Shows emoji + label + confidence %
- ✅ Color-coded background:
  - Green for Positive
  - Red for Negative
  - Gray for Neutral
  - Orange for Mixed

---

### 5. **Multi-Language Conversation**

**Test:** Full conversation in non-English language

**Steps:**
1. Customer selects **Portuguese (Português)**
2. Customer: "Olá, preciso de ajuda"
3. Agent sees: "Hello, I need help"
4. Agent replies: "Sure, what do you need?"
5. Customer sees: "Claro, o que você precisa?"

**Expected:**
- ✅ All messages translated correctly
- ✅ Conversation flows naturally
- ✅ Sentiment detected on Portuguese messages
- ✅ Translation indicators in agent view only

---

### 6. **Error Handling**

**Test:** Translation fails gracefully

**Scenario:** Verbum API is down or rate-limited

**Expected:**
- ✅ Original message still appears
- ✅ No error shown to user
- ✅ Conversation continues normally
- ✅ Error logged to console (check Vercel logs)

---

### 7. **Same Language (No Translation)**

**Test:** Customer selects English, agent uses English

**Steps:**
1. Customer language: **English**
2. Customer: "Hello, I need help"
3. Agent: "How can I assist you?"

**Expected:**
- ✅ No translation occurs
- ✅ No translation indicator shown
- ✅ Messages appear instantly (no API delay)
- ✅ Sentiment still analyzed and shown

---

## 🔍 Where to Check Results

### Customer View (`/customer-chat`)
- Language selector in form
- Messages in selected language
- No translation indicators
- Clean, seamless experience

### Agent Dashboard (`/`)
- Messages in English (translated if needed)
- Sentiment badges on customer messages
- Translation indicators with "View original"
- Emoji + color-coded sentiment

### Vercel Logs
```
[iKunnect CRM Webhook] Translated message: es -> en
[iKunnect CRM Webhook] Sentiment: positive ( 0.85 )
```

### Supabase Database
Check `chat_events` table for:
- `original_text` - Original message
- `translated_text` - Translated version
- `source_lang` - e.g., "es"
- `target_lang` - e.g., "en"
- `sentiment` - positive/negative/neutral/mixed
- `sentiment_confidence` - 0.00 to 1.00
- `customer_language` - Customer's language
- `agent_language` - Agent's language

---

## 🐛 Troubleshooting

### Translation Not Working
1. Check Vercel environment variable: `VERBUM_API_KEY` is set
2. Check Vercel logs for API errors
3. Verify customer language was saved (check sessionStorage)
4. Test Verbum API directly: `/api/verbum/translate`

### Sentiment Not Showing
1. Check if message is from customer (only customer messages get sentiment)
2. Verify sentiment field in database
3. Check console for sentiment API errors
4. Test sentiment API: `/api/verbum/sentiment`

### Language Dropdown Not Appearing
1. Hard refresh page (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify `/src/lib/languages.ts` is deployed

---

## 📊 Success Criteria

✅ Customer can select from 133 languages  
✅ Messages translate bidirectionally (customer ↔ agent)  
✅ Sentiment analysis works on customer messages  
✅ Sentiment badges show emoji + color + confidence  
✅ Translation indicators appear in agent view  
✅ "View original" shows untranslated text  
✅ System falls back to original text if translation fails  
✅ No errors block message delivery  
✅ Same-language conversations work without translation  
✅ Database stores all translation and sentiment data  

---

## 🎯 Next Steps After Testing

1. Monitor Verbum API usage and costs
2. Adjust sentiment thresholds if needed
3. Add more languages if requested
4. Consider caching translations for repeated phrases
5. Add agent language selection (currently hardcoded to "en")
6. Implement translation for conversation history (currently only new messages)

---

**All systems are live and ready to test!** 🚀
