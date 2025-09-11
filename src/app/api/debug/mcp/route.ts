import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';

export async function GET(_request: NextRequest) {
  try {
    console.log('[DEBUG] Testing MCP connection...');
    
    const crmClient = createCRMClient();
    
    // Test 1: Health Check
    let healthResult;
    try {
      healthResult = await crmClient.healthCheck();
      console.log('[DEBUG] Health Check Result:', healthResult);
    } catch (healthError) {
      console.error('[DEBUG] Health Check Error:', healthError);
      healthResult = { error: healthError instanceof Error ? healthError.message : 'Health check failed' };
    }

    // Test 2: Get All Conversations (no filters)
    let allConversationsResult;
    try {
      allConversationsResult = await crmClient.getAllConversations({
        limit: 10
      });
      console.log('[DEBUG] All Conversations Result:', {
        success: allConversationsResult.success,
        itemCount: allConversationsResult.data?.items?.length || 0,
        error: allConversationsResult.error
      });
    } catch (convError) {
      console.error('[DEBUG] Get Conversations Error:', convError);
      allConversationsResult = { 
        success: false, 
        error: convError instanceof Error ? convError.message : 'Get conversations failed' 
      };
    }

    // Test 3: Get Contacts
    let contactsResult;
    try {
      contactsResult = await crmClient.getContacts({
        limit: 5
      });
      console.log('[DEBUG] Contacts Result:', {
        success: contactsResult.success,
        itemCount: contactsResult.data?.items?.length || 0,
        error: contactsResult.error
      });
    } catch (contactError) {
      console.error('[DEBUG] Get Contacts Error:', contactError);
      contactsResult = { 
        success: false, 
        error: contactError instanceof Error ? contactError.message : 'Get contacts failed' 
      };
    }

    // Test 4: Environment Variables Check
    const envCheck = {
      GHL_MCP_BASE_URL: !!process.env.GHL_MCP_BASE_URL,
      GHL_PRIVATE_INTEGRATION_TOKEN: !!process.env.GHL_PRIVATE_INTEGRATION_TOKEN,
      GHL_LOCATION_ID: !!process.env.GHL_LOCATION_ID,
      OPENAI_API_TOKEN: !!process.env.OPENAI_API_TOKEN,
      OPENAI_PROMPT_ID: !!process.env.OPENAI_PROMPT_ID
    };

    console.log('[DEBUG] Environment Variables:', envCheck);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        healthCheck: healthResult,
        allConversations: allConversationsResult,
        contacts: contactsResult,
        environment: envCheck
      },
      mcpConfig: {
        baseUrl: process.env.GHL_MCP_BASE_URL || 'https://services.leadconnectorhq.com/mcp/',
        hasToken: !!process.env.GHL_PRIVATE_INTEGRATION_TOKEN,
        hasLocationId: !!process.env.GHL_LOCATION_ID
      }
    });

  } catch (error) {
    console.error('[DEBUG] MCP Debug Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    console.log('[DEBUG] MCP Action Test:', { action, params });

    const crmClient = createCRMClient();

    let result;
    switch (action) {
      case 'searchConversations':
        result = await crmClient.searchConversations(params);
        break;
      case 'getConversation':
        result = await crmClient.getConversation(params.conversationId);
        break;
      case 'sendMessage':
        result = await crmClient.sendMessage(params);
        break;
      case 'upsertContact':
        result = await crmClient.upsertContact(params);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    console.log('[DEBUG] Action Result:', result);

    return NextResponse.json({
      success: true,
      action,
      params,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DEBUG] MCP Action Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

