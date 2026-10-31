import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function deleteTestFiles(dir) {
  if (!fs.existsSync(dir)) return;
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
