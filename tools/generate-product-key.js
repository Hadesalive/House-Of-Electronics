/**
 * Product Key Generator
 * 
 * Generates a simple product key for internal use.
 * Run this once to get your master product key, then use it everywhere.
 * 
 * Usage: node tools/generate-product-key.js [your-secret-key]
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateProductKey(secretKey) {
  if (!secretKey) {
    console.error('❌ Error: Please provide a secret key');
    console.log('\nUsage: node tools/generate-product-key.js YOUR_SECRET_KEY');
    process.exit(1);
  }

  // Normalize the key
  const normalizedKey = secretKey.trim().replace(/\s+/g, '').toUpperCase();
  
  // Generate hash
  const hash = crypto.createHash('sha256').update(normalizedKey).digest('hex');
  
  // Format as a readable product key (e.g., XXXX-XXXX-XXXX-XXXX)
  const formattedKey = normalizedKey.length > 16 
    ? normalizedKey.substring(0, 16).match(/.{1,4}/g).join('-')
    : normalizedKey.match(/.{1,4}/g)?.join('-') || normalizedKey;

  console.log('\n✅ Product Key Generated!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 PRODUCT KEY (Use this for activation):');
  console.log(`   ${formattedKey}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔐 HASH (Store this in your code):');
  console.log(`   ${hash}`);
  console.log('\n📋 To use this hash, set it in product-key-service.js:');
  console.log(`   this.masterKeyHash = '${hash}';`);
  console.log('\n⚠️  IMPORTANT: Keep your original secret key safe!');
  console.log('   Only you should know the original key.');
  console.log('   The hash is safe to include in your code.\n');
  
  rl.close();
}

// Get secret key from command line or prompt
const secretKey = process.argv[2];

if (secretKey) {
  generateProductKey(secretKey);
} else {
  rl.question('Enter your secret product key: ', (input) => {
    if (!input.trim()) {
      console.error('❌ Error: Secret key cannot be empty');
      rl.close();
      process.exit(1);
    }
    generateProductKey(input);
  });
}
