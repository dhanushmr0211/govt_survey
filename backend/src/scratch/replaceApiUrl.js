const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\hpadmin\\Desktop\\govt_survey\\frontend\\src';

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('http://127.0.0.1:3000') || content.includes('http://localhost:3000')) {
        console.log('Updating:', fullPath);
        content = content.replace(/http:\/\/127\.0\.0\.1:3000/g, 'http://10.73.182.200:3000');
        content = content.replace(/http:\/\/localhost:3000/g, 'http://10.73.182.200:3000');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

walk(dir);
console.log('Done!');
