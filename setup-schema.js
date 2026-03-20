// Setup Supabase schema via direct SQL execution
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://tjqobyorudyvgmqwfpox.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcW9ieW9ydWR5dmdtcXdmcG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1MzQyNywiZXhwIjoyMDg5NTI5NDI3fQ.i_NfNJ0n97KmLcofnR2jgZGBJOg-C_dJamSLm3yOSDU'
);

async function main() {
  const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--')) || stmt.substring(0, 60);
    console.log(`[${i+1}/${statements.length}] ${firstLine.trim().substring(0, 80)}...`);
    
    const { data, error } = await supabase.rpc('', { }).then(() => ({data: null, error: null})).catch(() => ({data: null, error: 'rpc failed'}));
  }

  // Actually, Supabase JS doesn't have a raw SQL method.
  // We need to use the Supabase Management API or run via the dashboard SQL editor.
  // Let me try to create an RPC function first, then use it.
  
  // First create a helper function via the postgrest
  console.log('\nNote: Supabase JS client cannot run raw SQL.');
  console.log('Using Supabase HTTP API to run SQL via the pg_net extension or management API...');
  
  // Try the Supabase Management API
  const projectRef = 'tjqobyorudyvgmqwfpox';
  
  // Actually let's use the database connection directly via the Supabase query endpoint
  const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcW9ieW9ydWR5dmdtcXdmcG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1MzQyNywiZXhwIjoyMDg5NTI5NDI3fQ.i_NfNJ0n97KmLcofnR2jgZGBJOg-C_dJamSLm3yOSDU',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcW9ieW9ydWR5dmdtcXdmcG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1MzQyNywiZXhwIjoyMDg5NTI5NDI3fQ.i_NfNJ0n97KmLcofnR2jgZGBJOg-C_dJamSLm3yOSDU'
    }
  });
  
  const data = await response.json();
  console.log('Current tables:', JSON.stringify(data).substring(0, 200));
}

main().catch(console.error);
