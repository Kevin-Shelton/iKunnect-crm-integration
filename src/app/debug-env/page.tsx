'use client';

import { useState, useEffect } from 'react';

interface EnvDebugData {
  timestamp: string;
  environment: string;
  vercel_env: string;
  target_variables: Record<string, string>;
  categorized_variables: {
    supabase: Record<string, string>;
    vercel: Record<string, string>;
    next: Record<string, string>;
    custom: Record<string, string>;
    encrypted: Record<string, string>;
    all_keys: string[];
  };
  total_env_vars: number;
  deployment_info: {
    vercel_url: string;
    vercel_git_commit_sha: string;
    vercel_git_commit_ref: string;
  };
}

export default function DebugEnvPage() {
  const [data, setData] = useState<EnvDebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/debug/env-vars')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>🔍 Environment Variables Debug</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>🔍 Environment Variables Debug</h1>
        <div style={{ backgroundColor: '#fee', padding: '1rem', borderRadius: '4px', color: '#c00' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>🔍 Environment Variables Debug</h1>
        <p>No data available</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    return status === 'SET' ? '#0a0' : '#c00';
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: '2rem' }}>🔍 Environment Variables Debug</h1>
      
      {/* Deployment Info */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#495057' }}>📋 Deployment Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <strong>Environment:</strong> <span>{data.environment}</span>
          <strong>Vercel Environment:</strong> <span>{data.vercel_env}</span>
          <strong>Total Variables:</strong> <span>{data.total_env_vars}</span>
          <strong>Timestamp:</strong> <span>{data.timestamp}</span>
          <strong>Vercel URL:</strong> <span>{data.deployment_info.vercel_url}</span>
          <strong>Git Commit:</strong> <span>{data.deployment_info.vercel_git_commit_sha}</span>
          <strong>Git Branch:</strong> <span>{data.deployment_info.vercel_git_commit_ref}</span>
        </div>
      </div>

      {/* Target Variables Status */}
      <div style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#856404' }}>🎯 Target Variables Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '0.5rem 2rem', fontSize: '0.9rem' }}>
          {Object.entries(data.target_variables).map(([key, status]) => (
            <>
              <strong key={`${key}-label`}>{key}:</strong>
              <span key={`${key}-value`} style={{ color: getStatusColor(status), fontWeight: 'bold' }}>
                {status}
              </span>
            </>
          ))}
        </div>
      </div>

      {/* Encrypted Configuration */}
      {Object.keys(data.categorized_variables.encrypted).length > 0 && (
        <div style={{ backgroundColor: '#d1ecf1', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#0c5460' }}>🔐 Encrypted Configuration</h2>
          {Object.entries(data.categorized_variables.encrypted).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <strong>{key}:</strong> <code style={{ backgroundColor: '#fff', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{value}</code>
            </div>
          ))}
        </div>
      )}

      {/* Supabase Variables */}
      {Object.keys(data.categorized_variables.supabase).length > 0 && (
        <div style={{ backgroundColor: '#d4edda', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#155724' }}>🗄️ Supabase Variables</h2>
          {Object.entries(data.categorized_variables.supabase).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <strong>{key}:</strong> <code style={{ backgroundColor: '#fff', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{value}</code>
            </div>
          ))}
        </div>
      )}

      {/* Custom Variables */}
      {Object.keys(data.categorized_variables.custom).length > 0 && (
        <div style={{ backgroundColor: '#e2e3e5', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#383d41' }}>⚙️ Custom Variables</h2>
          {Object.entries(data.categorized_variables.custom).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <strong>{key}:</strong> <code style={{ backgroundColor: '#fff', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{value}</code>
            </div>
          ))}
        </div>
      )}

      {/* All Variable Keys */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#495057' }}>📝 All Environment Variable Keys</h2>
        <div style={{ fontSize: '0.8rem', lineHeight: '1.4', maxHeight: '200px', overflow: 'auto', backgroundColor: '#fff', padding: '1rem', borderRadius: '4px' }}>
          {data.categorized_variables.all_keys.sort().join(', ')}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px',
            marginRight: '1rem'
          }}
        >
          ← Back to Chat Desk
        </a>
        <a 
          href="/maintenance" 
          style={{ 
            display: 'inline-block', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#28a745', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '4px'
          }}
        >
          🔧 Maintenance Page
        </a>
      </div>
    </div>
  );
}
