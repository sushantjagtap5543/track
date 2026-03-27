const fs = require('fs');
const path = require('path');

function checkEol(filePath) {
    const content = fs.readFileSync(filePath, 'binary');
    if (content.includes('\r\n')) {
        console.log(`${filePath}: CRLF`);
    } else if (content.includes('\n')) {
        console.log(`${filePath}: LF`);
    } else {
        console.log(`${filePath}: Unknown`);
    }
}

const javaFiles = [
    'src/main/java/org/traccar/Main.java',
    'src/main/java/org/traccar/BaseProtocol.java'
];

javaFiles.forEach(file => {
    const fullPath = path.join('c:\\Users\\Sushant\\Desktop\\Github\\track', file);
    if (fs.existsSync(fullPath)) {
        checkEol(fullPath);
    } else {
        console.log(`${file}: Not found`);
    }
});
