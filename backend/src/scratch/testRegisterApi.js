async function test() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch('http://10.73.182.200:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'master1778405086393@example.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in, token obtained');

    // 2. Register
    console.log('Calling register API...');
    const email = `preethek${Date.now()}@gmail.com`;
    const regRes = await fetch('http://10.73.182.200:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'preethek',
        email: email,
        phone: '6362878867',
        role: 'Admin',
        projects: [2],
        section_a: true,
        section_b: true,
        section_c: false
      })
    });
    
    console.log('Registration status:', regRes.status);
    const regData = await regRes.json();
    console.log('Error data:', regData);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  process.exit(0);
}

test();
