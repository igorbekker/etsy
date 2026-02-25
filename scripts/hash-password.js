// Usage: node scripts/hash-password.js <your-password>
// Copy the output hash into .env.local as AUTH_PASSWORD_HASH

const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js <your-password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\nAdd this to your .env.local:\n");
console.log(`AUTH_PASSWORD_HASH=${hash}`);
console.log();
