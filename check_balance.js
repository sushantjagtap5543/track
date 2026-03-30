import fs from 'fs';

const content = fs.readFileSync('c:/Users/Sushant/Desktop/Github/track/traccar-web/src/other/BillingPage.jsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let parenCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
    }
    if (braceCount < 0 || parenCount < 0) {
        console.log(`NEGATIVE BALANCE at line ${i + 1}: brace=${braceCount}, paren=${parenCount}`);
        console.log(`Line Content: ${line.trim()}`);
        break;
    }
}

console.log(`Final Balance: brace=${braceCount}, paren=${parenCount}`);
if (braceCount !== 0 || parenCount !== 0) {
    console.log("FILE IS UNBALANCED");
} else {
    console.log("FILE IS BALANCED (Line-by-line checks passed)");
}
