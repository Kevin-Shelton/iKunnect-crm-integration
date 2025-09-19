import { NextResponse } from 'next/server';
import { getConfigurationStatus, getChatHistory, getActiveConversations } from '@/lib/supabase-secure';
import { getSecureConfig, validateConfig, isProductionConfig } from '@/lib/secure-config';

export async function GET() {
  try {
    // Get configuration status
    const configStatus = getConfigurationStatus();
    const config = getSecureConfig();
    const validation = validateConfig(config);

    // Get sample data
    let sampleConversations = [];
    let sampleMessages = [];
    
    try {
      sampleConversations = await getActiveConversations(3);
      if (sampleConversations.length > 0) {
        sampleMessages = await getChatHistory(sampleConversations[0].id, 5);
      }
    } catch (error) {
      console.error('[Debug Secure] Error fetching sample data:', error);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      
      // Configuration status
      configuration: {
        isProductionConfig: isProductionConfig(),
        hasSupabase: configStatus.hasSupabase,
        hasSupabaseService: configStatus.hasSupabaseService,
        validation: validation,
        dataSource: configStatus.hasSupabaseService ? 'supabase' : 'mock'
      },

      // Environment detection
      environment: {
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV,
        hasEncryptedConfig: !!process.env.ENCRYPTED_CONFIG
      },

      // Sample data
      sampleData: {
        conversationCount: sampleConversations.length,
        conversations: sampleConversations.map(conv => ({
          id: conv.id,
          messageCount: conv.messageCount,
          lastMessageText: conv.lastMessage?.text?.substring(0, 50) + '...' || 'No text',
          lastMessageTime: conv.lastMessage?.created_at
        })),
        sampleMessages: sampleMessages.map(msg => ({
          id: msg.id,
          type: msg.type,
          text: msg.text?.substring(0, 100) + '...' || 'No text',
          timestamp: msg.created_at
        }))
      },

      // System status
      systemStatus: {
        canStoreEvents: configStatus.hasSupabaseService || true, // Always true with mock fallback
        canRetrieveMessages: configStatus.hasSupabaseService || true, // Always true with mock fallback
        usingMockData: !configStatus.hasSupabaseService,
        configurationComplete: validation.valid
      },

      // Next steps
      nextSteps: validation.valid ? [
        'Configuration is complete and working',
        'System is ready for production use',
        'Monitor the application logs for any issues'
      ] : [
        'Use /api/setup-config to configure the system',
        'Provide your Supabase credentials securely',
        'System will work with mock data until configured'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      fallbackAvailable: true
    }, { status: 500 });
  }
}
