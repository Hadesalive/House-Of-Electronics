/**
 * Patch existing products in Supabase with brand values based on name patterns.
 * Run once after adding the brand column to the products table.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/patch-brands.js
 */

const fetch = (...args) => {
  if (global.fetch) return global.fetch(...args);
  return import('node-fetch').then(({ default: f }) => f(...args));
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

// Brand detection rules — checked in order, first match wins
const BRAND_RULES = [
  // Apple
  { brand: 'Apple', patterns: [/^iphone/i, /^ipad/i, /^macbook/i, /^apple watch/i, /^airpods/i, /^homepod/i, /^apple tv/i, /^apple vision/i, /^apple pencil/i, /^magic keyboard/i, /^magic mouse/i, /^magic trackpad/i, /^magsafe/i, /^earpods/i, /^apple/i] },
  // Samsung
  { brand: 'Samsung', patterns: [/^samsung/i, /^galaxy/i] },
  // Xiaomi / Redmi / POCO
  { brand: 'Xiaomi', patterns: [/^xiaomi/i, /^redmi/i, /^poco/i] },
  // OnePlus
  { brand: 'OnePlus', patterns: [/^oneplus/i] },
  // Google
  { brand: 'Google', patterns: [/^google/i, /^pixel/i] },
  // Sony
  { brand: 'Sony', patterns: [/^sony/i] },
  // Huawei (phones — networking section handled separately below)
  { brand: 'Huawei', patterns: [/^huawei p\d/i, /^huawei mate/i, /^huawei nova/i, /^huawei band/i, /^huawei watch/i, /^huawei/i] },
  // HP
  { brand: 'HP', patterns: [/^hp /i, /^hp$/i] },
  // Dell
  { brand: 'Dell', patterns: [/^dell/i] },
  // Lenovo
  { brand: 'Lenovo', patterns: [/^lenovo/i] },
  // ASUS
  { brand: 'ASUS', patterns: [/^asus/i] },
  // Acer
  { brand: 'Acer', patterns: [/^acer/i] },
  // Microsoft
  { brand: 'Microsoft', patterns: [/^microsoft/i] },
  // TP-Link
  { brand: 'TP-Link', patterns: [/^tp-link/i, /^tplink/i, /^archer /i, /^deco /i, /^eap\d/i, /^tl-/i, /^re\d{3}/i, /^kasa/i] },
  // Cisco
  { brand: 'Cisco', patterns: [/^cisco/i] },
  // Ubiquiti / UniFi
  { brand: 'Ubiquiti', patterns: [/^unifi/i, /^ubiquiti/i] },
  // Netgear
  { brand: 'Netgear', patterns: [/^netgear/i, /^nighthawk/i, /^orbi/i, /^prosafe/i] },
  // D-Link
  { brand: 'D-Link', patterns: [/^d-link/i, /^dlink/i] },
  // MikroTik
  { brand: 'MikroTik', patterns: [/^mikrotik/i] },
  // Canon
  { brand: 'Canon', patterns: [/^canon/i] },
  // Epson
  { brand: 'Epson', patterns: [/^epson/i] },
  // Brother
  { brand: 'Brother', patterns: [/^brother/i] },
];

function detectBrand(name) {
  for (const rule of BRAND_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(name)) return rule.brand;
    }
  }
  return null;
}

async function run() {
  // 1. Fetch all products
  console.log('📥  Fetching all products from Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name&limit=10000`, { headers });
  if (!res.ok) {
    console.error('❌  Failed to fetch products:', await res.text());
    process.exit(1);
  }
  const products = await res.json();
  console.log(`   Found ${products.length} products.`);

  // 2. Build brand → ids map
  const brandGroups = {};
  let unmatched = 0;
  for (const prod of products) {
    const brand = detectBrand(prod.name);
    if (brand) {
      if (!brandGroups[brand]) brandGroups[brand] = [];
      brandGroups[brand].push(prod.id);
    } else {
      unmatched++;
    }
  }

  const totalBranded = products.length - unmatched;
  console.log(`\n🏷️   Matched ${totalBranded} products to brands, ${unmatched} unmatched.\n`);

  // 3. Patch each brand group using ?id=in.(...)
  for (const [brand, ids] of Object.entries(brandGroups)) {
    // Supabase in() filter — chunk to avoid URL length limits
    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const idList = chunk.map(id => `"${id}"`).join(',');
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/products?id=in.(${chunk.join(',')})`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ brand }),
        }
      );
      if (!patchRes.ok) {
        console.error(`❌  Failed to patch brand "${brand}":`, await patchRes.text());
      }
    }
    console.log(`   ✔  ${brand.padEnd(16)} → ${ids.length} products`);
  }

  console.log('\n✅  Brand patching complete!');
}

run().catch(err => { console.error(err); process.exit(1); });
