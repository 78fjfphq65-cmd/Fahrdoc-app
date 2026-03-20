// Execute SQL schema directly against Supabase PostgreSQL
// Connection string format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// We'll use the Supabase REST SQL endpoint instead

const fs = require('fs');

const SUPABASE_URL = 'https://tjqobyorudyvgmqwfpox.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcW9ieW9ydWR5dmdtcXdmcG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1MzQyNywiZXhwIjoyMDg5NTI5NDI3fQ.i_NfNJ0n97KmLcofnR2jgZGBJOg-C_dJamSLm3yOSDU';

async function runSQL(sql) {
  // Use the Supabase SQL query endpoint (available on all projects)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });
  return response;
}

// Alternative: Try using the Supabase Management API
async function runSQLViaManagement(sql) {
  const projectRef = 'tjqobyorudyvgmqwfpox';
  // The Supabase platform API endpoint for running queries
  const response = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });
  const status = response.status;
  const text = await response.text();
  return { status, text };
}

async function main() {
  const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
  
  console.log('Trying Supabase SQL endpoint...');
  const result = await runSQLViaManagement(sql);
  console.log(`Status: ${result.status}`);
  console.log(`Response: ${result.text.substring(0, 500)}`);
  
  if (result.status !== 200) {
    console.log('\nTrying alternative approach: creating an exec_sql function first...');
    
    // Create a helper function via the REST API
    const createFnSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(query text) 
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const r2 = await runSQLViaManagement(createFnSQL);
    console.log(`Create function status: ${r2.status}`);
    console.log(`Create function response: ${r2.text.substring(0, 300)}`);
  }
}

main().catch(console.error);
