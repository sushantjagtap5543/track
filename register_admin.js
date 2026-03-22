
const test = async () => {
    try {
        console.log('--- Registering Admin ---');
        const res1 = await fetch('http://3.108.114.12/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Admin',
                email: 'admin@example.com',
                password: 'admin',
                confirmPassword: 'admin'
            })
        });
        console.log('Admin Status:', res1.status);
        console.log('Admin Data:', await res1.json());

        console.log('\n--- Registering Regular User (Requires Admin Session) ---');
        const res2 = await fetch('http://3.108.114.12/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'User2',
                email: 'user2@test.com',
                password: 'password123',
                confirmPassword: 'password123'
            })
        });
        console.log('User2 Status:', res2.status);
        console.log('User2 Data:', await res2.json());
    } catch (e) {
        console.error('Error:', e.message);
    }
};
test();
