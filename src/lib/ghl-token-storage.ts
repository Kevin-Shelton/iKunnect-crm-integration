import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface GHLTokenData {
  locationId: string;
  companyId?: string;
  userId?: string;
  userType?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  scope?: string;
}

/**
 * Save or update GHL OAuth tokens in Supabase
 */
export async function saveTokens(data: GHLTokenData): Promise<void> {
  const { error } = await supabase
    .from('ghl_oauth_tokens')
    .upsert({
      location_id: data.locationId,
      company_id: data.companyId,
      user_id: data.userId,
      user_type: data.userType,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      token_expiry: data.tokenExpiry.toISOString(),
      scope: data.scope,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'location_id', // Update if location_id already exists
    });

  if (error) {
    console.error('[Token Storage] Error saving tokens:', error);
    throw new Error(`Failed to save tokens: ${error.message}`);
  }

  console.log('[Token Storage] Tokens saved successfully for location:', data.locationId);
}

/**
 * Retrieve GHL OAuth tokens from Supabase by location ID
 */
export async function getTokens(locationId: string): Promise<GHLTokenData | null> {
  const { data, error } = await supabase
    .from('ghl_oauth_tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      console.log('[Token Storage] No tokens found for location:', locationId);
      return null;
    }
    console.error('[Token Storage] Error retrieving tokens:', error);
    throw new Error(`Failed to retrieve tokens: ${error.message}`);
  }

  return {
    locationId: data.location_id,
    companyId: data.company_id,
    userId: data.user_id,
    userType: data.user_type,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: new Date(data.token_expiry),
    scope: data.scope,
  };
}

/**
 * Delete GHL OAuth tokens from Supabase
 */
export async function deleteTokens(locationId: string): Promise<void> {
  const { error } = await supabase
    .from('ghl_oauth_tokens')
    .delete()
    .eq('location_id', locationId);

  if (error) {
    console.error('[Token Storage] Error deleting tokens:', error);
    throw new Error(`Failed to delete tokens: ${error.message}`);
  }

  console.log('[Token Storage] Tokens deleted successfully for location:', locationId);
}

/**
 * Get all stored tokens (for admin purposes)
 */
export async function getAllTokens(): Promise<GHLTokenData[]> {
  const { data, error } = await supabase
    .from('ghl_oauth_tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Token Storage] Error retrieving all tokens:', error);
    throw new Error(`Failed to retrieve all tokens: ${error.message}`);
  }

  return data.map(row => ({
    locationId: row.location_id,
    companyId: row.company_id,
    userId: row.user_id,
    userType: row.user_type,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiry: new Date(row.token_expiry),
    scope: row.scope,
  }));
}
