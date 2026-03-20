const { Client } = require('pg');
const fs = require('fs');

const DB_PASSWORD = 'Yoengel.1fahrdoc';
const PROJECT_REF = 'tjqobyorudyvgmqwfpox';

const regions = [
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 
  'ap-southeast-1', 'ap-northeast-1', 'sa-east-1'
];

async function tryAll() {
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const config = {
        host,
        port,
        database: 'postgres',
        user: `postgres.${PROJECT_REF}`,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
      };
      
      const client = new Client(config);
      try {
        process.stdout.write(`${region}:${port}... `);
        await client.connect();
        console.log('CONNECTED!');
        
        // Run the schema
        const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
        console.log('Executing schema...');
        await client.query(sql);
        console.log('Schema created successfully!');
        
        // Verify
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);
        console.log('\nCreated tables:');
        result.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));
        
        await client.end();
        return true;
      } catch(e) {
        const msg = e.message.substring(0, 60);
        console.log(`FAIL (${msg})`);
        try { await client.end(); } catch(e2) {}
      }
    }
  }
  return false;
}

tryAll().then(ok => {
  if (!ok) {
    console.log('\n--- All pooler regions failed ---');
    console.log('The project might be on a newer Supabase platform version.');
    console.log('Try using Supavisor connection string from dashboard.');
  }
}).catch(console.error);
