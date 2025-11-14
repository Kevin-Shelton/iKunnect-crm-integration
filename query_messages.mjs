import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryMessages() {
  console.log('Querying chat_events table...\n');
  
  const { data, error } = await supabase
    .from('chat_events')
    .select('id, conversation_id, type, text, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} messages:\n`);
  
  data.forEach((msg, i) => {
    const sender = msg.payload?.sender || 'unknown';
    const direction = msg.payload?.direction || 'unknown';
    console.log(`${i + 1}. ID: ${msg.id}`);
    console.log(`   Conversation: ${msg.conversation_id}`);
    console.log(`   Type: ${msg.type}`);
    console.log(`   Sender: ${sender}`);
    console.log(`   Direction: ${direction}`);
    console.log(`   Text: ${msg.text?.substring(0, 60)}...`);
    console.log(`   Created: ${msg.created_at}`);
    console.log('');
  });
  
  // Count by sender type
  const senderCounts = data.reduce((acc, msg) => {
    const sender = msg.payload?.sender || 'unknown';
    acc[sender] = (acc[sender] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nMessage counts by sender:');
  console.log(senderCounts);
}

queryMessages();
