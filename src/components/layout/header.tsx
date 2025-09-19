'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  MessageSquare,
  Clock,
  Users,
  Keyboard,
  HelpCircle,
  BellOff,
  ChevronDown,
  Bug,
  ExternalLink,
  Monitor
} from 'lucide-react';
import { useAuth, useAgentStatus } from '@/contexts/auth-context';
import { useAlerts } from '@/components/alerts/alert-system';
import { 
  useKeyboardShortcuts, 
  createChatShortcuts, 
  createAgentShortcuts,
  useShortcutHelp 
} from '@/hooks/use-keyboard-shortcuts';

interface HeaderProps {
  agentName?: string;
  agentStatus?: 'available' | 'busy' | 'away' | 'offline';
  queueStats?: {
    waiting: number;
    assigned: number;
    total: number;
  };
  onStatusChange?: (status: 'available' | 'busy' | 'away' | 'offline') => void;
  onSearch?: (query: string) => void;
}

export function Header({ 
  agentName = 'Agent', 
  agentStatus = 'available',
  queueStats = { waiting: 0, assigned: 0, total: 0 },
  onStatusChange,
  onSearch 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const openDebugScreen = () => {
    window.open('/api/debug/chat-events', '_blank');
  };

  const openCustomerChatScreen = () => {
    // This would open a customer-facing chat interface
    // For now, we'll open the main interface in a new tab
    window.open('/', '_blank');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">
            iKunnect Agent Chat Desk
          </h1>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            v2.1 - FIXED
          </Badge>
          </div>
          
          {/* Queue Stats */}
          <div className="flex items-center space-x-4 ml-8">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {queueStats.waiting} Waiting
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {queueStats.assigned} Assigned
              </Badge>
            </div>
            <Badge variant="outline" className="text-gray-600 border-gray-200">
              {queueStats.total} Total
            </Badge>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations, contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>
        </div>

        {/* Right Section - Navigation, Agent Status and Controls */}
        <div className="flex items-center space-x-4">
          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openDebugScreen}
              className="flex items-center space-x-1"
            >
              <Bug className="h-4 w-4" />
              <span>Debug</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={openCustomerChatScreen}
              className="flex items-center space-x-1"
            >
              <Monitor className="h-4 w-4" />
              <span>Customer View</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center space-x-2">
            <Bell className={`h-4 w-4 ${soundEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              aria-label="Toggle sound notifications"
            />
          </div>

          {/* Agent Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agentStatus)}`} />
                <span className="text-sm font-medium">{getStatusText(agentStatus)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange?.('available')}>
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                Available
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.('busy')}>
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                Busy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.('away')}>
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                Away
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.('offline')}>
                <div className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
                Offline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Agent Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{agentName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
