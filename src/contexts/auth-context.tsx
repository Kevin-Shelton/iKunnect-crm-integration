'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'supervisor' | 'admin';
  permissions: string[];
  status: 'available' | 'busy' | 'away' | 'offline';
  avatar?: string;
  department?: string;
  extension?: string;
}

interface AuthContextType {
  agent: Agent | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateAgentStatus: (status: Agent['status']) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Mock agent data for standalone testing
const mockAgent: Agent = {
  id: 'agent-001',
  name: 'Agent Smith',
  email: 'agent.smith@ikunnect.com',
  role: 'agent',
  permissions: [
    'chat.read',
    'chat.write', 
    'contact.read',
    'contact.write',
    'ai.use',
    'escalate',
    'transfer'
  ],
  status: 'available',
  avatar: undefined,
  department: 'Customer Support',
  extension: '1001'
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with mock agent for standalone testing
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set mock agent
      setAgent(mockAgent);
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const updateAgentStatus = (status: Agent['status']) => {
    if (agent) {
      const updatedAgent = { ...agent, status };
      setAgent(updatedAgent);
      console.log(`Agent status updated to: ${status}`);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!agent) return false;
    return agent.permissions.includes(permission) || agent.role === 'admin';
  };

  const value: AuthContextType = {
    agent,
    isAuthenticated: !!agent,
    isLoading,
    updateAgentStatus,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking permissions
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

// Hook for agent status
export function useAgentStatus() {
  const { agent, updateAgentStatus } = useAuth();
  return {
    status: agent?.status || 'offline',
    updateStatus: updateAgentStatus
  };
}

