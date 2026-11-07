const fs = require('fs');

const content = fs.readFileSync('src/main.js', 'utf8');

// match all function xyz()
const regex1 = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
let match;
const funcs = new Set();
while ((match = regex1.exec(content)) !== null) {
  funcs.add(match[1]);
}

// match let/const xyz = function
const regex2 = /(?:let|const|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?(?:function|\()/g;
while ((match = regex2.exec(content)) !== null) {
  funcs.add(match[1]);
}

// remove common JS keywords just in case
funcs.delete('if');
funcs.delete('for');
funcs.delete('while');
funcs.delete('switch');
funcs.delete('catch');

let appendStr = '\n\n/* Exposing functions to window for inline HTML handlers */\n';
for (const f of funcs) {
  appendStr += `if(typeof ${f} === 'function') window.${f} = ${f};\n`;
}

// don't append multiple times
if (!content.includes('/* Exposing functions')) {
  fs.writeFileSync('src/main.js', content + appendStr);
}
console.log('Appended', funcs.size, 'functions to window.');
