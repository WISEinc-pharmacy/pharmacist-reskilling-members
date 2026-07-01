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
const contents = JSON.parse(fs.readFileSync('data/contents.json', 'utf8'));
if (!Array.isArray(contents) || contents.length < 1) throw new Error('data/contents.json has no contents');
const bad = contents.filter((item) => !item.title || !/^https?:\/\/(youtu\.be|www\.youtube\.com|youtube\.com)\//i.test(item.url || ''));
if (bad.length) throw new Error('invalid content urls: ' + bad.map((item) => item.id || item.title).join(', '));
const channelOnly = contents.filter((item) => String(item.url || '').includes('@phama_cam'));
if (channelOnly.length) throw new Error('channel placeholder urls remain: ' + channelOnly.length);
console.log('inline JavaScript and content data verified');
