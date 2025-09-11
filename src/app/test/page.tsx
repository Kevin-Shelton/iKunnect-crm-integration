'use client';

import React, { useEffect } from 'react';
import { MessageCircle, ArrowRight, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestPage() {
  useEffect(() => {
    // Load GoHighLevel chat widget
    const script = document.createElement('script');
    script.src = 'https://beta.leadconnectorhq.com/loader.js';
    script.setAttribute('data-resources-url', 'https://beta.leadconnectorhq.com/chat-widget/loader.js');
    script.setAttribute('data-widget-id', '687885d4b081f571130f33e8');
    script.async = true;
    
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <TestTube className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Chat Widget Test Page</h1>
          </div>
          <p className="text-lg text-gray-600">
            Test the complete GoHighLevel MCP integration flow
          </p>
          <Badge variant="outline" className="mt-2">
            Widget ID: 687885d4b081f571130f33e8
          </Badge>
        </div>

        {/* Test Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span>End-to-End Testing Instructions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Customer Side (This Page)</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
                    <span>Look for the chat widget in the bottom-right corner</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
                    <span>Click the chat widget to open it</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
                    <span>Type a test message (e.g., &quot;Hello, I need help with my account&quot;)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">4</span>
                    <span>Send the message and wait for response</span>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Agent Side (Chat Desk)</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="bg-green-100 text-green-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
                    <span>Open the Agent Chat Desk in another tab</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-green-100 text-green-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
                    <span>Check the &quot;Waiting&quot; queue for new conversations</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-green-100 text-green-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
                    <span>Claim the conversation and open it</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-green-100 text-green-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">4</span>
                    <span>Use AI assistant to generate a response</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-green-100 text-green-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">5</span>
                    <span>Send the response back to the customer</span>
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expected Flow */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowRight className="w-5 h-5 text-green-600" />
              <span>Expected Integration Flow</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900">Customer Message</h4>
                <p className="text-sm text-gray-600">GoHighLevel Widget</p>
              </div>
              
              <ArrowRight className="w-6 h-6 text-gray-400" />
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-purple-600 font-bold text-lg">MCP</span>
                </div>
                <h4 className="font-medium text-gray-900">MCP Server</h4>
                <p className="text-sm text-gray-600">Message Processing</p>
              </div>
              
              <ArrowRight className="w-6 h-6 text-gray-400" />
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-green-600 font-bold text-lg">iK</span>
                </div>
                <h4 className="font-medium text-gray-900">Agent Chat Desk</h4>
                <p className="text-sm text-gray-600">Agent Response</p>
              </div>
              
              <ArrowRight className="w-6 h-6 text-gray-400" />
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                  <MessageCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h4 className="font-medium text-gray-900">Customer Receives</h4>
                <p className="text-sm text-gray-600">Real-time Response</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => window.open('/', '_blank')}
              >
                Open Agent Chat Desk
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('/customer', '_blank')}
              >
                Open Customer Page
              </Button>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Reload Chat Widget
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <strong>Scenario 1:</strong> General inquiry<br />
                  <em>&quot;Hi, I have a question about your services&quot;</em>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <strong>Scenario 2:</strong> Support request<br />
                  <em>&quot;I&apos;m having trouble with my account login&quot;</em>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <strong>Scenario 3:</strong> Sales inquiry<br />
                  <em>&quot;I&apos;d like to know more about your pricing plans&quot;</em>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Chat Widget Active</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Widget ID: 687885d4b081f571130f33e8 | Environment: Beta
          </p>
        </div>
      </div>
    </div>
  );
}

