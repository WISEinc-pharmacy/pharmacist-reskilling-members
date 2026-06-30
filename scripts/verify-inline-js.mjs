import fs from 'node:fs';
import vm from 'node:vm';

const files = ['index.html', 'videos.html', 'admin.html'];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('assets/app.js')) throw new Error(file + ': assets/app.js is not loaded');
  if (!html.includes('assets/firebase-config.js')) throw new Error(file + ': assets/firebase-config.js is not loaded');
  const scripts = [...html.matchAll(/<script>(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  for (const script of scripts) new vm.Script(script, { filename: file + ':inline-script' });
}
const data = fs.readFileSync('data/contents.json', 'utf8');
for (const required of ['\u7206\u901f\u30ea\u30b9\u30ad\u30ea\u30f3\u30b0\u52d5\u753b', '\u4f1a\u54e1', '\u51e6\u65b9\u63d0\u6848']) {
  if (!data.includes(required)) throw new Error('Missing required data text: ' + required);
}
console.log('inline JavaScript verified');
