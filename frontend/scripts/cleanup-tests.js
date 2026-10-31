const fs = require('fs');
const path = require('path');

function deleteTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      deleteTestFiles(fullPath);
    } else if (/\.test\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      console.log('Deleting test file:', fullPath);
      fs.unlinkSync(fullPath);
    }
  }
}

const srcRoot = path.resolve(__dirname, '..', 'src');
deleteTestFiles(srcRoot);
console.log('Test files cleanup completed.');

