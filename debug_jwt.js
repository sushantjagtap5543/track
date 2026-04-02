const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const email = 'admin@geosurepath.com';
  const pass = 'AdminTestPassword123!';
  const secret = process.env.JWT_SECRET;
  
  console.log('DEBUG: Secret Length:', secret.length);
  console.log('DEBUG: Hex Secret:', Buffer.from(secret).toString('hex'));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('USER NOT FOUND');
    process.exit(1);
  }

  const isMatch = await bcrypt.compare(pass, user.password);
  console.log('DEBUG: Password Match:', isMatch);

  const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '15m' });
  console.log('DEBUG: Generated Token:', token.substring(0, 20) + '...');

  try {
    const decoded = jwt.verify(token, secret);
    console.log('DEBUG: Verification SUCCESS:', JSON.stringify(decoded));
  } catch (e) {
    console.error('DEBUG: Verification FAILED:', e.message);
  }
  
  process.exit(0);
}

debug().catch(e => {
  console.error(e);
  process.exit(1);
});
