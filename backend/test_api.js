async function test() {
  try {
    console.log('🔐 Testing login...');
    
    // First, login
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sangameshbk@gmail.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    console.log('✅ Login response status:', loginRes.status);
    console.log('Login data:', JSON.stringify(loginData, null, 2));

    if (!loginData.token) {
      console.error('❌ No token received');
      process.exit(1);
    }

    const token = loginData.token;

    // Now test projects endpoint
    console.log('\n📋 Fetching projects...');
    const projectsRes = await fetch('http://localhost:3000/api/v1/projects', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const projectsData = await projectsRes.json();
    console.log('✅ Projects response status:', projectsRes.status);
    console.log('Projects response:', JSON.stringify(projectsData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
