const http = require('http');
const { URL } = require('url');

function makeRequest(urlString, method, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  try {
    console.log('🔐 Testing mobileuser1 login and projects...\n');
    
    // Login
    const loginRes = await makeRequest('http://10.73.182.200:3000/api/v1/auth/login', 'POST', {
      email: 'mobileuser1@gmail.com',
      password: 'password123'
    });

    console.log('✅ Login response:', loginRes.data.user);
    const token = loginRes.data.token;

    // Fetch projects
    console.log('\n📋 Fetching projects for mobileuser1:');
    const projectsRes = await makeRequest('http://10.73.182.200:3000/api/v1/projects', 'GET', null, {
      Authorization: `Bearer ${token}`
    });

    console.log(`✅ Projects response (${projectsRes.data.projects.length} projects):`);
    console.log(JSON.stringify(projectsRes.data.projects, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
