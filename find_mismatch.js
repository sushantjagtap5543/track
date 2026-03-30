const fs = require('fs');
const content = fs.readFileSync('traccar-web/src/other/BillingPage.jsx', 'utf8');
const lines = content.split('\n');
let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const oldBalance = balance;
  balance += (line.match(/{/g) || []).length;
  balance -= (line.match(/}/g) || []).length;
  console.log(`${i + 1}: ${balance} (Diff: ${balance - oldBalance})`);
}
console.log(`Final Balance: ${balance}`);
