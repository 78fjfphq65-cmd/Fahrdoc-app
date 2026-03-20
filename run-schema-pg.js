const { Client } = require('pg');
const fs = require('fs');

const DB_PASSWORD = 'Yoengel.1fahrdoc';
const PROJECT_REF = 'tjqobyorudyvgmqwfpox';

// Try different connection approaches
async function tryConnect() {
  // Approach 1: Direct connection
  const configs = [
    // Direct connection (port 5432)
    {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    // Pooler - transaction mode (port 6543)
    {
      host: `aws-0-eu-central-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    // Pooler - session mode (port 5432)
    {
      host: `aws-0-eu-central-1.pooler.supabase.com`,
      port: 5432,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    // Try US regions
    {
      host: `aws-0-eu-west-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    {
      host: `aws-0-us-east-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    {
      host: `aws-0-eu-west-2.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    {
      host: `aws-0-ap-southeast-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
  ];

  for (const config of configs) {
    const client = new Client({ ...config, connectionTimeoutMillis: 10000 });
    const desc = `${config.host}:${config.port} (user: ${config.user})`;
    try {
      console.log(`Trying ${desc}...`);
      await client.connect();
      console.log(`Connected to ${desc}`);
      
      // Run schema
      const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
      console.log('Executing schema...');
      await client.query(sql);
      console.log('Schema created successfully!');
      
      // Verify tables
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      console.log('\nCreated tables:');
      result.rows.forEach(r => console.log(`  - ${r.table_name}`));
      
      await client.end();
      return true;
    } catch(e) {
      console.log(`  Failed: ${e.message.substring(0, 100)}`);
      try { await client.end(); } catch(e2) {}
    }
  }
  return false;
}

tryConnect().then(ok => {
  if (!ok) console.log('\nAll connection attempts failed.');
  else console.log('\nDone!');
}).catch(console.error);
