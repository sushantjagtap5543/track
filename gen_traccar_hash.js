const crypto = require('crypto');

function generateTraccarHash(password) {
    const salt = crypto.randomBytes(32);
    const iterations = 1000;
    const keyLength = 24; // 192 bits

    crypto.pbkdf2(password, salt, iterations, keyLength, 'sha1', (err, derivedKey) => {
        if (err) throw err;
        console.log('--- TRACCAR HASH GENERATED ---');
        console.log('PASSWORD:', password);
        console.log('SALT (HEX):', salt.toString('hex'));
        console.log('HASH (HEX):', derivedKey.toString('hex'));
    });
}

generateTraccarHash('AdminTestPassword123!');
