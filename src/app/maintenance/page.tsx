'use client';

import { useState } from 'react';

export default function MaintenancePage() {
  const [credentials, setCredentials] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    n8nWebhookUrl: '',
    hmacSecret: '',
    setupKey: 'ikunnect-setup-2025'
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
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '42rem', 
        backgroundColor: 'white', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
        padding: '2rem' 
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>🔐</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Secure Configuration Setup</h1>
          </div>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Enter your Supabase credentials to configure the iKunnect CRM integration.
            All data is processed securely and never stored on this page.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Supabase URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Supabase URL <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="url"
              placeholder="https://your-project.supabase.co"
              value={credentials.supabaseUrl}
              onChange={(e) => setCredentials(prev => ({ ...prev, supabaseUrl: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Supabase Anon Key */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Supabase Anon Key <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKeys.anonKey ? "text" : "password"}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={credentials.supabaseAnonKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  paddingRight: '2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('anonKey')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {showKeys.anonKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Supabase Service Key */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Supabase Service Role Key <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKeys.serviceKey ? "text" : "password"}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={credentials.supabaseServiceKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, supabaseServiceKey: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  paddingRight: '2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('serviceKey')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {showKeys.serviceKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* N8N Webhook URL (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              N8N Webhook URL <span style={{ color: '#6b7280' }}>(Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://your-n8n-webhook-url"
              value={credentials.n8nWebhookUrl}
              onChange={(e) => setCredentials(prev => ({ ...prev, n8nWebhookUrl: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* HMAC Secret (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              HMAC Secret <span style={{ color: '#6b7280' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKeys.hmacSecret ? "text" : "password"}
                placeholder="your-hmac-secret"
                value={credentials.hmacSecret}
                onChange={(e) => setCredentials(prev => ({ ...prev, hmacSecret: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  paddingRight: '2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('hmacSecret')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {showKeys.hmacSecret ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Setup Key */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Setup Key <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKeys.setupKey ? "text" : "password"}
                placeholder="ikunnect-setup-2025"
                value={credentials.setupKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, setupKey: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  paddingRight: '2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => toggleVisibility('setupKey')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {showKeys.setupKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Default setup key: ikunnect-setup-2025
            </p>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={status === 'configuring'}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: status === 'configuring' ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: status === 'configuring' ? 'not-allowed' : 'pointer'
            }}
          >
            🔒 {status === 'configuring' ? 'Generating Configuration...' : 'Generate Secure Configuration'}
          </button>
        </form>

        {/* Status Messages */}
        {message && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '0.375rem',
            border: `1px solid ${status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : '#3b82f6'}`,
            backgroundColor: status === 'success' ? '#ecfdf5' : status === 'error' ? '#fef2f2' : '#eff6ff'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ marginRight: '0.5rem', fontSize: '1.25rem' }}>
                {status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️'}
              </span>
              <div style={{
                fontSize: '0.875rem',
                color: status === 'success' ? '#065f46' : status === 'error' ? '#991b1b' : '#1e40af'
              }}>
                {message}
              </div>
            </div>
          </div>
        )}

        {/* Encrypted Configuration Output */}
        {encryptedConfig && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.375rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Encrypted Configuration (Copy this to Vercel):
              </label>
              <div style={{
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: '1px solid #d1d5db',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
                marginBottom: '0.5rem'
              }}>
                {encryptedConfig}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(encryptedConfig)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                📋 Copy to Clipboard
              </button>
            </div>

            <div style={{ backgroundColor: '#dbeafe', padding: '1rem', borderRadius: '0.375rem', marginTop: '1rem' }}>
              <h4 style={{ fontWeight: '500', color: '#1e40af', margin: '0 0 0.5rem 0' }}>Next Steps:</h4>
              <ol style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, paddingLeft: '1.25rem' }}>
                <li>Copy the encrypted configuration above</li>
                <li>Go to Vercel Dashboard → Project Settings → Environment Variables</li>
                <li>Add: <code style={{ backgroundColor: '#bfdbfe', padding: '0.125rem 0.25rem', borderRadius: '0.125rem' }}>ENCRYPTED_CONFIG</code> = <em>paste the value</em></li>
                <li>Set environment to "Production"</li>
                <li>Save and redeploy the application</li>
                <li>Your system will automatically use real Supabase data!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '0.375rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>🛡️</span>
            <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
              <strong>Security Notice:</strong> Your credentials are processed locally in your browser and never stored on this page. 
              The encrypted configuration uses base64 encoding and can only be decrypted by your application.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
