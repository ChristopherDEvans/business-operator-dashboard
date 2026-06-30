const pdfParse = require('pdf-parse-fork');
const fs = require('fs');
const path = require('path');

async function test() {
  const pdfPath = path.join(__dirname, 'node_modules', 'pdf-parse-fork', 'test', 'data', '04-valid.pdf');
  const buffer = fs.readFileSync(pdfPath);
  console.log(`Buffer size: ${buffer.length}`);
  
  try {
    const data = await pdfParse(buffer);
    console.log('Pages:', data.numpages);
    console.log('Text length:', data.text.length);
    console.log('Text preview:', data.text.slice(0, 100));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
