// Usage: node scripts/generate-jwt-secret.js
// Copy the output into .env.local as JWT_SECRET

const crypto = require("crypto");
const secret = crypto.randomBytes(32).toString("hex");
console.log("\nAdd this to your .env.local:\n");
console.log(`JWT_SECRET=${secret}`);
console.log();
