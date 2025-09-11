'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Database,
  MessageSquare,
  Users,
  Settings
} from 'lucide-react';

interface DebugResult {
  success: boolean;
  timestamp: string;
  tests: {
    healthCheck: {
      success?: boolean;
      error?: string;
      [key: string]: unknown;
    };
    allConversations: {
      success?: boolean;
      data?: { items?: unknown[] };
      error?: string;
      [key: string]: unknown;
    };
    contacts: {
      success?: boolean;
      data?: { items?: unknown[] };
      error?: string;
      [key: string]: unknown;
    };
    environment: Record<string, boolean>;
  };
  mcpConfig: {
    baseUrl: string;
    hasToken: boolean;
    hasLocationId: boolean;
  };
}

export default function DebugPage() {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebugTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/mcp');
      const data = await response.json();
      
      if (data.success) {
        setDebugResult(data);
      } else {
        setError(data.error || 'Debug test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDebugTest();
  }, []);

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === true) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (success === false) return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusBadge = (success: boolean | undefined) => {
    if (success === true) return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    if (success === false) return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Unknown</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MCP Debug Console</h1>
              <p className="text-gray-600 mt-2">Test GoHighLevel MCP integration and troubleshoot connection issues</p>
            </div>
            <Button 
              onClick={runDebugTest} 
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Run Tests</span>
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-800 font-medium">Error: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-gray-600">Running MCP connection tests...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Results */}
        {debugResult && (
          <div className="space-y-6">
            {/* MCP Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>MCP Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Base URL</label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {debugResult.mcpConfig.baseUrl}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Integration Token</span>
                      {getStatusBadge(debugResult.mcpConfig.hasToken)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Location ID</span>
                      {getStatusBadge(debugResult.mcpConfig.hasLocationId)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environment Variables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Environment Variables</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(debugResult.tests.environment).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 font-mono">{key}</span>
                      {getStatusBadge(value as boolean)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Health Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(debugResult.tests.healthCheck?.success)}
                  <span>Health Check</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(debugResult.tests.healthCheck, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Conversations Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(debugResult.tests.allConversations?.success)}
                  <MessageSquare className="w-5 h-5" />
                  <span>Conversations Test</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {debugResult.tests.allConversations?.data?.items?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Conversations Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {getStatusIcon(debugResult.tests.allConversations?.success)}
                      </div>
                      <div className="text-sm text-gray-600">Connection Status</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {debugResult.tests.allConversations?.error ? '❌' : '✅'}
                      </div>
                      <div className="text-sm text-gray-600">Error Status</div>
                    </div>
                  </div>
                  
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                      View Raw Response
                    </summary>
                    <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto mt-2">
                      {JSON.stringify(debugResult.tests.allConversations, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>

            {/* Contacts Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(debugResult.tests.contacts?.success)}
                  <Users className="w-5 h-5" />
                  <span>Contacts Test</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {debugResult.tests.contacts?.data?.items?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Contacts Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {getStatusIcon(debugResult.tests.contacts?.success)}
                      </div>
                      <div className="text-sm text-gray-600">Connection Status</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {debugResult.tests.contacts?.error ? '❌' : '✅'}
                      </div>
                      <div className="text-sm text-gray-600">Error Status</div>
                    </div>
                  </div>
                  
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                      View Raw Response
                    </summary>
                    <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto mt-2">
                      {JSON.stringify(debugResult.tests.contacts, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/', '_blank')}
                    className="w-full"
                  >
                    Open Agent Desk
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/customer', '_blank')}
                    className="w-full"
                  >
                    Open Customer Page
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/test', '_blank')}
                    className="w-full"
                  >
                    Open Test Page
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timestamp */}
            <div className="text-center text-sm text-gray-500">
              Last updated: {new Date(debugResult.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

