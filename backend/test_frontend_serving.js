const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    console.log('🧪 Testing backend...\n');
    
    // Test health endpoint
    console.log('1️⃣ Testing /health endpoint:');
    const healthRes = await fetch('http://10.73.182.200:3000/health');
    const healthData = await healthRes.json();
    console.log(`Status: ${healthRes.status}`, healthData);

    // Test if index.html is being served
    console.log('\n2️⃣ Testing root path (should serve index.html):');
    const rootRes = await fetch('http://10.73.182.200:3000/');
    console.log(`Status: ${rootRes.status}`);
    const rootHtml = await rootRes.text();
    if (rootHtml.includes('<!DOCTYPE') || rootHtml.includes('GovtSurvey')) {
      console.log('✅ Frontend HTML is being served');
    } else {
      console.log('❌ Frontend HTML NOT being served');
      console.log('Response preview:', rootHtml.substring(0, 200));
    }

    // Test static asset
    console.log('\n3️⃣ Testing static asset (favicon):');
    const faviconRes = await fetch('http://10.73.182.200:3000/favicon.svg');
    console.log(`Status: ${faviconRes.status}`);
    if (faviconRes.status === 200) {
      console.log('✅ Static files are being served');
    } else {
      console.log('❌ Static files NOT being served');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
