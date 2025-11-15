'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface Tap {
  t: string;
  route: string;
  traceId: string;
  note: string;
  data?: any;
}

interface ConversationSummary {
  id: string;
  updatedAt: number;
  messageCount: number;
  suggestionCount: number;
  lastText: string;
}

interface DebugData {
  ok: boolean;
  taps: Tap[];
  conversations: ConversationSummary[];
}

export default function TracingPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [testNote, setTestNote] = useState('manual_test');
  const [testPayload, setTestPayload] = useState('{"test": "data"}');
  const [diagnosticSession, setDiagnosticSession] = useState<string | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);

  const fetchDebugData = async () => {
    try {
      const [debugRes, healthRes] = await Promise.all([
        fetch('/api/desk/last'),
        fetch('/api/desk/health')
      ]);
      
      const debugData = await debugRes.json();
      const healthData = await healthRes.json();
      
      setDebugData(debugData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
    }
  };

  const sendTestTap = async () => {
    setLoading(true);
    try {
      const traceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await fetch('/api/desk/tap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': traceId
        },
        body: JSON.stringify({
          note: testNote,
          payload: JSON.parse(testPayload)
        })
      });
      await fetchDebugData();
    } catch (error) {
      console.error('Failed to send test tap:', error);
    }
    setLoading(false);
  };

  const clearTaps = async () => {
    try {
      await fetch('/api/desk/last', { method: 'DELETE' });
      await fetchDebugData();
    } catch (error) {
      console.error('Failed to clear taps:', error);
    }
  };

  const startDiagnosticSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/diagnostics/start', { method: 'POST' });
      const data = await response.json();
      if (data.ok) {
        setDiagnosticSession(data.sessionId);
        setDiagnosticReport(null);
        alert(`Diagnostic session started: ${data.sessionId}\n\nNow initiate your live chat from GoHighLevel!`);
      } else {
        alert(`Failed to start session: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to start diagnostic session:', error);
      alert('Failed to start diagnostic session');
    }
    setLoading(false);
  };

  const getDiagnosticReport = async () => {
    if (!diagnosticSession) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/diagnostics/report/${diagnosticSession}`);
      const data = await response.json();
      if (data.ok) {
        setDiagnosticReport(data.report);
      } else {
        alert(`Failed to get report: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to get diagnostic report:', error);
      alert('Failed to get diagnostic report');
    }
    setLoading(false);
  };

  const copyReportToClipboard = () => {
    if (diagnosticReport) {
      navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
      alert('Diagnostic report copied to clipboard!');
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDebugData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  const getRouteColor = (route: string) => {
    if (route.includes('chat-events')) return 'bg-blue-100 text-blue-800';
    if (route.includes('chat-assist')) return 'bg-green-100 text-green-800';
    if (route.includes('chat-history')) return 'bg-purple-100 text-purple-800';
    if (route.includes('chat-admin')) return 'bg-orange-100 text-orange-800';
    if (route.includes('conversations')) return 'bg-cyan-100 text-cyan-800';
    if (route.includes('tap')) return 'bg-gray-100 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tracing Dashboard</h1>
          <p className="text-gray-600 mt-2">Complete visibility from n8n → Vercel → Agent Desk</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
          >
            {autoRefresh ? "Auto Refresh ON" : "Auto Refresh OFF"}
          </Button>
          <Button onClick={fetchDebugData}>Refresh</Button>
          <Button onClick={clearTaps} variant="destructive">Clear Taps</Button>
        </div>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            System Health
            {health?.ok && <Badge className="bg-green-100 text-green-800">Online</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-mono">{health?.ok ? "✅ OK" : "❌ Error"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Last Check</div>
              <div className="font-mono">{health?.ts ? formatTime(health.ts) : "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Taps</div>
              <div className="font-mono">{debugData?.taps?.length || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Conversations</div>
              <div className="font-mono">{debugData?.conversations?.length || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Live Chat Diagnostics
            {diagnosticSession && <Badge className="bg-green-100 text-green-800">Session Active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={startDiagnosticSession} 
              disabled={loading || !!diagnosticSession}
              className="w-full"
            >
              {loading ? "Starting..." : "Start Diagnostic Session"}
            </Button>
            <Button 
              onClick={getDiagnosticReport} 
              disabled={loading || !diagnosticSession}
              variant="outline"
              className="w-full"
            >
              {loading ? "Getting Report..." : "Get Report"}
            </Button>
            <Button 
              onClick={copyReportToClipboard} 
              disabled={!diagnosticReport}
              variant="outline"
              className="w-full"
            >
              Copy Report
            </Button>
          </div>
          
          {diagnosticSession && (
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm font-medium">Active Session: {diagnosticSession}</p>
              <p className="text-xs text-gray-600 mt-1">
                Now initiate your live chat from GoHighLevel. The system is capturing all data automatically.
              </p>
            </div>
          )}
          
          {diagnosticReport && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Diagnostic Report</h4>
                <Badge className={diagnosticReport.diagnosis?.overallHealth === 'HEALTHY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {diagnosticReport.diagnosis?.overallHealth || 'UNKNOWN'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium">{diagnosticReport.diagnosis?.webhookWorking ? '✅' : '❌'}</div>
                  <div className="text-gray-600">Webhook</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{diagnosticReport.diagnosis?.n8nFlowComplete ? '✅' : '❌'}</div>
                  <div className="text-gray-600">n8n Flow</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{diagnosticReport.diagnosis?.mirrorEndpointsWorking ? '✅' : '❌'}</div>
                  <div className="text-gray-600">Mirror Endpoints</div>
                </div>
              </div>
              
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-blue-600">
                  View Full Report JSON
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto max-h-64">
                  {JSON.stringify(diagnosticReport, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Tap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Note</label>
              <Input 
                value={testNote}
                onChange={(e) => setTestNote(e.target.value)}
                placeholder="test_note"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payload (JSON)</label>
              <Textarea 
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                placeholder='{"test": "data"}'
                rows={3}
              />
            </div>
          </div>
          <Button onClick={sendTestTap} disabled={loading}>
            {loading ? "Sending..." : "Send Test Tap"}
          </Button>
        </CardContent>
      </Card>

      {/* Conversations Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations ({debugData?.conversations?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {debugData?.conversations?.length ? (
            <div className="space-y-2">
              {debugData.conversations.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-mono text-sm">{conv.id}</div>
                    <div className="text-sm text-gray-500">{conv.lastText}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {conv.messageCount} messages, {conv.suggestionCount} suggestions
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(conv.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No conversations yet</div>
          )}
        </CardContent>
      </Card>

      {/* Ring Buffer Taps */}
      <Card>
        <CardHeader>
          <CardTitle>Ring Buffer Taps ({debugData?.taps?.length || 0}/200)</CardTitle>
        </CardHeader>
        <CardContent>
          {debugData?.taps?.length ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {debugData.taps.slice(-20).reverse().map((tap, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded text-sm">
                  <div className="text-gray-500 font-mono min-w-20">
                    {formatTime(tap.t)}
                  </div>
                  <Badge className={getRouteColor(tap.route)}>
                    {tap.route.replace('/api/', '')}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{tap.note}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      trace: {tap.traceId}
                    </div>
                    {tap.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-blue-600">
                          View data
                        </summary>
                        <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          {JSON.stringify(tap.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No taps yet</div>
          )}
        </CardContent>
      </Card>

      {/* Expected Flow Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Expected n8n Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p className="font-medium">When you send a live chat &quot;hi&quot;, you should see taps in this order:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li><code>after_extract_identity</code></li>
              <li><code>after_resolve_conversation</code></li>
              <li><code>before_assist_request</code></li>
              <li><code>after_assist_response</code></li>
              <li><code>before_mirror_events</code></li>
              <li><code>before_mirror_assist</code></li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm"><strong>Troubleshooting:</strong></p>
              <ul className="text-xs text-gray-600 mt-1 space-y-1">
                <li>• First tap missing → webhook didn&apos;t fire; check HL → n8n webhook</li>
                <li>• Taps exist until before_mirror_* but no conversations → Vercel rejected mirror calls; check HMAC</li>
                <li>• after_assist_response shows suggestions.length = 0 → Fix AI prompt/parsing in external workflow</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" asChild>
              <a href="/api/desk/health" target="_blank">Health API</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/desk/last" target="_blank">Debug API</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/conversations" target="_blank">Conversations API</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/" target="_blank">Agent Desk</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

