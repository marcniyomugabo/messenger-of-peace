const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const dir = path.join(__dirname, '../client/public/introduction');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

async function extractAll() {
  for (const file of files) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FILE: ${file}`);
    console.log(`${'='.repeat(80)}`);
    try {
      const buf = fs.readFileSync(path.join(dir, file));
      const data = await pdf(buf);
      console.log(`Pages: ${data.numpages}`);
      console.log(data.text);
    } catch(e) {
      console.log('Error:', e.message);
    }
  }
}

extractAll();
