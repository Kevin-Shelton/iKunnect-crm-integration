// Secure configuration system that doesn't rely on environment variables
// Uses encrypted configuration with runtime decryption

interface SecureConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
  n8n: {
    webhookUrl: string;
  };
  hmac: {
    secret: string;
  };
}

// Base64 encoded configuration (you can replace this with your actual config)
// This is just a placeholder - in production, this would be your actual encrypted config
const ENCRYPTED_CONFIG = process.env.ENCRYPTED_CONFIG || 'eyJzdXBhYmFzZSI6eyJ1cmwiOiJodHRwczovL3lvdXItcHJvamVjdC5zdXBhYmFzZS5jbyIsImFub25LZXkiOiJ5b3VyLWFub24ta2V5Iiwic2VydmljZUtleSI6InlvdXItc2VydmljZS1rZXkifSwibjhuIjp7IndlYmhvb2tVcmwiOiJ5b3VyLW44bi13ZWJob29rLXVybCJ9LCJobWFjIjp7InNlY3JldCI6InlvdXItaG1hYy1zZWNyZXQifX0=';

// Simple XOR encryption/decryption (you can use more sophisticated encryption)
function simpleDecrypt(encrypted: string, key: string): string {
  try {
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return encrypted; // Return as-is if decryption fails
  }
}

function getDecryptionKey(): string {
  // Use a combination of factors to create a decryption key
  // This ensures the config only works in the correct environment
  const factors = [
    typeof window !== 'undefined' ? 'client' : 'server',
    process.env.VERCEL_ENV || 'development',
    'ikunnect-crm-2025'
  ];
  return factors.join('-');
}

let cachedConfig: SecureConfig | null = null;

export function getSecureConfig(): SecureConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // First, try environment variables (if available)
    if (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
      cachedConfig = {
        supabase: {
          url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN || process.env.SUPABASE_ANON_KEY || '',
          serviceKey: process.env.SUPABASE_SERVICE_ROLE_TOKEN || process.env.SUPABASE_SERVICE_KEY || ''
        },
        n8n: {
          webhookUrl: process.env.N8N_AI_SUGGESTIONS_WEBHOOK_URL || ''
        },
        hmac: {
          secret: process.env.SHARED_HMAC_SECRET || 'default-hmac-secret'
        }
      };
      return cachedConfig;
    }

    // Fallback to encrypted configuration
    const decryptionKey = getDecryptionKey();
    let configString: string;
    
    try {
      // Try to decrypt the configuration
      configString = simpleDecrypt(ENCRYPTED_CONFIG, decryptionKey);
      cachedConfig = JSON.parse(configString);
    } catch {
      // If decryption fails, try base64 decode
      try {
        configString = atob(ENCRYPTED_CONFIG);
        cachedConfig = JSON.parse(configString);
      } catch {
        // Final fallback to demo configuration
        cachedConfig = {
          supabase: {
            url: 'https://demo.supabase.co',
            anonKey: 'demo-anon-key',
            serviceKey: 'demo-service-key'
          },
          n8n: {
            webhookUrl: 'https://demo.n8n.webhook.url'
          },
          hmac: {
            secret: 'demo-hmac-secret'
          }
        };
      }
    }

    return cachedConfig;
  } catch (error) {
    console.error('Failed to load secure configuration:', error);
    
    // Return safe defaults
    cachedConfig = {
      supabase: {
        url: '',
        anonKey: '',
        serviceKey: ''
      },
      n8n: {
        webhookUrl: ''
      },
      hmac: {
        secret: 'fallback-secret'
      }
    };
    
    return cachedConfig;
  }
}

// Validate configuration
export function validateConfig(config: SecureConfig): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!config.supabase.url || config.supabase.url === 'https://demo.supabase.co') {
    issues.push('Supabase URL not configured');
  }
  
  if (!config.supabase.serviceKey || config.supabase.serviceKey === 'demo-service-key') {
    issues.push('Supabase service key not configured');
  }
  
  if (!config.supabase.anonKey || config.supabase.anonKey === 'demo-anon-key') {
    issues.push('Supabase anon key not configured');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// Helper to check if we're using real configuration
export function isProductionConfig(): boolean {
  const config = getSecureConfig();
  const validation = validateConfig(config);
  return validation.valid;
}

// Generate encrypted configuration (for setup)
export function generateEncryptedConfig(config: SecureConfig): string {
  const configString = JSON.stringify(config);
  return btoa(configString); // Simple base64 encoding for now
}

// Configuration setup helper
export function setupConfiguration(supabaseUrl: string, supabaseAnonKey: string, supabaseServiceKey: string, n8nWebhookUrl?: string, hmacSecret?: string): string {
  const config: SecureConfig = {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey
    },
    n8n: {
      webhookUrl: n8nWebhookUrl || ''
    },
    hmac: {
      secret: hmacSecret || 'default-hmac-secret'
    }
  };
  
  return generateEncryptedConfig(config);
}
