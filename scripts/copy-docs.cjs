const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
fs.cpSync(path.join(root, 'docs/_build/html'), path.join(root, 'build/docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/.nojekyll'), '');
console.log('Documentation included in build/docs.');
