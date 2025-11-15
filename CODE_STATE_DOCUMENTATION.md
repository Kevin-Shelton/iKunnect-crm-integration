# iKunnect Code State Documentation

**Date:** November 15, 2025  
**Status:** ✅ Stable and Documented  
**Git Checkpoint:** `checkpoint-ai-agent-working`

---

## 1. Introduction

This document provides a comprehensive overview of the iKunnect application's codebase as of the `checkpoint-ai-agent-working` tag. It is intended to serve as a reference for future development, ensuring that the current stable state is well-understood and can be built upon without regression.

---

## 2. Core Concepts & Logic

The application is built on a modern Next.js stack and integrates deeply with GoHighLevel (GHL) for its CRM and communication capabilities. The key logic revolves around a few critical user flows and API interactions.

### 2.1. Customer Chat Initiation

This is the most crucial and recently refined part of the application.

1.  **Entry Point:** The user journey begins at `/src/app/customer-chat/page.tsx`. This page contains the form where customers enter their contact details.

2.  **Form Submission:** Upon submission, the `startChat` function is called. This function makes a `POST` request to our own backend at `/api/chat/start`.

3.  **Backend Chat Start (`/api/chat/start/route.ts`):** This is the heart of the initiation process.
    *   It receives the customer's contact information.
    *   It calls `upsertContact` (from `/lib/ghl-api-client.ts`) to create or update the contact in GHL.
    *   It calls `getOrCreateConversation` to establish a conversation record in GHL.
    *   **Crucially, it then calls `sendInboundMessage` with the message `initiating chat`.** This simulates the customer sending the first message, which is the key to triggering GHL's AI Agent.

### 2.2. GHL AI Agent Engagement

-   With the `initiating chat` message sent as an **inbound** message, GHL's native AI Agent (configured in the GHL dashboard) automatically takes over the conversation.
-   It sends its own greeting and engages the customer directly.
-   **This completely removes the need for a GHL workflow for greetings.**

### 2.3. Real-Time Message Sync

-   **GHL Webhook:** All messages (from the AI and the customer) trigger the `InboundMessage` webhook that GHL sends to `/api/webhook/ghl`.
-   **Webhook Handler (`/api/webhook/ghl/route.ts`):** This endpoint receives the webhook, normalizes the data, and stores it in our Supabase database via the `chat_events` table.
-   **Agent Desk Polling:** The agent dashboard at `/src/app/page.tsx` polls the `/api/chat/conversations` endpoint every few seconds.
-   **Conversations API (`/api/chat/conversations/route.ts`):** This API fetches the latest conversation data from Supabase, including the last message and status, and sends it to the agent dashboard.

### 2.4. UI Filtering and Deduplication

To maintain a clean user experience, several layers of filtering are applied:

-   **`initiating chat` Message:**
    *   Filtered from the customer's view in `/app/customer-chat/page.tsx`.
    *   Filtered from the agent's main chat view in `/components/chat/simple-messages.tsx`.
    *   Filtered from the agent's conversation list preview in `/api/chat/conversations/route.ts`.
-   **Duplicate Messages:**
    *   The root cause (multiple webhooks) was resolved by disabling the `ConversationUnreadUpdate` webhook in GHL.
    *   Client-side deduplication logic still exists in `/components/chat/simple-messages.tsx` as a fallback.

---

## 3. Key Files and Responsibilities

| File Path                                        | Responsibility                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/src/app/customer-chat/page.tsx`                | **Customer Chat UI:** Renders the chat interface for the customer. Handles form submission and polls for new messages.                      |
| `/src/app/api/chat/start/route.ts`               | **Chat Initiation API:** Creates the contact in GHL and sends the hidden `initiating chat` message to trigger the AI.                     |
| `/src/lib/ghl-api-client.ts`                     | **GHL API Client:** Contains all functions for direct interaction with the GHL API, including `upsertContact` and `sendInboundMessage`.      |
| `/src/app/api/webhook/ghl/route.ts`              | **GHL Webhook Handler:** Receives all incoming message events from GHL and saves them to the database.                                    |
| `/src/app/page.tsx`                             | **Agent Desk UI:** The main dashboard for agents to view and manage conversations.                                                          |
| `/src/app/api/chat/conversations/route.ts`       | **Conversations API:** Provides the agent desk with a list of all active conversations and their latest status. Filters preview messages. |
| `/src/components/chat/simple-messages.tsx`        | **Message Display Component:** Renders the chat history for both agents and customers. Contains logic to filter and deduplicate messages. |
| `/src/lib/supabase-conversations.ts`             | **Supabase Queries:** Contains the database logic for fetching and organizing conversation data from the Supabase backend.                 |

---

## 4. Project File Structure

```
./.env.example
./.eslintrc.json
./.gitignore
./.prettierrc.json
./AUTOMATED_GREETING_IMPLEMENTATION.md
./CODE_STATE_DOCUMENTATION.md
./FIXES_APPLIED.md
./GHL_WORKFLOW_SETUP.md
./GHL_WORKFLOW_UPDATED_INSTRUCTIONS.md
./README.md
./SYSTEM_ARCHITECTURE.md
./WORKFLOW_TROUBLESHOOTING.md
./components.json
./middleware.ts
./next-env.d.ts
./next.config.mjs
./package.json
./pnpm-lock.yaml
./postcss.config.mjs
./public/customer-chat-standalone.html
./public/customer-chat.html
./public/customer-chat.js
./public/favicon.ico
./public/globals.css
./public/index.html
./public/next.svg
./public/vercel.svg
./src/app/api/chat/conversations/route.ts
./src/app/api/chat/send-ghl/route.ts
./src/app/api/chat/start/route.ts
./src/app/api/conversations-simple/route.ts
./src/app/api/conversations/[id]/messages/route.ts
./src/app/api/conversations/[id]/request-suggestions/route.ts
./src/app/api/conversations/[id]/route.ts
./src/app/api/conversations/[id]/send/route.ts
./src/app/api/conversations/[id]/suggestions/route.ts
./src/app/api/conversations/route.ts
./src/app/api/debug/chat-events/route.ts
./src/app/api/debug/conversations/route.ts
./src/app/api/debug/env-comprehensive/route.ts
./src/app/api/debug/env-vars/route.ts
./src/app/api/debug/env/route.ts
./src/app/api/debug/mcp/route.ts
./src/app/api/debug/memory-storage/route.ts
./src/app/api/debug/memory/route.ts
./src/app/api/debug/messages/[id]/route.ts
./src/app/api/debug/seed-storage/route.ts
./src/app/api/debug/storage/route.ts
./src/app/api/debug/supabase/route.ts
./src/app/api/debug/webhook-analysis/route.ts
./src/app/api/desk/health/route.ts
./src/app/api/desk/last/route.ts
./src/app/api/desk/tap/route.ts
./src/app/api/diagnostics/report/[sessionId]/route.ts
./src/app/api/diagnostics/start/route.ts
./src/app/api/ghl-api-2.0-send-message/route.ts
./src/app/api/ghl-oauth-callback/route.ts
./src/app/api/ghl-oauth-init/route.ts
./src/app/api/ghl-send-message/route.ts
./src/app/api/health/route.ts
./src/app/api/livechat/init/route.ts
./src/app/api/livechat/send/route.ts
./src/app/api/mcp/ghl/route.ts
./src/app/api/oauth/callback/route.ts
./src/app/api/sse/route.ts
./src/app/api/test-chat-event/route.ts
./src/app/api/test-normalized-events/route.ts
./src/app/api/test-supabase/route.ts
./src/app/api/validate-step4/route.ts
./src/app/api/validate/route.ts
./src/app/api/webhook/ghl/route.ts
./src/app/api/ws/route.ts
./src/app/customer-chat/page.tsx
./src/app/customer/chat/page.tsx
./src/app/customer/layout.tsx
./src/app/customer/page.tsx
./src/app/debug-env/page.tsx
./src/app/debug/page.tsx
./src/app/error.tsx
./src/app/favicon.ico
./src/app/globals.css
./src/app/layout.tsx
./src/app/loading.tsx
./src/app/not-found.tsx
./src/app/page.tsx
./src/app/test/layout.tsx
./src/app/test/page.tsx
./src/app/tracing/page.tsx
./src/components/alerts/alert-system.tsx
./src/components/chat/agent-assist.tsx
./src/components/chat/agent-reply.tsx
./src/components/chat/ai-assistant.tsx
./src/components/chat/chat-interface-new.tsx
./src/components/chat/chat-interface.tsx
./src/components/chat/chat-tabs.tsx
./src/components/chat/draggable-multi-chat.tsx
./src/components/chat/enhanced-waiting-queue.tsx
./src/components/chat/message-thread.tsx
./src/components/chat/multi-chat-interface.tsx
./src/components/chat/notification-system.tsx
./src/components/chat/pre-chat-identity-form.tsx
./src/components/chat/real-time-messages.tsx
./src/components/chat/rejected-chat-queue.tsx
./src/components/chat/simple-messages.tsx
./src/components/chat/typing-indicator.tsx
./src/components/chat/vertical-multi-chat.tsx
./src/components/contact/activity-timeline.tsx
./src/components/contact/contact-actions.tsx
./src/components/contact/contact-notes.tsx
./src/components/debug/conversation-debug.tsx
./src/components/debug/sidebar-debug.tsx
./src/components/layout/contact-sidebar.tsx
./src/components/layout/empty-state.tsx
./src/components/layout/header.tsx
./src/components/layout/main-layout.tsx
./src/components/layout/sidebar.tsx
./src/components/ui/alert.tsx
./src/components/ui/avatar.tsx
./src/components/ui/badge.tsx
./src/components/ui/button.tsx
./src/components/ui/card.tsx
./src/components/ui/dialog.tsx
./src/components/ui/dropdown-menu.tsx
./src/components/ui/input.tsx
./src/components/ui/label.tsx
./src/components/ui/scroll-area.tsx
./src/components/ui/select.tsx
./src/components/ui/separator.tsx
./src/components/ui/sonner.tsx
./src/components/ui/switch.tsx
./src/components/ui/tabs.tsx
./src/components/ui/textarea.tsx
./src/contexts/auth-context.tsx
./src/hooks/use-conversations.ts
./src/hooks/use-keyboard-shortcuts.ts
./src/lib/chat-events.ts
./src/lib/chat-storage.ts
./src/lib/chatStorage.ts
./src/lib/customer-identification.ts
./src/lib/diagnostics.ts
./src/lib/ghl-api-2.0-db.ts
./src/lib/ghl-api-2.0-integration.ts
./src/lib/ghl-api-2.0.ts
./src/lib/ghl-api-client.ts
./src/lib/ghl-token-storage.ts
./src/lib/hmac.ts
./src/lib/logger.ts
./src/lib/mcp-client.ts
./src/lib/mcp.ts
./src/lib/memory-storage.ts
./src/lib/memoryStorage.ts
./src/lib/memoryStorageSingleton.ts
./src/lib/modern-theme.ts
./src/lib/name-extraction.ts
./src/lib/normalize.ts
./src/lib/persistent-storage.ts
./src/lib/productionStorage.ts
./src/lib/ring.ts
./src/lib/safe.ts
./src/lib/schemas.ts
./src/lib/simpleStorage.ts
./src/lib/sse-service.ts
./src/lib/storage.ts
./src/lib/supabase-conversations.ts
./src/lib/supabase.ts
./src/lib/trace.ts
./src/lib/types.ts
./src/lib/unifiedStorage.ts
./src/lib/utils.ts
./src/lib/websocket-service.ts
./supabase-migration-add-agent-types.sql
./supabase-schema.sql
./test-chat-events.js
./test-concurrent-conversations.js
./test-endpoints.js
./test-message-content-processing.js
./test-safe-endpoints.js
./test-tracing-system.js
./tsconfig.json
./vercel.json
```
