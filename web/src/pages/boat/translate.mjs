// Fill ./ml.json with Malayalam for every new or changed string in ./strings.ts, using
// sarvam-translate:v1 in as few calls as possible. A copy of web/scripts/translate.mjs pointed at
// this page's own strings, so the boat page never edits the shared strings file.
// Run on gon:  ssh gon 'cd ~/hackathoni && node web/src/pages/boat/translate.mjs'
// Copy back:   scp gon:hackathoni/web/src/pages/boat/ml.json web/src/pages/boat/
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const OUT = path.join(HERE, 'ml.json');
const MAX_CHARS = 900;

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // The key may come from the real environment.
}
const { translate } = await import(path.join(ROOT, 'lib/sarvam.mjs'));
const { en } = await import(path.join(HERE, 'strings.ts'));

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

const sorted = Object.fromEntries(Object.keys(en).filter((k) => ml[k]).map((k) => [k, ml[k]]));
await writeFile(OUT, JSON.stringify(sorted, null, 2) + '\n');
console.log(`Translated ${todo.length} strings in ${calls} calls.`);
for (const k of todo) console.log(`${k}\t${en[k]}\t${ml[k].ml}`);
