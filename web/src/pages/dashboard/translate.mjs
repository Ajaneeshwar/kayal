// Fill ml.json beside this file with Malayalam for new or changed strings in strings.ts.
// Run on gon: ssh gon 'cd ~/hackathoni && node web/src/pages/dashboard/translate.mjs'
// Then copy back: scp gon:hackathoni/web/src/pages/dashboard/ml.json web/src/pages/dashboard/
// Strings go in as few sarvam-translate:v1 calls as possible, one line per string.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(ROOT, 'web/src/pages/dashboard/ml.json');
const MAX_CHARS = 900;

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // The key may come from the real environment.
}
const { translate } = await import(path.join(ROOT, 'lib/sarvam.mjs'));
const { en } = await import(path.join(ROOT, 'web/src/pages/dashboard/strings.ts'));

let ml = {};
try {
  ml = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  // First run.
}

const todo = Object.keys(en).filter((k) => ml[k]?.en !== en[k] || !ml[k]?.ml);
const batches = [];
for (const key of todo) {
  const last = batches.at(-1);
  const size = last ? last.reduce((n, k) => n + en[k].length + 1, 0) : Infinity;
  if (!last || size + en[key].length > MAX_CHARS) batches.push([key]);
  else last.push(key);
}

let calls = 0;
for (const keys of batches) {
  calls += 1;
  const { text } = await translate(keys.map((k) => en[k]).join('\n'), 'ml-IN', 'en-IN');
  let lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  if (lines.length !== keys.length) {
    console.warn(`Batch of ${keys.length} came back as ${lines.length} lines; translating one by one.`);
    lines = [];
    for (const k of keys) {
      calls += 1;
      lines.push((await translate(en[k], 'ml-IN', 'en-IN')).text.trim());
    }
  }
  keys.forEach((k, i) => {
    ml[k] = { en: en[k], ml: lines[i] };
  });
}

for (const k of Object.keys(ml)) if (!(k in en)) delete ml[k];
const sorted = Object.fromEntries(Object.keys(en).filter((k) => ml[k]).map((k) => [k, ml[k]]));
await writeFile(OUT, JSON.stringify(sorted, null, 2) + '\n');
console.log(`Translated ${todo.length} strings in ${calls} calls.`);
for (const k of todo) console.log(`${k}\t${en[k]}\t${ml[k].ml}`);
