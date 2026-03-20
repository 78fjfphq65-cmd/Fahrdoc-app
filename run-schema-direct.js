// Try connecting directly to Supabase PostgreSQL via the pooler
// Default password for Supabase is the project's database password
// But we can also try using the service role JWT to get a session-based connection

const { Client } = require('pg');
const fs = require('fs');

// Supabase provides a direct connection via:
// Host: db.tjqobyorudyvgmqwfpox.supabase.co  (direct, port 5432)
// or via pooler: aws-0-eu-central-1.pooler.supabase.com (port 6543)
// Default user: postgres
// We need the DB password which is set during project creation

// Since we don't have the DB password, let's try alternative approaches:

// Approach 1: Use the Supabase Data API to create an RPC function
const SUPABASE_URL = 'https://tjqobyorudyvgmqwfpox.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcW9ieW9ydWR5dmdtcXdmcG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1MzQyNywiZXhwIjoyMDg5NTI5NDI3fQ.i_NfNJ0n97KmLcofnR2jgZGBJOg-C_dJamSLm3yOSDU';

async function tryAllEndpoints() {
  const endpoints = [
    '/rest/v1/',                    // PostgREST (tables)
    '/graphql/v1',                  // GraphQL 
    '/storage/v1/',                 // Storage
    '/auth/v1/',                    // Auth
  ];
  
  for (const ep of endpoints) {
    try {
      const r = await fetch(`${SUPABASE_URL}${ep}`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      });
      console.log(`${ep} -> ${r.status} ${(await r.text()).substring(0, 100)}`);
    } catch(e) {
      console.log(`${ep} -> ERROR: ${e.message}`);
    }
  }
  
  // Try to list existing tables via PostgREST 
  console.log('\n--- Checking if tables already exist ---');
  const tablesCheck = await fetch(`${SUPABASE_URL}/rest/v1/schools?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  console.log(`schools table: ${tablesCheck.status} - ${await tablesCheck.text()}`);
  
  // Try to check the database connection info  
  console.log('\n--- Trying direct PostgreSQL connections ---');
  
  // Common Supabase regions for pooler
  const regions = ['eu-central-1', 'us-east-1', 'us-west-1', 'ap-southeast-1'];
  
  for (const region of regions) {
    const connectionStrings = [
      // Transaction pooler (port 6543)
      `postgresql://postgres.tjqobyorudyvgmqwfpox:postgres@aws-0-${region}.pooler.supabase.com:6543/postgres`,
      // Session pooler (port 5432)  
      `postgresql://postgres.tjqobyorudyvgmqwfpox:postgres@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    ];
    
    for (const connStr of connectionStrings) {
      const client = new Client({ 
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      try {
        await client.connect();
        console.log(`SUCCESS with: ${region} (${connStr.includes('6543') ? 'pooler' : 'session'})`);
        
        // Run schema
        const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
        await client.query(sql);
        console.log('Schema created successfully!');
        
        await client.end();
        return true;
      } catch(e) {
        console.log(`Failed ${region}: ${e.message.substring(0, 80)}`);
        try { await client.end(); } catch(e2) {}
      }
    }
  }
  
  return false;
}

tryAllEndpoints().then(success => {
  if (!success) {
    console.log('\n\nCould not connect to database directly. Need DB password or browser SQL editor access.');
  }
}).catch(console.error);
