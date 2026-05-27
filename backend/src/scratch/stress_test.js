async function stressTest() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ganapathi@govtsurvey.co',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    if (!token) {
      console.error('Login failed, no token obtained');
      console.log('Response:', loginData);
      process.exit(1);
    }
    
    console.log('Logged in, token obtained');

    const concurrentUsers = 1000; // Simulate 1000 concurrent requests
    const endpoint = 'http://127.0.0.1:3000/api/v1/projects/2/pole-survey/queue/pending?page=1&limit=50';

    console.log(`Starting stress test with ${concurrentUsers} concurrent requests...`);
    const startTime = Date.now();

    const requests = Array.from({ length: concurrentUsers }).map(async (_) => {
      const start = Date.now();
      try {
        const res = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const duration = Date.now() - start;
        return { status: res.status, duration, success: res.ok };
      } catch {
        return { status: 'error', duration: Date.now() - start, success: false };
      }
    });

    const results = await Promise.all(requests);
    const totalDuration = Date.now() - startTime;

    const successes = results.filter(r => r.success).length;
    const failures = results.length - successes;
    const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;

    console.log('\n--- Stress Test Results ---');
    console.log(`Total Requests: ${concurrentUsers}`);
    console.log(`Successful: ${successes}`);
    console.log(`Failed: ${failures}`);
    console.log(`Total Time: ${totalDuration}ms`);
    console.log(`Average Response Time: ${avgDuration.toFixed(2)}ms`);

  } catch (error) {
    console.error('Stress test failed:', error);
  }
  process.exit(0);
}

stressTest();
