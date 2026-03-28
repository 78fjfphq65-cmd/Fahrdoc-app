require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrate() {
  console.log('Running migration...');
  
  // Check current columns by fetching a vehicle
  const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('*').limit(1);
  
  if (vErr) {
    console.error('Error fetching vehicles:', vErr);
    return;
  }
  
  console.log('Current vehicle columns:', vehicles.length > 0 ? Object.keys(vehicles[0]) : 'no vehicles found');
  
  // We need to check if columns exist
  if (vehicles.length > 0 && !vehicles[0].hasOwnProperty('status')) {
    console.log('Columns missing. Need to add: status, available_from, hu_au_date, next_service_km, current_km');
    console.log('Since we cannot run ALTER TABLE via REST API, we need to use the SQL Editor.');
    console.log('\nPlease run this SQL in Supabase SQL Editor:');
    console.log(`
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status text DEFAULT 'Aktiv';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS available_from date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS hu_au_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service_km integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_km integer;
    `);
  } else if (vehicles.length > 0) {
    console.log('All columns already exist!');
  } else {
    // No vehicles exist - test by inserting a dummy then deleting
    console.log('No vehicles exist. Let me test if columns exist by doing a select with column names...');
    const { data: test, error: tErr } = await supabase.from('vehicles')
      .select('id,status,available_from,hu_au_date,next_service_km,current_km')
      .limit(1);
    if (tErr) {
      console.log('Missing columns:', tErr.message);
    } else {
      console.log('All columns already exist!');
    }
  }
}

migrate();
