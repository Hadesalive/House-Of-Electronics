/**
 * Seed full inventory into Supabase.
 * Covers: Apple, Samsung, Xiaomi, OnePlus, Google, Sony, HP, Dell, Lenovo,
 *         ASUS, Acer, Microsoft, Monitors, TP-Link, Cisco, Ubiquiti, Netgear,
 *         D-Link, MikroTik, Huawei Networking, Printers, Accessories, Stationery.
 *
 * Usage:
 *   source .env && node tools/seed-inventory.js
 *   OR
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/seed-inventory.js
 *
 * Price is set to 1 as a placeholder — update when selling/invoicing.
 * Stock is set to 0 — add stock as inventory arrives.
 */

const crypto = require('crypto');
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

// ─── helpers ───────────────────────────────────────────────────────────────

function p(name, category, description = '') {
  return {
    id: crypto.randomUUID(),
    name,
    description: description || null,
    price: 1,
    cost: null,
    sku: null,
    category,
    stock: 0,
    min_stock: null,
    image: null,
    is_active: 1,
  };
}

/** Cross-join model × storage × color  →  array of products */
function variants(base, category, storages, colors, sep = ' ') {
  return storages.flatMap(s => colors.map(c => p(`${base}${sep}${s} ${c}`, category)));
}

/** model × color only (no storage) */
function colorOnly(base, category, colors) {
  return colors.map(c => p(`${base} ${c}`, category));
}

// ─── product lists ──────────────────────────────────────────────────────────

const products = [];

// ══════════════════════════════════════════════════
// APPLE
// ══════════════════════════════════════════════════

// iPhone 16 series
products.push(...variants('iPhone 16 Pro Max', 'Smartphones', ['256GB','512GB','1TB'], ['Desert Titanium','Black Titanium','White Titanium','Natural Titanium']));
products.push(...variants('iPhone 16 Pro',     'Smartphones', ['128GB','256GB','512GB','1TB'], ['Desert Titanium','Black Titanium','White Titanium','Natural Titanium']));
products.push(...variants('iPhone 16 Plus',    'Smartphones', ['128GB','256GB','512GB'], ['Black','White','Ultramarine','Teal','Pink']));
products.push(...variants('iPhone 16',         'Smartphones', ['128GB','256GB','512GB'], ['Black','White','Ultramarine','Teal','Pink']));

// iPhone 15 series
products.push(...variants('iPhone 15 Pro Max', 'Smartphones', ['256GB','512GB','1TB'], ['Natural Titanium','Blue Titanium','White Titanium','Black Titanium']));
products.push(...variants('iPhone 15 Pro',     'Smartphones', ['128GB','256GB','512GB','1TB'], ['Natural Titanium','Blue Titanium','White Titanium','Black Titanium']));
products.push(...variants('iPhone 15 Plus',    'Smartphones', ['128GB','256GB','512GB'], ['Black','Blue','Green','Yellow','Pink']));
products.push(...variants('iPhone 15',         'Smartphones', ['128GB','256GB','512GB'], ['Black','Blue','Green','Yellow','Pink']));

// iPhone 14 series
products.push(...variants('iPhone 14 Pro Max', 'Smartphones', ['128GB','256GB','512GB','1TB'], ['Deep Purple','Gold','Silver','Space Black']));
products.push(...variants('iPhone 14 Pro',     'Smartphones', ['128GB','256GB','512GB','1TB'], ['Deep Purple','Gold','Silver','Space Black']));
products.push(...variants('iPhone 14 Plus',    'Smartphones', ['128GB','256GB','512GB'], ['Blue','Purple','Midnight','Starlight','Red']));
products.push(...variants('iPhone 14',         'Smartphones', ['128GB','256GB','512GB'], ['Blue','Purple','Midnight','Starlight','Red']));

// iPhone 13 series
products.push(...variants('iPhone 13 Pro Max', 'Smartphones', ['128GB','256GB','512GB','1TB'], ['Alpine Green','Sierra Blue','Gold','Graphite','Silver']));
products.push(...variants('iPhone 13 Pro',     'Smartphones', ['128GB','256GB','512GB','1TB'], ['Alpine Green','Sierra Blue','Gold','Graphite','Silver']));
products.push(...variants('iPhone 13',         'Smartphones', ['128GB','256GB','512GB'], ['Midnight','Starlight','Blue','Pink','Green','Red']));
products.push(...variants('iPhone 13 mini',    'Smartphones', ['128GB','256GB','512GB'], ['Midnight','Starlight','Blue','Pink','Green','Red']));

// iPhone SE
products.push(...variants('iPhone SE (3rd gen)', 'Smartphones', ['64GB','128GB','256GB'], ['Midnight','Starlight','Red']));

// iPad
products.push(...variants('iPad Pro 13" M4',  'Tablets', ['256GB','512GB','1TB','2TB'], ['Space Black','Silver']));
products.push(...variants('iPad Pro 13" M4 Cellular', 'Tablets', ['256GB','512GB','1TB','2TB'], ['Space Black','Silver']));
products.push(...variants('iPad Pro 11" M4',  'Tablets', ['256GB','512GB','1TB','2TB'], ['Space Black','Silver']));
products.push(...variants('iPad Pro 11" M4 Cellular', 'Tablets', ['256GB','512GB','1TB','2TB'], ['Space Black','Silver']));
products.push(...variants('iPad Air 13" M2',  'Tablets', ['128GB','256GB','512GB','1TB'], ['Blue','Purple','Starlight','Space Grey']));
products.push(...variants('iPad Air 11" M2',  'Tablets', ['128GB','256GB','512GB','1TB'], ['Blue','Purple','Starlight','Space Grey']));
products.push(...variants('iPad 10th Gen',    'Tablets', ['64GB','256GB'], ['Blue','Pink','Silver','Yellow']));
products.push(...variants('iPad mini 6th Gen','Tablets', ['64GB','256GB'], ['Space Grey','Starlight','Pink','Purple']));

// MacBook Pro
products.push(...variants('MacBook Pro 16" M3 Max', 'Laptops', ['36GB/1TB','48GB/1TB','64GB/2TB'], ['Space Black','Silver']));
products.push(...variants('MacBook Pro 16" M3 Pro', 'Laptops', ['18GB/512GB','18GB/1TB','36GB/512GB'], ['Space Black','Silver']));
products.push(...variants('MacBook Pro 14" M3 Max', 'Laptops', ['36GB/1TB','48GB/1TB','64GB/2TB'], ['Space Black','Silver']));
products.push(...variants('MacBook Pro 14" M3 Pro', 'Laptops', ['18GB/512GB','18GB/1TB','36GB/512GB'], ['Space Black','Silver']));
products.push(...variants('MacBook Pro 14" M3',     'Laptops', ['8GB/512GB','16GB/512GB','16GB/1TB'],  ['Space Grey','Silver','Space Black']));

// MacBook Air
products.push(...variants('MacBook Air 15" M3', 'Laptops', ['8GB/256GB','8GB/512GB','16GB/512GB','24GB/2TB'], ['Midnight','Starlight','Space Grey','Silver']));
products.push(...variants('MacBook Air 13" M3', 'Laptops', ['8GB/256GB','8GB/512GB','16GB/512GB','24GB/2TB'], ['Midnight','Starlight','Space Grey','Silver']));
products.push(...variants('MacBook Air 13" M2', 'Laptops', ['8GB/256GB','8GB/512GB','16GB/512GB','24GB/2TB'], ['Midnight','Starlight','Space Grey','Silver']));

// Apple Watch
products.push(...colorOnly('Apple Watch Ultra 2 49mm', 'Smartwatches', ['Natural Titanium','Black Titanium']));
products.push(...variants('Apple Watch Series 10', 'Smartwatches', ['42mm','46mm'], ['Jet Black','Rose Gold','Silver','Gold']));
products.push(...variants('Apple Watch SE 2',      'Smartwatches', ['40mm','44mm'], ['Midnight','Starlight','Silver']));

// AirPods
products.push(p('AirPods 4', 'Audio'));
products.push(p('AirPods 4 (ANC)', 'Audio'));
products.push(p('AirPods Pro 2nd Gen (USB-C)', 'Audio'));
products.push(...colorOnly('AirPods Max', 'Audio', ['Midnight','Blue','Purple','Starlight','Orange']));

// Apple accessories
products.push(p('Apple Pencil Pro', 'Accessories'));
products.push(p('Apple Pencil (2nd Gen)', 'Accessories'));
products.push(p('Apple Pencil (USB-C)', 'Accessories'));
products.push(p('Apple Pencil (1st Gen)', 'Accessories'));
products.push(p('Magic Keyboard', 'Accessories'));
products.push(p('Magic Keyboard with Touch ID', 'Accessories'));
products.push(p('Magic Mouse', 'Accessories'));
products.push(p('Magic Trackpad', 'Accessories'));
products.push(p('MagSafe Charger 1m', 'Accessories'));
products.push(p('MagSafe Charger 2m', 'Accessories'));
products.push(p('Apple 20W USB-C Power Adapter', 'Accessories'));
products.push(p('Apple 30W USB-C Power Adapter', 'Accessories'));
products.push(p('Apple 67W MagSafe 3 Power Adapter', 'Accessories'));
products.push(p('Apple 96W USB-C Power Adapter', 'Accessories'));
products.push(p('Apple 140W USB-C Power Adapter', 'Accessories'));
products.push(p('Apple USB-C to Lightning Cable 1m', 'Accessories'));
products.push(p('Apple USB-C to USB-C Cable 1m', 'Accessories'));
products.push(p('Apple USB-C to USB-C Cable 2m', 'Accessories'));
products.push(p('Apple TV 4K (3rd Gen) Wi-Fi', 'Electronics'));
products.push(p('Apple TV 4K (3rd Gen) Wi-Fi + Ethernet', 'Electronics'));
products.push(p('HomePod (2nd Gen)', 'Audio'));
products.push(...colorOnly('HomePod mini', 'Audio', ['White','Midnight','Blue','Yellow','Orange']));
products.push(p('Apple Vision Pro', 'Electronics'));

// ══════════════════════════════════════════════════
// SAMSUNG
// ══════════════════════════════════════════════════

products.push(...variants('Samsung Galaxy S24 Ultra', 'Smartphones', ['256GB','512GB','1TB'], ['Titanium Black','Titanium Grey','Titanium Violet','Titanium Yellow']));
products.push(...variants('Samsung Galaxy S24+',      'Smartphones', ['256GB','512GB'], ['Cobalt Violet','Onyx Black','Marble Grey','Amber Yellow']));
products.push(...variants('Samsung Galaxy S24',       'Smartphones', ['128GB','256GB'], ['Onyx Black','Marble Grey','Cobalt Violet','Amber Yellow','Jade Green','Sandstone Orange']));
products.push(...variants('Samsung Galaxy S23 Ultra', 'Smartphones', ['256GB','512GB','1TB'], ['Phantom Black','Cream','Green','Lavender']));
products.push(...variants('Samsung Galaxy S23+',      'Smartphones', ['256GB','512GB'], ['Phantom Black','Cream','Green','Lavender']));
products.push(...variants('Samsung Galaxy S23',       'Smartphones', ['128GB','256GB'], ['Phantom Black','Cream','Green','Lavender']));
products.push(...variants('Samsung Galaxy A55 5G',    'Smartphones', ['128GB','256GB'], ['Awesome Navy','Awesome Lilac','Awesome Iceblue','Awesome Lemon']));
products.push(...variants('Samsung Galaxy A35 5G',    'Smartphones', ['128GB','256GB'], ['Awesome Navy','Awesome Lilac','Awesome Iceblue','Awesome Lemon']));
products.push(...variants('Samsung Galaxy A25 5G',    'Smartphones', ['128GB','256GB'], ['Navy','Blue Black','Yellow']));
products.push(...variants('Samsung Galaxy A15',       'Smartphones', ['128GB'], ['Light Blue','Blue','Black','Yellow']));
products.push(...variants('Samsung Galaxy Z Fold6',   'Smartphones', ['256GB','512GB'], ['Silver Shadow','Pink','Navy','White']));
products.push(...variants('Samsung Galaxy Z Flip6',   'Smartphones', ['256GB','512GB'], ['Silver Shadow','Yellow','Blue','Mint','Crafted Black']));
products.push(...variants('Samsung Galaxy Z Fold5',   'Smartphones', ['256GB','512GB','1TB'], ['Phantom Black','Cream','Icy Blue']));
products.push(...variants('Samsung Galaxy Z Flip5',   'Smartphones', ['256GB','512GB'], ['Mint','Lavender','Graphite','Cream']));

// Samsung Tablets
products.push(...variants('Samsung Galaxy Tab S9 Ultra', 'Tablets', ['256GB','512GB'], ['Beige','Graphite']));
products.push(...variants('Samsung Galaxy Tab S9+',      'Tablets', ['256GB','512GB'], ['Beige','Graphite']));
products.push(...variants('Samsung Galaxy Tab S9',       'Tablets', ['128GB','256GB'], ['Beige','Graphite']));
products.push(...variants('Samsung Galaxy Tab S9 FE',    'Tablets', ['128GB','256GB'], ['Mint','Lavender','Gray','Silver']));
products.push(...variants('Samsung Galaxy Tab A9+',      'Tablets', ['64GB','128GB'],  ['Navy','Silver','Graphite']));

// Samsung Audio
products.push(p('Samsung Galaxy Buds3 Pro', 'Audio'));
products.push(p('Samsung Galaxy Buds3', 'Audio'));
products.push(...colorOnly('Samsung Galaxy Buds2 Pro', 'Audio', ['Bora Purple','Graphite','White']));
products.push(...colorOnly('Samsung Galaxy Buds2',     'Audio', ['Graphite','White','Lavender','Olive']));
products.push(p('Samsung Galaxy Buds FE', 'Audio'));

// Samsung Watches
products.push(...variants('Samsung Galaxy Watch7', 'Smartwatches', ['40mm','44mm'], ['Green','Cream','Silver']));
products.push(p('Samsung Galaxy Watch Ultra 47mm', 'Smartwatches'));
products.push(...variants('Samsung Galaxy Watch6 Classic', 'Smartwatches', ['43mm','47mm'], ['Black','Silver','Creamy White']));
products.push(...variants('Samsung Galaxy Watch6',         'Smartwatches', ['40mm','44mm'], ['Gold','Silver','Graphite']));

// ══════════════════════════════════════════════════
// XIAOMI / REDMI / POCO
// ══════════════════════════════════════════════════

products.push(...variants('Xiaomi 14 Ultra',   'Smartphones', ['512GB'], ['Black','White','Titanium']));
products.push(...variants('Xiaomi 14 Pro',     'Smartphones', ['256GB','512GB'], ['Black','White','Green']));
products.push(...variants('Xiaomi 14',         'Smartphones', ['256GB','512GB'], ['Black','White','Jade Green','Wave Blue']));
products.push(...variants('Xiaomi 13T Pro',    'Smartphones', ['256GB','512GB','1TB'], ['Black','Alpine Blue','Meadow Green']));
products.push(...variants('Redmi Note 13 Pro+','Smartphones', ['256GB','512GB'], ['Aurora Purple','Fusion Black','Moonlight White']));
products.push(...variants('Redmi Note 13 Pro', 'Smartphones', ['128GB','256GB','512GB'], ['Midnight Black','Coral Purple','Arctic White']));
products.push(...variants('Redmi Note 13',     'Smartphones', ['128GB','256GB'], ['Midnight Black','Arctic White','Ice Blue']));
products.push(...variants('Redmi Note 13 5G',  'Smartphones', ['128GB','256GB'], ['Stealth Black','Arctic White','Ocean Teal']));
products.push(...variants('Redmi 13C',         'Smartphones', ['128GB'], ['Stardust Black','Startrail Blue','Startrail Green']));
products.push(...variants('Poco X6 Pro',       'Smartphones', ['256GB','512GB'], ['Black','Grey','Yellow']));
products.push(...variants('Poco X6',           'Smartphones', ['256GB','512GB'], ['Black','White','Yellow']));
products.push(...variants('Poco M6 Pro',       'Smartphones', ['256GB','512GB'], ['Black','Blue','Purple']));
products.push(...variants('Poco F6 Pro',       'Smartphones', ['256GB','512GB','1TB'], ['Black','White']));

// ══════════════════════════════════════════════════
// ONEPLUS
// ══════════════════════════════════════════════════

products.push(...variants('OnePlus 12',       'Smartphones', ['256GB','512GB'], ['Silky Black','Flowy Emerald']));
products.push(...variants('OnePlus 12R',      'Smartphones', ['128GB','256GB'], ['Cool Blue','Iron Gray']));
products.push(...variants('OnePlus 11',       'Smartphones', ['128GB','256GB','512GB'], ['Titan Black','Eternal Green']));
products.push(...variants('OnePlus Nord 4',   'Smartphones', ['256GB','512GB'], ['Mercurial Silver','Obsidian Midnight']));
products.push(...variants('OnePlus Nord CE4', 'Smartphones', ['128GB','256GB'], ['Celadon Marble','Dark Chrome']));
products.push(...variants('OnePlus Nord CE4 Lite', 'Smartphones', ['128GB','256GB'], ['Super Silver','Dark Chrome']));

// ══════════════════════════════════════════════════
// GOOGLE PIXEL
// ══════════════════════════════════════════════════

products.push(...variants('Google Pixel 8 Pro', 'Smartphones', ['128GB','256GB','512GB','1TB'], ['Obsidian','Porcelain','Bay','Mint']));
products.push(...variants('Google Pixel 8',     'Smartphones', ['128GB','256GB'], ['Obsidian','Hazel','Rose']));
products.push(...variants('Google Pixel 8a',    'Smartphones', ['128GB','256GB'], ['Obsidian','Porcelain','Bay','Aloe']));
products.push(...variants('Google Pixel 7a',    'Smartphones', ['128GB'], ['Charcoal','Snow','Sea','Coral']));
products.push(...variants('Google Pixel 7 Pro', 'Smartphones', ['128GB','256GB','512GB'], ['Obsidian','Hazel','Snow']));
products.push(...variants('Google Pixel 7',     'Smartphones', ['128GB','256GB'], ['Obsidian','Snow','Lemongrass']));

// ══════════════════════════════════════════════════
// SONY XPERIA
// ══════════════════════════════════════════════════

products.push(...variants('Sony Xperia 1 VI',  'Smartphones', ['256GB','512GB'], ['Black','Platinum Silver','Khaki Green']));
products.push(...variants('Sony Xperia 5 V',   'Smartphones', ['128GB','256GB'], ['Black','Platinum Silver','Blue']));
products.push(...variants('Sony Xperia 10 VI', 'Smartphones', ['128GB'], ['Black','White','Blue','Lavender']));

// ══════════════════════════════════════════════════
// HUAWEI PHONES
// ══════════════════════════════════════════════════

products.push(...variants('Huawei Mate 60 Pro', 'Smartphones', ['256GB','512GB','1TB'], ['Black','White','Brown']));
products.push(...variants('Huawei Mate 60',     'Smartphones', ['256GB','512GB'], ['Black','White','Green']));
products.push(...variants('Huawei P60 Pro',     'Smartphones', ['256GB','512GB'], ['Black','White','Rococo Pearl']));
products.push(...variants('Huawei Nova 12 Pro', 'Smartphones', ['256GB'], ['Black','White']));
products.push(...variants('Huawei Nova 12',     'Smartphones', ['128GB','256GB'], ['Black','White']));

// ══════════════════════════════════════════════════
// LAPTOPS — HP
// ══════════════════════════════════════════════════

products.push(p('HP Spectre x360 14" Core Ultra 7 16GB/1TB', 'Laptops'));
products.push(p('HP Spectre x360 14" Core Ultra 7 32GB/2TB', 'Laptops'));
products.push(p('HP Envy x360 15" Ryzen 5 8GB/512GB', 'Laptops'));
products.push(p('HP Envy x360 15" Ryzen 7 16GB/1TB', 'Laptops'));
products.push(p('HP Envy x360 13" Core Ultra 5 16GB/512GB', 'Laptops'));
products.push(p('HP Pavilion 15" Core i5 8GB/512GB', 'Laptops'));
products.push(p('HP Pavilion 15" Core i7 16GB/1TB', 'Laptops'));
products.push(p('HP Pavilion 15" Ryzen 5 8GB/512GB', 'Laptops'));
products.push(p('HP ProBook 450 G10 Core i5 8GB/256GB', 'Laptops'));
products.push(p('HP ProBook 450 G10 Core i7 16GB/512GB', 'Laptops'));
products.push(p('HP EliteBook 840 G10 Core i5 16GB/512GB', 'Laptops'));
products.push(p('HP EliteBook 840 G10 Core i7 32GB/1TB', 'Laptops'));
products.push(p('HP EliteBook 840 G10 Core i9 32GB/1TB', 'Laptops'));
products.push(p('HP ZBook Firefly 14 G10 Core i7 16GB/512GB', 'Laptops'));
products.push(p('HP ZBook Fury 16 G10 Core i9 32GB/1TB', 'Laptops'));
products.push(p('HP OMEN 16 Core i7 16GB/512GB RTX 4060', 'Laptops'));
products.push(p('HP OMEN 16 Core i9 32GB/1TB RTX 4070', 'Laptops'));

// ══════════════════════════════════════════════════
// LAPTOPS — DELL
// ══════════════════════════════════════════════════

products.push(p('Dell XPS 13 Core Ultra 5 16GB/512GB', 'Laptops'));
products.push(p('Dell XPS 13 Core Ultra 7 32GB/1TB', 'Laptops'));
products.push(p('Dell XPS 15 Core Ultra 7 16GB/512GB RTX 4060', 'Laptops'));
products.push(p('Dell XPS 15 Core Ultra 9 32GB/1TB RTX 4070', 'Laptops'));
products.push(p('Dell XPS 16 Core Ultra 9 32GB/1TB RTX 4080', 'Laptops'));
products.push(p('Dell Inspiron 15 Core i5 8GB/512GB', 'Laptops'));
products.push(p('Dell Inspiron 15 Core i7 16GB/1TB', 'Laptops'));
products.push(p('Dell Inspiron 15 Ryzen 5 8GB/512GB', 'Laptops'));
products.push(p('Dell Inspiron 16 Ryzen 7 16GB/1TB', 'Laptops'));
products.push(p('Dell Latitude 5540 Core i5 16GB/512GB', 'Laptops'));
products.push(p('Dell Latitude 5540 Core i7 16GB/512GB', 'Laptops'));
products.push(p('Dell Latitude 7440 Core i7 32GB/1TB', 'Laptops'));
products.push(p('Dell Precision 5480 Core i7 32GB/1TB', 'Laptops'));
products.push(p('Dell G15 Gaming Core i7 16GB/512GB RTX 4060', 'Laptops'));
products.push(p('Dell G16 Gaming Core i9 32GB/1TB RTX 4070', 'Laptops'));
products.push(p('Dell Alienware m16 Core i9 32GB/1TB RTX 4090', 'Laptops'));

// ══════════════════════════════════════════════════
// LAPTOPS — LENOVO
// ══════════════════════════════════════════════════

products.push(p('Lenovo ThinkPad X1 Carbon Gen 12 Core Ultra 5 16GB/512GB', 'Laptops'));
products.push(p('Lenovo ThinkPad X1 Carbon Gen 12 Core Ultra 7 32GB/1TB', 'Laptops'));
products.push(p('Lenovo ThinkPad T14s Gen 5 AMD Ryzen 7 16GB/512GB', 'Laptops'));
products.push(p('Lenovo ThinkPad T14s Gen 5 Core Ultra 7 16GB/512GB', 'Laptops'));
products.push(p('Lenovo ThinkPad L14 Gen 4 Core i5 16GB/512GB', 'Laptops'));
products.push(p('Lenovo IdeaPad 5 Pro 16" Ryzen 7 16GB/1TB', 'Laptops'));
products.push(p('Lenovo IdeaPad 5 14" Core Ultra 5 16GB/512GB', 'Laptops'));
products.push(p('Lenovo IdeaPad Slim 5 Core i5 8GB/512GB', 'Laptops'));
products.push(p('Lenovo Yoga 9i 14" Core Ultra 7 16GB/1TB', 'Laptops'));
products.push(p('Lenovo Yoga Pro 9 16" Core Ultra 9 32GB/1TB', 'Laptops'));
products.push(p('Lenovo Legion 5 Pro 16" Ryzen 9 16GB/1TB RTX 4070', 'Laptops'));
products.push(p('Lenovo Legion 7 16" Ryzen 9 32GB/1TB RTX 4090', 'Laptops'));
products.push(p('Lenovo Legion 5i Core i7 16GB/512GB RTX 4060', 'Laptops'));
products.push(p('Lenovo LOQ 15" Core i7 16GB/512GB RTX 4060', 'Laptops'));

// ══════════════════════════════════════════════════
// LAPTOPS — ASUS
// ══════════════════════════════════════════════════

products.push(p('ASUS ZenBook 14 OLED Core Ultra 7 16GB/1TB', 'Laptops'));
products.push(p('ASUS ZenBook 14 OLED Ryzen 7 16GB/512GB', 'Laptops'));
products.push(p('ASUS ZenBook Pro 16X OLED Core Ultra 9 32GB/1TB', 'Laptops'));
products.push(p('ASUS VivoBook 16 Core i5 8GB/512GB', 'Laptops'));
products.push(p('ASUS VivoBook 16 Ryzen 5 8GB/512GB', 'Laptops'));
products.push(p('ASUS VivoBook Pro 16 OLED Ryzen 9 16GB/1TB', 'Laptops'));
products.push(p('ASUS ROG Zephyrus G14 Ryzen 9 16GB/1TB RTX 4090', 'Laptops'));
products.push(p('ASUS ROG Zephyrus G16 Core Ultra 9 32GB/1TB RTX 4090', 'Laptops'));
products.push(p('ASUS ROG Strix SCAR 16 Core i9 32GB/1TB RTX 4090', 'Laptops'));
products.push(p('ASUS TUF Gaming F15 Core i7 16GB/512GB RTX 4060', 'Laptops'));
products.push(p('ASUS TUF Gaming A15 Ryzen 7 16GB/512GB RTX 4070', 'Laptops'));
products.push(p('ASUS ExpertBook B9 Core Ultra 7 32GB/1TB', 'Laptops'));

// ══════════════════════════════════════════════════
// LAPTOPS — ACER
// ══════════════════════════════════════════════════

products.push(p('Acer Swift 14 AI Core Ultra 5 16GB/512GB', 'Laptops'));
products.push(p('Acer Swift 14 AI Core Ultra 7 32GB/1TB', 'Laptops'));
products.push(p('Acer Aspire 5 Core i5 8GB/512GB', 'Laptops'));
products.push(p('Acer Aspire 5 Ryzen 5 8GB/512GB', 'Laptops'));
products.push(p('Acer Aspire 5 Core i7 16GB/1TB', 'Laptops'));
products.push(p('Acer Predator Helios 16 Core i9 32GB/1TB RTX 4080', 'Laptops'));
products.push(p('Acer Predator Helios 18 Core i9 32GB/2TB RTX 4090', 'Laptops'));
products.push(p('Acer Nitro V 15 Core i5 8GB/512GB RTX 4050', 'Laptops'));
products.push(p('Acer Nitro V 15 Core i7 16GB/1TB RTX 4060', 'Laptops'));
products.push(p('Acer ConceptD 7 Core i7 32GB/1TB RTX 3080', 'Laptops'));

// ══════════════════════════════════════════════════
// MICROSOFT SURFACE
// ══════════════════════════════════════════════════

products.push(p('Microsoft Surface Pro 10 Core Ultra 5 16GB/256GB', 'Laptops'));
products.push(p('Microsoft Surface Pro 10 Core Ultra 7 16GB/512GB', 'Laptops'));
products.push(p('Microsoft Surface Pro 10 Core Ultra 7 32GB/1TB', 'Laptops'));
products.push(p('Microsoft Surface Laptop 6 13.5" Core Ultra 5 16GB/256GB', 'Laptops'));
products.push(p('Microsoft Surface Laptop 6 13.5" Core Ultra 7 32GB/1TB', 'Laptops'));
products.push(p('Microsoft Surface Laptop 6 15" Core Ultra 7 32GB/512GB', 'Laptops'));
products.push(p('Microsoft Surface Laptop Studio 2 Core i7 32GB/1TB', 'Laptops'));

// ══════════════════════════════════════════════════
// MONITORS
// ══════════════════════════════════════════════════

products.push(p('Dell 24" FHD Monitor SE2422H', 'Monitors'));
products.push(p('Dell 27" QHD Monitor S2722QC', 'Monitors'));
products.push(p('Dell 27" 4K USB-C Monitor U2723DE', 'Monitors'));
products.push(p('Dell 32" 4K Monitor U3223QE', 'Monitors'));
products.push(p('Dell 27" Gaming Monitor G2724D 165Hz QHD', 'Monitors'));
products.push(p('Dell 34" Curved UltraWide U3423WE', 'Monitors'));
products.push(p('LG 24" FHD IPS 24ML600M', 'Monitors'));
products.push(p('LG 27" 4K IPS 27UK850-W USB-C', 'Monitors'));
products.push(p('LG 27" QHD Nano IPS 27QN880-B', 'Monitors'));
products.push(p('LG 32" 4K UHD 32UN880-B Ergo', 'Monitors'));
products.push(p('LG 27" UltraWide QHD 27WQ75QB', 'Monitors'));
products.push(p('LG 34" UltraWide QHD 34WP85C', 'Monitors'));
products.push(p('LG 45" UltraWide OLED 45GR95QE Gaming', 'Monitors'));
products.push(p('Samsung 27" Odyssey G5 LS27CG552 165Hz', 'Monitors'));
products.push(p('Samsung 32" Odyssey G6 LS32BG652 240Hz QHD', 'Monitors'));
products.push(p('Samsung 32" Smart Monitor M8 4K', 'Monitors'));
products.push(p('ASUS ProArt 27" 4K PA279CRV USB-C', 'Monitors'));
products.push(p('ASUS ROG Swift 27" PG279QM 240Hz QHD', 'Monitors'));
products.push(p('ASUS TUF Gaming 27" VG27AQL3A 170Hz QHD', 'Monitors'));
products.push(p('AOC 27" Q27P2Q QHD IPS', 'Monitors'));
products.push(p('AOC 24" 24G2 144Hz FHD', 'Monitors'));
products.push(p('BenQ 27" EW2880U 4K USB-C', 'Monitors'));
products.push(p('BenQ 32" PD3220U 4K Thunderbolt 3', 'Monitors'));
products.push(p('Philips 27" 276E9QJAB FHD', 'Monitors'));

// ══════════════════════════════════════════════════
// NETWORKING — TP-LINK ROUTERS
// ══════════════════════════════════════════════════

products.push(p('TP-Link Archer BE900 WiFi 7 Tri-Band', 'Networking'));
products.push(p('TP-Link Archer BE800 WiFi 7 Tri-Band', 'Networking'));
products.push(p('TP-Link Archer BE550 WiFi 7 Dual-Band', 'Networking'));
products.push(p('TP-Link Archer AX90 WiFi 6 AX6600 Tri-Band', 'Networking'));
products.push(p('TP-Link Archer AX73 WiFi 6 AX5400', 'Networking'));
products.push(p('TP-Link Archer AX55 WiFi 6 AX3000', 'Networking'));
products.push(p('TP-Link Archer AX23 WiFi 6 AX1800', 'Networking'));
products.push(p('TP-Link Archer C80 AC1900 MU-MIMO', 'Networking'));
products.push(p('TP-Link Archer C6 AC1200', 'Networking'));
products.push(p('TP-Link TL-WR941ND N450 Router', 'Networking'));
products.push(p('TP-Link Archer MR600 4G+ Cat18 Router', 'Networking'));
products.push(p('TP-Link Archer MR200 4G LTE Router', 'Networking'));
products.push(p('TP-Link TL-MR6400 4G LTE Router', 'Networking'));

// TP-Link Switches
products.push(p('TP-Link TL-SG108 8-Port Gigabit Switch', 'Networking'));
products.push(p('TP-Link TL-SG116 16-Port Gigabit Switch', 'Networking'));
products.push(p('TP-Link TL-SG1024D 24-Port Gigabit Switch', 'Networking'));
products.push(p('TP-Link TL-SG1048 48-Port Gigabit Switch', 'Networking'));
products.push(p('TP-Link TL-SF1008D 8-Port 10/100 Switch', 'Networking'));
products.push(p('TP-Link TL-SG108E 8-Port Easy Smart Switch', 'Networking'));
products.push(p('TP-Link TL-SG116E 16-Port Easy Smart Switch', 'Networking'));
products.push(p('TP-Link TL-SG2210P 10-Port Smart Switch PoE', 'Networking'));
products.push(p('TP-Link TL-SG2428P 24-Port Gigabit Smart Switch PoE+', 'Networking'));
products.push(p('TP-Link TL-SG3428 24-Port L3 Managed Switch', 'Networking'));
products.push(p('TP-Link TL-SG3452P 48-Port L3 Managed Switch PoE+', 'Networking'));

// TP-Link Access Points
products.push(p('TP-Link EAP670 WiFi 6 AX3600 Ceiling AP', 'Networking'));
products.push(p('TP-Link EAP660 HD WiFi 6 AX3600 Ceiling AP', 'Networking'));
products.push(p('TP-Link EAP650 WiFi 6 AX3000 Ceiling AP', 'Networking'));
products.push(p('TP-Link EAP245 WiFi 5 AC1750 Ceiling AP', 'Networking'));
products.push(p('TP-Link EAP225 WiFi 5 AC1350 Ceiling AP', 'Networking'));
products.push(p('TP-Link EAP115 N300 Ceiling AP', 'Networking'));
products.push(p('TP-Link EAP610-Outdoor WiFi 6 AX1800', 'Networking'));

// TP-Link Deco Mesh
products.push(p('TP-Link Deco XE200 WiFi 6E Mesh (1-Pack)', 'Networking'));
products.push(p('TP-Link Deco XE200 WiFi 6E Mesh (2-Pack)', 'Networking'));
products.push(p('TP-Link Deco XE75 Pro WiFi 6E Mesh (2-Pack)', 'Networking'));
products.push(p('TP-Link Deco X90 WiFi 6 Tri-Band Mesh (2-Pack)', 'Networking'));
products.push(p('TP-Link Deco X60 WiFi 6 AX3000 Mesh (2-Pack)', 'Networking'));
products.push(p('TP-Link Deco X60 WiFi 6 AX3000 Mesh (3-Pack)', 'Networking'));
products.push(p('TP-Link Deco M9 Plus Tri-Band Mesh (2-Pack)', 'Networking'));
products.push(p('TP-Link Deco M5 AC1300 Mesh (2-Pack)', 'Networking'));
products.push(p('TP-Link Deco M5 AC1300 Mesh (3-Pack)', 'Networking'));

// TP-Link Range Extenders
products.push(p('TP-Link RE700X WiFi 6 AX3000 Range Extender', 'Networking'));
products.push(p('TP-Link RE550 AC1900 Range Extender', 'Networking'));
products.push(p('TP-Link RE300 AC1200 Range Extender', 'Networking'));

// TP-Link USB Adapters & Other
products.push(p('TP-Link Archer TX20U Plus USB WiFi 6 Adapter', 'Networking'));
products.push(p('TP-Link TL-WN823N 300Mbps USB WiFi Adapter', 'Networking'));
products.push(p('TP-Link TL-PA9020P KIT Powerline 2000Mbps (2-Pack)', 'Networking'));

// ══════════════════════════════════════════════════
// NETWORKING — CISCO
// ══════════════════════════════════════════════════

products.push(p('Cisco Catalyst 1000-8T 8-Port Gigabit Switch', 'Networking'));
products.push(p('Cisco Catalyst 1000-16T 16-Port Gigabit Switch', 'Networking'));
products.push(p('Cisco Catalyst 1000-24T 24-Port Gigabit Switch', 'Networking'));
products.push(p('Cisco Catalyst 1000-48T 48-Port Gigabit Switch', 'Networking'));
products.push(p('Cisco Catalyst 1000-8FP 8-Port PoE+ Switch', 'Networking'));
products.push(p('Cisco Catalyst 1000-24FP 24-Port PoE+ Switch', 'Networking'));
products.push(p('Cisco Catalyst 2960-X 24TS 24-Port Switch', 'Networking'));
products.push(p('Cisco Catalyst 2960-X 48TS 48-Port Switch', 'Networking'));
products.push(p('Cisco Catalyst 9200L-24T 24-Port Switch', 'Networking'));
products.push(p('Cisco Catalyst 9200L-48T 48-Port Switch', 'Networking'));
products.push(p('Cisco Catalyst 9200L-24P 24-Port PoE Switch', 'Networking'));
products.push(p('Cisco ISR 1100-4G Router', 'Networking'));
products.push(p('Cisco ISR 1100-6G Router', 'Networking'));
products.push(p('Cisco RV340 Dual WAN VPN Router', 'Networking'));
products.push(p('Cisco RV345 Dual WAN VPN Router', 'Networking'));
products.push(p('Cisco Meraki MX64 Security Appliance', 'Networking'));
products.push(p('Cisco Meraki MX68 Security Appliance', 'Networking'));
products.push(p('Cisco Meraki MS120-8FP 8-Port PoE Switch', 'Networking'));
products.push(p('Cisco Meraki MR46 WiFi 6 Access Point', 'Networking'));
products.push(p('Cisco SG350-10 10-Port Managed Switch', 'Networking'));
products.push(p('Cisco SG350-28 28-Port Managed Switch', 'Networking'));
products.push(p('Cisco SG550X-24 24-Port Stackable Managed Switch', 'Networking'));

// ══════════════════════════════════════════════════
// NETWORKING — UBIQUITI UNIFI
// ══════════════════════════════════════════════════

products.push(p('Ubiquiti UniFi Dream Machine Pro (UDM-Pro)', 'Networking'));
products.push(p('Ubiquiti UniFi Dream Machine SE (UDM-SE)', 'Networking'));
products.push(p('Ubiquiti UniFi Dream Router (UDR)', 'Networking'));
products.push(p('Ubiquiti UniFi Dream Machine (UDM)', 'Networking'));
products.push(p('Ubiquiti UniFi Gateway Max (UXG-Max)', 'Networking'));
products.push(p('Ubiquiti UniFi USW-Pro-24 24-Port Managed Switch', 'Networking'));
products.push(p('Ubiquiti UniFi USW-Pro-48 48-Port Managed Switch', 'Networking'));
products.push(p('Ubiquiti UniFi USW-24 24-Port Switch', 'Networking'));
products.push(p('Ubiquiti UniFi USW-48 48-Port Switch', 'Networking'));
products.push(p('Ubiquiti UniFi USW-Flex-Mini 5-Port Switch', 'Networking'));
products.push(p('Ubiquiti UniFi USW-Lite-8-PoE 8-Port PoE Switch', 'Networking'));
products.push(p('Ubiquiti UniFi USW-24-PoE 24-Port PoE Switch', 'Networking'));
products.push(p('Ubiquiti UniFi U6-Pro WiFi 6 Access Point', 'Networking'));
products.push(p('Ubiquiti UniFi U6-Lite WiFi 6 Access Point', 'Networking'));
products.push(p('Ubiquiti UniFi U6-Mesh WiFi 6 Outdoor AP', 'Networking'));
products.push(p('Ubiquiti UniFi U6-Long-Range WiFi 6 AP', 'Networking'));
products.push(p('Ubiquiti UniFi U6-Enterprise WiFi 6E AP', 'Networking'));
products.push(p('Ubiquiti UniFi UAP-AC-Pro WiFi 5 Access Point', 'Networking'));
products.push(p('Ubiquiti UniFi UAP-AC-LR WiFi 5 Long Range AP', 'Networking'));
products.push(p('Ubiquiti UniFi NVR (Network Video Recorder)', 'Networking'));
products.push(p('Ubiquiti UniFi UVC-G4-Dome Camera', 'Networking'));
products.push(p('Ubiquiti UniFi UVC-G4-Pro Camera', 'Networking'));
products.push(p('Ubiquiti UniFi UVC-G4-Bullet Outdoor Camera', 'Networking'));
products.push(p('Ubiquiti UniFi UPS-PRO Uninterruptible Power', 'Networking'));

// ══════════════════════════════════════════════════
// NETWORKING — NETGEAR
// ══════════════════════════════════════════════════

products.push(p('Netgear Nighthawk RS700S WiFi 7 BE19000', 'Networking'));
products.push(p('Netgear Nighthawk RS600 WiFi 6E AXE5400', 'Networking'));
products.push(p('Netgear Nighthawk RAX200 WiFi 6 AX12000', 'Networking'));
products.push(p('Netgear Nighthawk RAX120 WiFi 6 AX12000', 'Networking'));
products.push(p('Netgear Nighthawk RAX50 WiFi 6 AX6000', 'Networking'));
products.push(p('Netgear Orbi 960 WiFi 6E Mesh (2-Pack)', 'Networking'));
products.push(p('Netgear Orbi 960 WiFi 6E Mesh (3-Pack)', 'Networking'));
products.push(p('Netgear Orbi 760 WiFi 6 AX8700 Mesh (2-Pack)', 'Networking'));
products.push(p('Netgear Orbi 750 WiFi 6 AX8700 Mesh (3-Pack)', 'Networking'));
products.push(p('Netgear ProSAFE GS308 8-Port Gigabit Switch', 'Networking'));
products.push(p('Netgear ProSAFE GS316 16-Port Gigabit Switch', 'Networking'));
products.push(p('Netgear ProSAFE GS324 24-Port Gigabit Switch', 'Networking'));
products.push(p('Netgear ProSAFE GS348 48-Port Gigabit Switch', 'Networking'));
products.push(p('Netgear ProSAFE GS308P 8-Port PoE Switch', 'Networking'));
products.push(p('Netgear ProSAFE MS510TXM 10-Port Multi-Gig Smart Switch', 'Networking'));
products.push(p('Netgear ProSAFE GS728TP 28-Port PoE Smart Switch', 'Networking'));
products.push(p('Netgear WAX630 WiFi 6 Tri-Band Access Point', 'Networking'));
products.push(p('Netgear WAX620 WiFi 6 Dual-Band Access Point', 'Networking'));

// ══════════════════════════════════════════════════
// NETWORKING — D-LINK
// ══════════════════════════════════════════════════

products.push(p('D-Link DIR-X5460 WiFi 6 AX5400 Router', 'Networking'));
products.push(p('D-Link DIR-X3260 WiFi 6 AX3200 Router', 'Networking'));
products.push(p('D-Link DIR-X1560 WiFi 6 AX1500 Router', 'Networking'));
products.push(p('D-Link DIR-2680 AC2600 MU-MIMO Router', 'Networking'));
products.push(p('D-Link DWR-960 4G LTE AC1200 Router', 'Networking'));
products.push(p('D-Link DGS-1008D 8-Port Gigabit Switch', 'Networking'));
products.push(p('D-Link DGS-1016A 16-Port Gigabit Switch', 'Networking'));
products.push(p('D-Link DGS-1024D 24-Port Gigabit Switch', 'Networking'));
products.push(p('D-Link DGS-1210-10P 10-Port Smart Switch PoE', 'Networking'));
products.push(p('D-Link DGS-1210-28P 28-Port Smart Switch PoE', 'Networking'));
products.push(p('D-Link DAP-X2850 WiFi 6 AX3600 Access Point', 'Networking'));
products.push(p('D-Link DAP-X1860 WiFi 6 AX1800 Range Extender', 'Networking'));
products.push(p('D-Link DAP-2680 WiFi 5 AC2300 Access Point', 'Networking'));

// ══════════════════════════════════════════════════
// NETWORKING — MIKROTIK
// ══════════════════════════════════════════════════

products.push(p('MikroTik hAP ax3 WiFi 6 Home Router', 'Networking'));
products.push(p('MikroTik hAP ax2 WiFi 6 Home Router', 'Networking'));
products.push(p('MikroTik hAP ac3 WiFi 5 Home Router', 'Networking'));
products.push(p('MikroTik hAP lite WiFi 4 Small Router', 'Networking'));
products.push(p('MikroTik RB5009UG+S+IN Multi-Port Router', 'Networking'));
products.push(p('MikroTik RB4011iGS+5HacQ2HnD Router WiFi 5', 'Networking'));
products.push(p('MikroTik CCR2004-1G-12S+2XS Cloud Core Router', 'Networking'));
products.push(p('MikroTik CCR2116-12G-4S+ Cloud Core Router', 'Networking'));
products.push(p('MikroTik CCR1036-8G-2S+ Cloud Core Router', 'Networking'));
products.push(p('MikroTik CRS326-24G-2S+ Cloud Router Switch', 'Networking'));
products.push(p('MikroTik CRS328-24P-4S+ 24-Port PoE Switch', 'Networking'));
products.push(p('MikroTik CRS354-48P-4S+2Q+ 48-Port PoE Switch', 'Networking'));
products.push(p('MikroTik CRS112-8P-4S-IN 8-Port PoE Switch', 'Networking'));
products.push(p('MikroTik SXTsq 5 ac Outdoor AP', 'Networking'));
products.push(p('MikroTik BaseBox 5 Outdoor AP', 'Networking'));
products.push(p('MikroTik LHG 5 ac Long Range AP', 'Networking'));
products.push(p('MikroTik Groove 52 Dual-Band Outdoor AP', 'Networking'));
products.push(p('MikroTik wAP ac RUT Outdoor AP', 'Networking'));
products.push(p('MikroTik mAP mini Travel Router', 'Networking'));
products.push(p('MikroTik Audience Tri-Band Home AP', 'Networking'));

// ══════════════════════════════════════════════════
// NETWORKING — HUAWEI
// ══════════════════════════════════════════════════

products.push(p('Huawei AX3 Pro WiFi 6 Plus Router', 'Networking'));
products.push(p('Huawei AX3 WiFi 6 Router', 'Networking'));
products.push(p('Huawei WiFi Mesh 7 WiFi 7 (2-Pack)', 'Networking'));
products.push(p('Huawei WiFi Q2 Pro Mesh Router', 'Networking'));
products.push(p('Huawei S5735-L24T4S 24-Port Campus Switch', 'Networking'));
products.push(p('Huawei S5735-L48T4S 48-Port Campus Switch', 'Networking'));
products.push(p('Huawei S5720-28X-PWR-SI 24-Port PoE Switch', 'Networking'));
products.push(p('Huawei AP6050DN Indoor WiFi 5 Access Point', 'Networking'));
products.push(p('Huawei AP7060DN Indoor WiFi 6 Access Point', 'Networking'));
products.push(p('Huawei AR617VW 4G LTE Router', 'Networking'));

// ══════════════════════════════════════════════════
// PRINTERS — HP
// ══════════════════════════════════════════════════

products.push(p('HP LaserJet Pro M404dn Mono Laser Printer', 'Printers'));
products.push(p('HP LaserJet Pro M428fdw Mono MFP', 'Printers'));
products.push(p('HP LaserJet Enterprise M507dn Mono Laser', 'Printers'));
products.push(p('HP Color LaserJet Pro M454dn Color Laser', 'Printers'));
products.push(p('HP Color LaserJet Pro M479fdw Color MFP', 'Printers'));
products.push(p('HP Color LaserJet Enterprise M555dn Color Laser', 'Printers'));
products.push(p('HP OfficeJet Pro 9015e All-in-One Inkjet', 'Printers'));
products.push(p('HP OfficeJet Pro 8025e All-in-One Inkjet', 'Printers'));
products.push(p('HP OfficeJet Pro 9125e All-in-One', 'Printers'));
products.push(p('HP DeskJet 4155e All-in-One Inkjet', 'Printers'));
products.push(p('HP ENVY 6455e All-in-One Inkjet', 'Printers'));
products.push(p('HP PageWide Pro 477dw MFP', 'Printers'));

// HP Cartridges
products.push(p('HP 305 Black Ink Cartridge', 'Printer Consumables'));
products.push(p('HP 305 Tri-Color Ink Cartridge', 'Printer Consumables'));
products.push(p('HP 305XL Black High Yield Cartridge', 'Printer Consumables'));
products.push(p('HP 305XL Tri-Color High Yield Cartridge', 'Printer Consumables'));
products.push(p('HP 206A Black Toner Cartridge', 'Printer Consumables'));
products.push(p('HP 206A Cyan Toner Cartridge', 'Printer Consumables'));
products.push(p('HP 206A Magenta Toner Cartridge', 'Printer Consumables'));
products.push(p('HP 206A Yellow Toner Cartridge', 'Printer Consumables'));
products.push(p('HP 206X Black High Yield Toner', 'Printer Consumables'));

// ══════════════════════════════════════════════════
// PRINTERS — CANON
// ══════════════════════════════════════════════════

products.push(p('Canon PIXMA G3470 MegaTank Wireless MFP', 'Printers'));
products.push(p('Canon PIXMA G7070 MegaTank Business MFP', 'Printers'));
products.push(p('Canon PIXMA G4470 MegaTank MFP with Fax', 'Printers'));
products.push(p('Canon imageRUNNER 1643i Mono MFP', 'Printers'));
products.push(p('Canon imageRUNNER 1643iF Mono MFP with Fax', 'Printers'));
products.push(p('Canon imageRUNNER ADVANCE C3530i Color MFP', 'Printers'));
products.push(p('Canon imageRUNNER ADVANCE DX C3730i Color MFP', 'Printers'));
products.push(p('Canon SELPHY CP1500 Compact Photo Printer', 'Printers'));
products.push(p('Canon GI-73 Black Ink Bottle (MegaTank)', 'Printer Consumables'));
products.push(p('Canon GI-73 Cyan Ink Bottle (MegaTank)', 'Printer Consumables'));
products.push(p('Canon GI-73 Magenta Ink Bottle (MegaTank)', 'Printer Consumables'));
products.push(p('Canon GI-73 Yellow Ink Bottle (MegaTank)', 'Printer Consumables'));

// ══════════════════════════════════════════════════
// PRINTERS — EPSON
// ══════════════════════════════════════════════════

products.push(p('Epson EcoTank ET-2803 Wireless MFP', 'Printers'));
products.push(p('Epson EcoTank ET-4850 Wireless MFP', 'Printers'));
products.push(p('Epson EcoTank L3250 MFP', 'Printers'));
products.push(p('Epson EcoTank L5290 Wi-Fi MFP', 'Printers'));
products.push(p('Epson EcoTank L6490 Wi-Fi MFP with ADF', 'Printers'));
products.push(p('Epson WorkForce Pro WF-4834 Wireless MFP', 'Printers'));
products.push(p('Epson WorkForce WF-2930 Wireless MFP', 'Printers'));
products.push(p('Epson EcoTank 001 Black Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 001 Cyan Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 001 Magenta Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 001 Yellow Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 003 Black Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 003 Cyan Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 003 Magenta Ink Bottle', 'Printer Consumables'));
products.push(p('Epson EcoTank 003 Yellow Ink Bottle', 'Printer Consumables'));

// ══════════════════════════════════════════════════
// PRINTERS — BROTHER
// ══════════════════════════════════════════════════

products.push(p('Brother HL-L2350DW Mono Laser Printer', 'Printers'));
products.push(p('Brother HL-L2395DW Mono Laser Printer', 'Printers'));
products.push(p('Brother MFC-L2750DW Mono Laser MFP', 'Printers'));
products.push(p('Brother MFC-L2850DW Mono Laser MFP', 'Printers'));
products.push(p('Brother HL-L3270CDW Color Laser Printer', 'Printers'));
products.push(p('Brother MFC-L3770CDW Color Laser MFP', 'Printers'));
products.push(p('Brother PT-E550W Label Printer', 'Printers'));
products.push(p('Brother PT-P750W Label Printer', 'Printers'));
products.push(p('Brother TN-2480 Black Toner Cartridge', 'Printer Consumables'));
products.push(p('Brother TN-2480 High Yield Toner', 'Printer Consumables'));
products.push(p('Brother DR-2455 Drum Unit', 'Printer Consumables'));

// ══════════════════════════════════════════════════
// ACCESSORIES
// ══════════════════════════════════════════════════

products.push(p('USB-C Hub 7-in-1 (HDMI, USB-A×3, SD, MicroSD, PD)', 'Accessories'));
products.push(p('USB-C Hub 12-in-1 (HDMI, DP, USB-A, Ethernet, SD)', 'Accessories'));
products.push(p('USB-C Docking Station Triple Display 13-in-1', 'Accessories'));
products.push(p('USB-C to HDMI Cable 2m 4K', 'Accessories'));
products.push(p('USB-C to USB-C Cable 1m 100W', 'Accessories'));
products.push(p('USB-C to USB-C Cable 2m 240W', 'Accessories'));
products.push(p('USB-A to USB-C Cable 1m', 'Accessories'));
products.push(p('USB-A to USB-C Cable 2m', 'Accessories'));
products.push(p('USB-C to Lightning Cable 1m', 'Accessories'));
products.push(p('USB-C to Lightning Cable 2m', 'Accessories'));
products.push(p('HDMI to HDMI Cable 2m 4K', 'Accessories'));
products.push(p('HDMI to HDMI Cable 5m 4K', 'Accessories'));
products.push(p('DisplayPort Cable 1.8m 4K 144Hz', 'Accessories'));
products.push(p('Thunderbolt 4 Cable 1m 40Gbps', 'Accessories'));
products.push(p('RJ45 Cat6 Patch Cable 1m', 'Accessories'));
products.push(p('RJ45 Cat6 Patch Cable 3m', 'Accessories'));
products.push(p('RJ45 Cat6 Patch Cable 5m', 'Accessories'));
products.push(p('RJ45 Cat6 Patch Cable 10m', 'Accessories'));
products.push(p('Cat6 UTP Cable Roll 305m', 'Accessories'));
products.push(p('Power Bank 10000mAh 22.5W Fast Charge', 'Accessories'));
products.push(p('Power Bank 20000mAh 65W USB-C PD', 'Accessories'));
products.push(p('Power Bank 30000mAh 65W USB-C PD', 'Accessories'));
products.push(p('Wireless Charger 15W Qi2 Pad', 'Accessories'));
products.push(p('MagSafe Compatible 15W Wireless Charger', 'Accessories'));
products.push(p('3-in-1 Wireless Charging Station', 'Accessories'));
products.push(p('65W GaN USB-C Wall Charger 2-Port', 'Accessories'));
products.push(p('100W GaN USB-C Wall Charger 3-Port', 'Accessories'));
products.push(p('120W GaN Fast Charger 4-Port', 'Accessories'));
products.push(p('6-Port USB Charging Station 60W', 'Accessories'));
products.push(p('Portable SSD 500GB USB-C', 'Accessories'));
products.push(p('Portable SSD 1TB USB-C', 'Accessories'));
products.push(p('Portable SSD 2TB USB-C', 'Accessories'));
products.push(p('USB Flash Drive 32GB USB 3.0', 'Accessories'));
products.push(p('USB Flash Drive 64GB USB 3.0', 'Accessories'));
products.push(p('USB Flash Drive 128GB USB 3.0', 'Accessories'));
products.push(p('USB Flash Drive 256GB USB 3.0', 'Accessories'));
products.push(p('MicroSD Card 64GB Class 10 A2', 'Accessories'));
products.push(p('MicroSD Card 128GB Class 10 A2', 'Accessories'));
products.push(p('MicroSD Card 256GB Class 10 A2', 'Accessories'));
products.push(p('MicroSD Card 512GB Class 10 A2', 'Accessories'));
products.push(p('SD Card 64GB UHS-I V30', 'Accessories'));
products.push(p('SD Card 128GB UHS-I V30', 'Accessories'));
products.push(p('SD Card 256GB UHS-II V60', 'Accessories'));
products.push(p('Laptop Stand Aluminum Adjustable', 'Accessories'));
products.push(p('Phone & Tablet Stand Desktop', 'Accessories'));
products.push(p('Monitor Arm Single VESA Mount', 'Accessories'));
products.push(p('Monitor Arm Dual VESA Mount', 'Accessories'));
products.push(p('Cable Management Box', 'Accessories'));
products.push(p('Surge Protector 6-Outlet with USB', 'Accessories'));
products.push(p('UPS 650VA 360W Desktop', 'Accessories'));
products.push(p('UPS 1000VA 600W Desktop', 'Accessories'));
products.push(p('UPS 1500VA 900W Desktop', 'Accessories'));
products.push(p('Mechanical Keyboard TKL Wired', 'Accessories'));
products.push(p('Mechanical Keyboard Full-Size Wireless', 'Accessories'));
products.push(p('Wireless Mouse Ergonomic', 'Accessories'));
products.push(p('Wireless Mouse Compact', 'Accessories'));
products.push(p('Wireless Keyboard & Mouse Combo', 'Accessories'));
products.push(p('Webcam 1080p USB with Mic', 'Accessories'));
products.push(p('Webcam 4K USB with AI Tracking', 'Accessories'));
products.push(p('USB Microphone Condenser', 'Accessories'));
products.push(p('Noise-Cancelling Headset USB-C', 'Accessories'));
products.push(p('Over-Ear Bluetooth Headphones', 'Accessories'));
products.push(p('Wireless Earbuds TWS Noise-Cancelling', 'Accessories'));
products.push(p('Bluetooth Speaker Portable Waterproof', 'Accessories'));
products.push(p('Bluetooth Speaker Desktop HiFi', 'Accessories'));
products.push(p('Screen Protector Tempered Glass (Universal)', 'Accessories'));
products.push(p('Privacy Screen Filter 15.6"', 'Accessories'));
products.push(p('Laptop Sleeve 13"', 'Accessories'));
products.push(p('Laptop Sleeve 14"', 'Accessories'));
products.push(p('Laptop Sleeve 15.6"', 'Accessories'));
products.push(p('Laptop Backpack 15.6" Anti-Theft', 'Accessories'));
products.push(p('Laptop Bag 14" Briefcase', 'Accessories'));
products.push(p('DSLR Camera Bag', 'Accessories'));
products.push(p('Thermal Paste 4g (CPU)', 'Accessories'));
products.push(p('Compressed Air Duster Can', 'Accessories'));
products.push(p('Anti-Static Wrist Strap', 'Accessories'));

// ══════════════════════════════════════════════════
// CAMERAS
// ══════════════════════════════════════════════════

products.push(p('Sony Alpha A7 IV Mirrorless Body', 'Cameras'));
products.push(p('Sony Alpha A7R V Mirrorless Body', 'Cameras'));
products.push(p('Sony Alpha ZV-E10 II Mirrorless Body', 'Cameras'));
products.push(p('Canon EOS R6 Mark II Mirrorless Body', 'Cameras'));
products.push(p('Canon EOS R8 Mirrorless Body', 'Cameras'));
products.push(p('Canon EOS R50 Mirrorless Body', 'Cameras'));
products.push(p('Nikon Z6 III Mirrorless Body', 'Cameras'));
products.push(p('Nikon Z50 II Mirrorless Body', 'Cameras'));
products.push(p('Fujifilm X-T5 Mirrorless Body', 'Cameras'));
products.push(p('Fujifilm X-S20 Mirrorless Body', 'Cameras'));
products.push(p('Canon EF 50mm f/1.8 STM Lens', 'Cameras'));
products.push(p('Sony FE 24-70mm f/2.8 GM II Lens', 'Cameras'));
products.push(p('DJI Osmo Pocket 3 Camera', 'Cameras'));
products.push(p('GoPro Hero 12 Black', 'Cameras'));

// ══════════════════════════════════════════════════
// STATIONERY
// ══════════════════════════════════════════════════

products.push(p('A4 Copy Paper 80gsm Ream (500 sheets)', 'Stationery'));
products.push(p('A4 Copy Paper 75gsm Ream (500 sheets)', 'Stationery'));
products.push(p('A3 Copy Paper 80gsm Ream (500 sheets)', 'Stationery'));
products.push(p('A4 Copy Paper Box (5 Reams)', 'Stationery'));

// Pens
['Blue','Black','Red'].forEach(c => {
  products.push(p(`Bic Cristal Ballpoint Pen ${c} (Box of 50)`, 'Stationery'));
  products.push(p(`Pilot BP-S Ballpoint Pen ${c} (Box of 12)`, 'Stationery'));
  products.push(p(`Pilot G2 Gel Pen ${c} (Box of 12)`, 'Stationery'));
});
products.push(p('Parker Jotter Ballpoint Pen Blue', 'Stationery'));
products.push(p('Parker Jotter Ballpoint Pen Black', 'Stationery'));
products.push(p('Staedtler Triplus Fineliner 0.3mm (20 Colors)', 'Stationery'));
['Black','Blue','Red','Green'].forEach(c =>
  products.push(p(`Sharpie Permanent Marker ${c} (Box of 12)`, 'Stationery'))
);
products.push(p('Highlighter Set Assorted (5 Colors)', 'Stationery'));
products.push(p('Whiteboard Marker Assorted (4 Colors)', 'Stationery'));
products.push(p('Whiteboard Eraser', 'Stationery'));

// Notebooks & Paper Products
products.push(p('Moleskine Classic Notebook A5 Hardcover Ruled', 'Stationery'));
products.push(p('Moleskine Classic Notebook A4 Hardcover Ruled', 'Stationery'));
products.push(p('Oxford Notebook A4 Hardcover 192 Pages', 'Stationery'));
products.push(p('Spiral Notebook A4 100 Pages', 'Stationery'));
products.push(p('Spiral Notebook A5 80 Pages', 'Stationery'));
products.push(p('Legal Pad A4 Yellow (Pack of 12)', 'Stationery'));
products.push(p('Post-it Notes 76×76mm (Pack of 12)', 'Stationery'));
products.push(p('Post-it Notes 127×76mm Large (Pack of 6)', 'Stationery'));
products.push(p('Index Cards 100×150mm (Pack of 100)', 'Stationery'));

// Filing & Organisation
products.push(p('A4 Clear File Folder Pockets (Pack of 10)', 'Stationery'));
products.push(p('A4 Ring Binder 2-Ring 25mm', 'Stationery'));
products.push(p('A4 Ring Binder 4-Ring 50mm', 'Stationery'));
products.push(p('Manila Folder A4 (Pack of 50)', 'Stationery'));
products.push(p('Hanging Files A4 (Box of 25)', 'Stationery'));
products.push(p('Filing Cabinet 3-Drawer Steel', 'Stationery'));
products.push(p('Document Tray 3-Tier Desktop', 'Stationery'));
products.push(p('Lever Arch File A4 70mm', 'Stationery'));
products.push(p('Lever Arch File A4 Box (10 Pieces)', 'Stationery'));

// Desk Supplies
products.push(p('Scotch Tape 19mm×33m (Pack of 6)', 'Stationery'));
products.push(p('Packing Tape 48mm×50m Clear', 'Stationery'));
products.push(p('Double-Sided Tape 12mm×33m', 'Stationery'));
products.push(p('Stapler Desktop 24/6', 'Stationery'));
products.push(p('Staples 26/6 Box (5000 Pieces)', 'Stationery'));
products.push(p('Heavy Duty Stapler 24/8', 'Stationery'));
products.push(p('Staple Remover Claw Type', 'Stationery'));
products.push(p('Paper Clips 28mm (Box of 100)', 'Stationery'));
products.push(p('Binder Clips 25mm (Box of 12)', 'Stationery'));
products.push(p('Binder Clips 41mm (Box of 12)', 'Stationery'));
products.push(p('Scissors 210mm Stainless Steel', 'Stationery'));
products.push(p('Craft Knife with 10 Blades', 'Stationery'));
products.push(p('Steel Ruler 30cm', 'Stationery'));
products.push(p('Desk Organizer 5-Section', 'Stationery'));
products.push(p('Correction Fluid White 20ml', 'Stationery'));
products.push(p('Correction Tape 5mm×12m (Pack of 2)', 'Stationery'));
products.push(p('Glue Stick 40g', 'Stationery'));
products.push(p('PVA Glue 100ml', 'Stationery'));
products.push(p('HB Pencils (Box of 12)', 'Stationery'));
products.push(p('2B Pencils (Box of 12)', 'Stationery'));
products.push(p('Mechanical Pencil 0.5mm', 'Stationery'));
products.push(p('Mechanical Pencil Leads 0.5mm HB (40 Pieces)', 'Stationery'));
products.push(p('Eraser White (Pack of 10)', 'Stationery'));
products.push(p('Pencil Sharpener Metal', 'Stationery'));
products.push(p('Scientific Calculator Casio FX-991EX', 'Stationery'));
products.push(p('Basic Calculator 12-Digit Desktop', 'Stationery'));
products.push(p('Whiteboard 60×90cm Magnetic', 'Stationery'));
products.push(p('Whiteboard 90×120cm Magnetic', 'Stationery'));
products.push(p('Noticeboard 60×90cm Cork', 'Stationery'));
products.push(p('Laminator A4 Pouches (Box of 100)', 'Stationery'));
products.push(p('Laminator Machine A4 Hot/Cold', 'Stationery'));
products.push(p('Paper Shredder Cross-Cut 10 Sheets', 'Stationery'));
products.push(p('Paper Shredder Micro-Cut 8 Sheets', 'Stationery'));
products.push(p('Electric Hole Punch 3-Hole', 'Stationery'));
products.push(p('Manual Hole Punch 3-Hole', 'Stationery'));

// ─── insert ─────────────────────────────────────────────────────────────────

async function insertBatch(batch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
}

async function seed() {
  const BATCH = 50;
  console.log(`\n📦  Seeding ${products.length} products in batches of ${BATCH}…\n`);

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    await insertBatch(batch);
    const done = Math.min(i + BATCH, products.length);
    process.stdout.write(`\r   ✔  ${done} / ${products.length}`);
  }

  console.log(`\n\n✅  Done! ${products.length} products seeded.`);
  console.log('   Price is set to 1 as a placeholder — update when invoicing.');
  console.log('   Stock is 0 — add stock as inventory arrives.\n');
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
