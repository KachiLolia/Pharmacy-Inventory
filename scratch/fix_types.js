const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./components'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace import type { ... } from '@/lib/mock-data/...'
  const regexType = /import\s+type\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/mock-data\/[^'"]+['"]/g;
  content = content.replace(regexType, (match, p1) => {
    changed = true;
    return 'import type { ' + p1 + ' } from \'@/lib/types\'';
  });

  const regexType2 = /import\s+\{\s*type\s+([^}]+)\}\s+from\s+['"]@\/lib\/mock-data\/[^'"]+['"]/g;
  content = content.replace(regexType2, (match, p1) => {
    changed = true;
    return 'import type { ' + p1 + ' } from \'@/lib/types\'';
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
