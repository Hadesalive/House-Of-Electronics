/**
 * Seed product_keys in Supabase from a list of plain keys.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/seed-product-keys.js
 *
 * Edit the `plainKeys` array below with the keys you want to add.
 * Keys are normalized (trim, remove spaces, uppercase) and hashed with SHA-256 before insert.
 */

const crypto = require('crypto');
const fetch = (...args) => {
  if (global.fetch) return global.fetch(...args);
  return import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) are required');
  process.exit(1);
}

// Plain product keys to seed (add more as needed)
const plainKeys = [
  'BAHA-LPHA-14!',
  'Krawobeans-20!',
  'HouseofElectronics-21!',
  'Hadesalive-19!',
  'Photonlight-22!',
  'Starlight-23!',
  'Starlite-24!',
  'Starlight-25!',
  'Starlight-26!',
  'Starlight-27!',
  'Starlight-28!',
  'Starlight-29!',
];

function normalizeKey(key) {
  return key.trim().replace(/\s+/g, '').toUpperCase();
}

function hashKey(normalized) {
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function seed() {
  if (!plainKeys.length) {
    console.error('⚠️  No keys provided. Edit plainKeys array in seed-product-keys.js');
    process.exit(1);
  }

  const rows = plainKeys.map((k) => {
    const normalized = normalizeKey(k);
    return {
      key_hash: hashKey(normalized),
      status: 'unused',
      notes: `Seeded key (${normalized})`,
    };
  });

  console.log(`Seeding ${rows.length} keys to Supabase...`);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/product_keys`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed with status ${res.status}`);
  }

  console.log('✅ Seeding complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
