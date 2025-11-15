# Translation System Quick Reference

## 🎯 Critical Rule
**ALL communication with GHL must be in English. No exceptions.**

---

## 📊 Translation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER SIDE                            │
├─────────────────────────────────────────────────────────────┤
│  Customer types in Spanish: "Necesito ayuda"               │
│                          ↓                                  │
│  Translate to English: "I need help"                       │
│                          ↓                                  │
│  Send to GHL (English only)                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    GHL / DATABASE                           │
├─────────────────────────────────────────────────────────────┤
│  Store: "I need help" (English)                            │
│  Analyze sentiment: 😐 Neutral (85%)                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    AGENT SIDE                               │
├─────────────────────────────────────────────────────────────┤
│  Agent sees: "I need help" (English)                       │
│  With badge: 😐 Neutral 85%                                │
│                          ↓                                  │
│  Agent responds: "How can I help?"                         │
│                          ↓                                  │
│  Send to GHL (English)                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER SIDE                            │
├─────────────────────────────────────────────────────────────┤
│  Receive from GHL: "How can I help?"                       │
│                          ↓                                  │
│  Translate to Spanish: "¿Cómo puedo ayudar?"              │
│                          ↓                                  │
│  Customer sees: "¿Cómo puedo ayudar?"                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Components

### Customer Chat (`/customer-chat`)
- **Language Selector:** 133 languages available
- **Outgoing Messages:** Translate customer language → English → Send to GHL
- **Incoming Messages:** Receive from GHL (English) → Translate to customer language → Display
- **Display:** Always shows messages in customer's selected language

### Agent Dashboard (`/agent-dashboard`)
- **Display:** Always shows messages in English
- **Sentiment Badges:** Only on customer messages
- **No Translation:** Agent works in English only

### Verbum API (`/api/verbum/*`)
- **Translation:** `/api/verbum/translate`
- **Sentiment:** `/api/verbum/sentiment`
- **Language Codes:** 2-letter ISO (en, es, pt, fr, de, etc.)

### GHL Webhook (`/api/webhook/ghl`)
- **Receives:** English messages only
- **Performs:** Sentiment analysis
- **Stores:** Metadata in database
- **No Translation:** Already in English

---

## 🗄️ Database Fields

### chat_events Table

| Field | Description | Example |
|-------|-------------|---------|
| `text` | Message text (English from GHL) | "I need help" |
| `original_text` | Original language text | null (client-side) |
| `translated_text` | Translated text | null (client-side) |
| `source_lang` | Source language code | "es" |
| `target_lang` | Target language code | "en" |
| `customer_language` | Customer's selected language | "es" |
| `agent_language` | Agent's language | "en" |
| `sentiment` | Sentiment value | "neutral" |
| `sentiment_confidence` | Confidence score | 0.85 |

---

## 😊 Sentiment Badges

| Sentiment | Emoji | Color | Example |
|-----------|-------|-------|---------|
| Positive | 😊 | Green | "Excellent service!" |
| Negative | 😟 | Red | "This is terrible!" |
| Neutral | 😐 | Gray | "What are your hours?" |
| Mixed | 😕 | Yellow | "Good but expensive" |

**Display:** Only in agent dashboard, only on customer messages

---

## 🌍 Supported Languages (Top 20)

1. English (en)
2. Spanish (es)
3. Portuguese (pt)
4. French (fr)
5. German (de)
6. Italian (it)
7. Dutch (nl)
8. Russian (ru)
9. Chinese (zh)
10. Japanese (ja)
11. Korean (ko)
12. Arabic (ar)
13. Hindi (hi)
14. Bengali (bn)
15. Urdu (ur)
16. Vietnamese (vi)
17. Turkish (tr)
18. Polish (pl)
19. Ukrainian (uk)
20. Thai (th)

**Total:** 133 languages (see `VERBUM_SUPPORTED_LANGUAGES.md`)

---

## ✅ Testing Checklist

### Quick Test (5 minutes)

1. ✅ Open customer chat, select Spanish
2. ✅ Send: "Necesito ayuda"
3. ✅ Check agent dashboard shows: "I need help" (English)
4. ✅ Check sentiment badge appears
5. ✅ Agent responds: "How can I help?"
6. ✅ Check customer sees: "¿Cómo puedo ayudar?" (Spanish)

### Full Test (30 minutes)

See `TRANSLATION_FLOW_TESTING.md` for comprehensive scenarios

---

## 🚨 Troubleshooting

### Customer messages showing in original language in agent dashboard
**Problem:** Translation not happening before GHL
**Solution:** Check customer chat translation logic in `sendMessage` function

### Agent messages showing in English to customer
**Problem:** Translation not happening after receiving from GHL
**Solution:** Check customer chat message loading and translation logic

### No sentiment badges
**Problem:** Sentiment analysis failing or not displaying
**Solution:** Check Verbum API key, check agent dashboard UI components

### GHL receiving non-English messages
**Problem:** Translation not happening before sending to GHL
**Solution:** Check customer chat `sendMessage` function, ensure translation before GHL API call

### Translation errors in console
**Problem:** Verbum API failing
**Solution:** Check VERBUM_API_KEY environment variable, check API quota

---

## 📝 Code Snippets

### Translate Customer Message to English (Before GHL)

```typescript
// In customer-chat/page.tsx - sendMessage function
if (customerLanguage !== 'en') {
  const translateResponse = await fetch('/api/verbum/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: messageText,
      source_lang: customerLanguage,
      target_lang: 'en'
    })
  });
  
  if (translateResponse.ok) {
    const { translation } = await translateResponse.json();
    messageToSend = translation; // Send English to GHL
  }
}
```

### Translate Agent Message to Customer Language (After GHL)

```typescript
// In customer-chat/page.tsx - loadMessages function
if (event.type === 'agent_send' && customerLanguage !== 'en') {
  const translateResponse = await fetch('/api/verbum/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: event.text,
      source_lang: 'en',
      target_lang: customerLanguage
    })
  });
  
  if (translateResponse.ok) {
    const { translation } = await translateResponse.json();
    displayText = translation; // Show customer language
  }
}
```

### Sentiment Analysis (Webhook)

```typescript
// In api/webhook/ghl/route.ts
const sentimentResponse = await fetch('/api/verbum/sentiment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: messageText, // English text
    language: 'en'
  })
});

if (sentimentResponse.ok) {
  const { sentiment, confidence } = await sentimentResponse.json();
  // Store in database
}
```

---

## 🔐 Environment Variables

### Required in Vercel

```bash
VERBUM_API_KEY=your_verbum_api_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_ghl_location_id
```

---

## 📚 Documentation Files

1. **TRANSLATION_FLOW_TESTING.md** - Comprehensive testing guide (10 test scenarios)
2. **TRANSLATION_IMPLEMENTATION_SUMMARY.md** - Complete implementation details
3. **TRANSLATION_QUICK_REFERENCE.md** - This document (quick reference)
4. **VERBUM_SUPPORTED_LANGUAGES.md** - Complete list of 133 supported languages
5. **supabase-migration-translation-FINAL.sql** - Database migration script

---

## 🎓 Best Practices

1. **Always Test Translation Flow**
   - Test with non-English language
   - Verify GHL receives English
   - Verify agent sees English
   - Verify customer sees their language

2. **Monitor Sentiment Accuracy**
   - Collect agent feedback
   - Review confidence scores
   - Adjust if needed

3. **Handle Errors Gracefully**
   - If translation fails, use original text
   - Log errors for monitoring
   - Don't block user communication

4. **Keep GHL English-Only**
   - Never send non-English to GHL
   - Translation happens client-side
   - GHL is the source of truth in English

5. **Preserve Audit Trail**
   - Store language metadata
   - Store sentiment data
   - Enable compliance and analysis

---

## 🚀 Deployment

```bash
# Commit changes
git add .
git commit -m "Your commit message"

# Push to GitHub (auto-deploys to Vercel)
git push origin main

# Verify deployment
# Check Vercel dashboard for deployment status
# Test translation flow after deployment
```

---

## 📞 Support

**Issues?**
1. Check Vercel logs for errors
2. Check Supabase logs for database issues
3. Review browser console for client-side errors
4. Test with `TRANSLATION_FLOW_TESTING.md` scenarios
5. Contact Verbum AI support for API issues

**Questions?**
- Review `TRANSLATION_IMPLEMENTATION_SUMMARY.md` for details
- Check code comments in source files
- Review this quick reference

---

**Last Updated:** November 15, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
