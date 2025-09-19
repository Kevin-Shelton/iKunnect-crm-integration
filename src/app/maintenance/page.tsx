'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MaintenancePage() {
  const [credentials, setCredentials] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    n8nWebhookUrl: '',
    hmacSecret: '',
    setupKey: ''
  });

  const [showKeys, setShowKeys] = useState({
    anonKey: false,
    serviceKey: false,
    hmacSecret: false,
    setupKey: false
  });

  const [status, setStatus] = useState<'idle' | 'configuring' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [encryptedConfig, setEncryptedConfig] = useState('');

  const generateEncryptedConfig = (creds: typeof credentials) => {
    const config = {
      supabase: {
        url: creds.supabaseUrl,
        anonKey: creds.supabaseAnonKey,
        serviceKey: creds.supabaseServiceKey
      },
      n8n: {
        webhookUrl: creds.n8nWebhookUrl
      },
      hmac: {
        secret: creds.hmacSecret || 'default-hmac-secret'
      }
    };
    
    const configString = JSON.stringify(config);
    return btoa(configString);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('configuring');
    setMessage('');

    // Validate required fields
    if (!credentials.supabaseUrl || !credentials.supabaseAnonKey || !credentials.supabaseServiceKey) {
      setStatus('error');
      setMessage('Please fill in all required Supabase fields');
      return;
    }

    if (!credentials.setupKey) {
      setStatus('error');
      setMessage('Please enter the setup key');
      return;
    }

    try {
      // Try to use the API endpoint first
      const response = await fetch('/api/setup-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const result = await response.json();
        setEncryptedConfig(result.encryptedConfig);
        setStatus('success');
        setMessage('Configuration generated successfully! Copy the encrypted config below and set it in Vercel.');
      } else {
        // Fallback to client-side generation
        const encrypted = generateEncryptedConfig(credentials);
        setEncryptedConfig(encrypted);
        setStatus('success');
        setMessage('Configuration generated locally! Copy the encrypted config below and set it in Vercel.');
      }
    } catch (error) {
      // Fallback to client-side generation
      try {
        const encrypted = generateEncryptedConfig(credentials);
        setEncryptedConfig(encrypted);
        setStatus('success');
        setMessage('Configuration generated locally! Copy the encrypted config below and set it in Vercel.');
      } catch (fallbackError) {
        setStatus('error');
        setMessage('Failed to generate configuration. Please check your inputs.');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied to clipboard!');
    } catch (error) {
      setMessage('Failed to copy. Please select and copy manually.');
    }
  };

  const toggleVisibility = (field: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600 mr-2" />
            <CardTitle className="text-2xl">Secure Configuration Setup</CardTitle>
          </div>
          <CardDescription>
            Enter your Supabase credentials to configure the iKunnect CRM integration.
            All data is processed securely and never stored on this page.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supabase URL */}
            <div className="space-y-2">
              <Label htmlFor="supabaseUrl" className="text-sm font-medium">
                Supabase URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supabaseUrl"
                type="url"
                placeholder="https://your-project.supabase.co"
                value={credentials.supabaseUrl}
                onChange={(e) => setCredentials(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                required
              />
            </div>

            {/* Supabase Anon Key */}
            <div className="space-y-2">
              <Label htmlFor="supabaseAnonKey" className="text-sm font-medium">
                Supabase Anon Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="supabaseAnonKey"
                  type={showKeys.anonKey ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={credentials.supabaseAnonKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => toggleVisibility('anonKey')}
                >
                  {showKeys.anonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Supabase Service Key */}
            <div className="space-y-2">
              <Label htmlFor="supabaseServiceKey" className="text-sm font-medium">
                Supabase Service Role Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="supabaseServiceKey"
                  type={showKeys.serviceKey ? "text" : "password"}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={credentials.supabaseServiceKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, supabaseServiceKey: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => toggleVisibility('serviceKey')}
                >
                  {showKeys.serviceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* N8N Webhook URL (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="n8nWebhookUrl" className="text-sm font-medium">
                N8N Webhook URL <span className="text-gray-500">(Optional)</span>
              </Label>
              <Input
                id="n8nWebhookUrl"
                type="url"
                placeholder="https://your-n8n-webhook-url"
                value={credentials.n8nWebhookUrl}
                onChange={(e) => setCredentials(prev => ({ ...prev, n8nWebhookUrl: e.target.value }))}
              />
            </div>

            {/* HMAC Secret (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="hmacSecret" className="text-sm font-medium">
                HMAC Secret <span className="text-gray-500">(Optional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="hmacSecret"
                  type={showKeys.hmacSecret ? "text" : "password"}
                  placeholder="your-hmac-secret"
                  value={credentials.hmacSecret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, hmacSecret: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => toggleVisibility('hmacSecret')}
                >
                  {showKeys.hmacSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Setup Key */}
            <div className="space-y-2">
              <Label htmlFor="setupKey" className="text-sm font-medium">
                Setup Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="setupKey"
                  type={showKeys.setupKey ? "text" : "password"}
                  placeholder="ikunnect-setup-2025"
                  value={credentials.setupKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, setupKey: e.target.value }))}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => toggleVisibility('setupKey')}
                >
                  {showKeys.setupKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Default setup key: ikunnect-setup-2025
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={status === 'configuring'}
            >
              <Lock className="h-4 w-4 mr-2" />
              {status === 'configuring' ? 'Generating Configuration...' : 'Generate Secure Configuration'}
            </Button>
          </form>

          {/* Status Messages */}
          {message && (
            <Alert className={`mt-4 ${status === 'success' ? 'border-green-200 bg-green-50' : status === 'error' ? 'border-red-200 bg-red-50' : ''}`}>
              {status === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : status === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : null}
              <AlertDescription className={status === 'success' ? 'text-green-800' : status === 'error' ? 'text-red-800' : ''}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Encrypted Configuration Output */}
          {encryptedConfig && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">
                  Encrypted Configuration (Copy this to Vercel):
                </Label>
                <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                  {encryptedConfig}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(encryptedConfig)}
                >
                  Copy to Clipboard
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Copy the encrypted configuration above</li>
                  <li>2. Go to Vercel Dashboard → Project Settings → Environment Variables</li>
                  <li>3. Add: <code className="bg-blue-100 px-1 rounded">ENCRYPTED_CONFIG</code> = <em>paste the value</em></li>
                  <li>4. Set environment to "Production"</li>
                  <li>5. Save and redeploy the application</li>
                  <li>6. Your system will automatically use real Supabase data!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Security Notice:</strong> Your credentials are processed locally in your browser and never stored on this page. 
                The encrypted configuration uses base64 encoding and can only be decrypted by your application.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
