# iKunnect Agent Chat Desk

A modern, Next.js 15-powered Agent Chat Desk interface for iKunnect agents to handle live conversations via GoHighLevel MCP integration.

## 🚀 Features

### ✅ **Implemented (Phase 1-3)**
- **Modern UI**: Built with Next.js 15, TailwindCSS, and shadcn/ui
- **Queue Management**: Real-time conversation queue with Waiting/Assigned/All tabs
- **Multi-Panel Layout**: Queue sidebar, chat area, and contact context
- **Contact Management**: Complete contact info, tags, opportunities, and appointments
- **SLA Monitoring**: Visual indicators for response time breaches
- **Conversation Claiming**: One-click claim functionality for agents
- **Toast Notifications**: Real-time feedback for all actions
- **Responsive Design**: Works on desktop and mobile devices

### 🚧 **In Development (Phase 4-10)**
- Multi-chat tabs (max 6 simultaneous conversations)
- Real-time messaging with AI assistant integration
- Keyboard shortcuts and accessibility features
- Authentication via iKunnect JWT
- WebSocket/SSE real-time updates
- Advanced queue filtering and search

## 🛠 Technology Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **State Management**: Zustand, React Query
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)
- **Backend**: Next.js API Routes
- **Integration**: GoHighLevel MCP API
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- GoHighLevel account with MCP access

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/Kevin-Shelton/iKunnect-crm-integration.git
cd iKunnect-crm-integration
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```env
# GoHighLevel MCP Configuration
GHL_MCP_BASE_URL=https://services.leadconnectorhq.com/mcp/
GHL_PRIVATE_INTEGRATION_TOKEN=your_private_integration_token_here
GHL_LOCATION_ID=your_location_id_here

# Application Configuration
NEXT_PUBLIC_APP_NAME=iKunnect Agent Chat Desk
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_POLLING_INTERVAL=3000
NEXT_PUBLIC_MAX_CHAT_TABS=6
```

### 3. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Production Build
```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes for MCP integration
│   │   ├── conversations/ # Conversation management
│   │   ├── contacts/      # Contact operations
│   │   └── health/        # Health check
│   ├── globals.css        # Global styles
│   └── page.tsx          # Main chat desk page
├── components/
│   ├── layout/           # Layout components
│   │   ├── header.tsx    # Top navigation bar
│   │   ├── sidebar.tsx   # Queue management sidebar
│   │   ├── contact-sidebar.tsx # Contact context panel
│   │   └── main-layout.tsx     # Main layout wrapper
│   └── ui/               # shadcn/ui components
├── hooks/
│   └── use-conversations.ts # Conversation data management
├── lib/
│   ├── mcp.ts           # GoHighLevel MCP client
│   ├── types.ts         # TypeScript definitions
│   └── utils.ts         # Utility functions
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/conversations` | GET | List conversations by queue |
| `/api/conversations/[id]/messages` | GET | Get conversation messages |
| `/api/conversations/[id]/send` | POST | Send message |
| `/api/conversations/[id]/claim` | POST | Claim conversation |
| `/api/conversations/[id]/ai-draft` | POST | Get AI message draft |
| `/api/contacts/[id]` | GET/PATCH | Contact operations |

## 🎯 Usage

### Agent Workflow
1. **Login**: Authenticate with iKunnect credentials
2. **Queue Management**: View waiting conversations in priority order
3. **Claim Conversations**: Click "Claim Chat" to assign conversations
4. **Multi-Chat**: Handle up to 6 simultaneous conversations
5. **AI Assistance**: Get AI-powered message suggestions
6. **Contact Actions**: Tag contacts, create opportunities, schedule callbacks

### Queue Priority
- **🔴 SLA Breach**: 10+ minutes wait time
- **🟡 SLA Warning**: 5-9 minutes wait time  
- **🟢 Normal**: <5 minutes wait time

## 🔧 Configuration

### Environment Variables
- `GHL_MCP_BASE_URL`: GoHighLevel MCP endpoint
- `GHL_PRIVATE_INTEGRATION_TOKEN`: Your PIT token
- `GHL_LOCATION_ID`: Your location identifier
- `NEXT_PUBLIC_POLLING_INTERVAL`: Auto-refresh interval (ms)
- `NEXT_PUBLIC_MAX_CHAT_TABS`: Maximum chat tabs

### SLA Settings
- Warning threshold: 5 minutes
- Breach threshold: 10 minutes
- Auto-refresh: 3 seconds

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Manual Deployment
```bash
npm run build
# Deploy the .next folder to your hosting provider
```

## 🧪 Development

### Mock Data
The application includes comprehensive mock data for development:
- Sample conversations with different SLA statuses
- Contact information with tags and opportunities
- Realistic message threads and timestamps

### Testing
```bash
npm run lint        # ESLint
npm run type-check  # TypeScript checking
```

## 📈 Roadmap

### Phase 4: Queue Management Enhancement
- [ ] Real API integration
- [ ] Advanced filtering and sorting
- [ ] Bulk operations

### Phase 5: Multi-Chat Interface  
- [ ] Tab management (max 6 tabs)
- [ ] Keyboard shortcuts (Alt+1-6)
- [ ] Unread indicators

### Phase 6: Messaging Components
- [ ] Real-time message threads
- [ ] File attachments
- [ ] Emoji support

### Phase 7: AI Assistant
- [ ] OpenAI integration
- [ ] Auto-reply mode
- [ ] Message drafting

### Phase 8: Contact Actions
- [ ] Opportunity management
- [ ] Appointment scheduling
- [ ] Escalation workflows

### Phase 9: Authentication & Alerts
- [ ] JWT authentication
- [ ] Sound notifications
- [ ] SLA breach alerts

### Phase 10: Production Ready
- [ ] Performance optimization
- [ ] Error handling
- [ ] Analytics integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: Kevin Shelton (CIO/CTO)

---

**Built with ❤️ for iKunnect Agents**

