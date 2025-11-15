# Fixes Applied - November 15, 2025

## Checkpoint Created
**Git Tag:** `checkpoint-constraint-fixed`
**Commit:** dac92e5

This checkpoint represents the working state after the database constraint was fixed to allow `ai_agent_send` and `human_agent_send` message types.

---

## Issues Fixed

### 1. ✅ System Messages Being Stored Incorrectly

**Problem:** "Customer started a new chat" messages from GHL were being stored with incorrect sender types (both 'customer' and 'ai_agent'), creating confusion in the UI.

**Solution:** Added system message filtering in webhook handler (`/src/app/api/webhook/ghl/route.ts`):
- Filters out messages containing: "Customer started a new chat", "Conversation started", "Chat started"
- Returns status 'ignored' with reason 'system message filtered'
- Prevents these non-user messages from cluttering the database and UI

**Files Modified:**
- `/src/app/api/webhook/ghl/route.ts` (lines 83-94)

---

### 2. ✅ Duplicate Messages in Chat Interface

**Problem:** Same message appearing 3 times in succession in the chat window, creating a poor user experience.

**Solution:** Implemented client-side deduplication in SimpleMessages component (`/src/components/chat/simple-messages.tsx`):
- Deduplicates by message ID (primary check)
- Deduplicates by text + sender + timestamp (within 1 second window)
- Logs filtered duplicates to console for debugging
- Applied before rendering, so UI only shows unique messages

**Files Modified:**
- `/src/components/chat/simple-messages.tsx` (lines 217-233)

---

### 3. ✅ Inefficient Database Queries

**Problem:** System was pulling ALL 117+ conversations from database on every request, which will become slower as the database grows.

**Solution:** Added pagination support to conversation queries (`/src/lib/supabase-conversations.ts`):
- Added `limit` parameter (default: 100) to `getAllConversationsWithStatus()`
- Changed query to limit results to `limit * 10` events (enough to cover multiple messages per conversation)
- Prevents full table scans as database grows
- Can be further optimized with offset-based pagination if needed

**Files Modified:**
- `/src/lib/supabase-conversations.ts` (lines 126, 135-139)

---

### 4. ✅ Truncated Last Message Text

**Problem:** Last message text in conversation list was truncated at 30 characters ("hello can you help me understa"), making it hard to understand conversation context.

**Solution:** Increased substring limit in conversation logging (`/src/app/api/chat/conversations/route.ts`):
- Changed from `.substring(0, 30)` to `.substring(0, 100)`
- Added fallback to empty string if text is null/undefined
- Provides better context in logs and debugging

**Files Modified:**
- `/src/app/api/chat/conversations/route.ts` (line 28)

---

## Testing Recommendations

1. **Test System Message Filtering:**
   - Start a new chat in GHL
   - Verify "Customer started a new chat" does NOT appear in iKunnect dashboard
   - Check webhook logs to confirm message is filtered with status 'ignored'

2. **Test Duplicate Prevention:**
   - Send messages in GHL
   - Verify each message appears only ONCE in both agent dashboard and customer chat
   - Check browser console for "[SimpleMessages] Filtered duplicate message" logs

3. **Test Query Performance:**
   - Monitor database query times in Vercel logs
   - Verify conversations load quickly even with 100+ conversations
   - Check that recent conversations appear first

4. **Test Full Message Text:**
   - Send longer messages (50+ characters)
   - Verify full text is visible in conversation list
   - Check that text is not truncated prematurely

---

## Deployment

**Status:** ✅ Pushed to GitHub (commit 511d6a9)

Changes will be automatically deployed to Vercel. Monitor deployment at:
- https://vercel.com/your-project/deployments

**Expected Behavior After Deployment:**
- No more "Customer started a new chat" messages in UI
- No duplicate messages in chat windows
- Faster conversation list loading
- Full message text visible in logs

---

## Rollback Instructions

If issues occur, rollback to checkpoint:

```bash
git checkout checkpoint-constraint-fixed
git push origin main --force
```

Or rollback to specific commit:

```bash
git revert 511d6a9
git push origin main
```

---

## Next Steps (Future Improvements)

1. **Add offset-based pagination** for conversation list API
2. **Implement real-time deduplication** at database level (webhook layer)
3. **Add database indexes** on `conversation_id` and `created_at` for faster queries
4. **Implement message caching** to reduce database hits
5. **Add monitoring/alerting** for duplicate message detection
