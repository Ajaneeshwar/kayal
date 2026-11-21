// Builds docs/deck/kayal-log.pptx from deck.src.html.
//
//   cd docs/deck/.build && npm install     (once; .build/ is ignored by git)
//   node docs/deck/build.mjs
//
// Each slide is drawn by headless Chromium at 1920 x 1080 and placed full-bleed in the deck, so the
// slides look the same on a machine without the fonts. Speaker notes come from each slide's
// <aside class="notes">. Needs `chromium` on the PATH (or CHROMIUM=/path/to/browser).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sceneSvg } from './scene.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const buildDir = join(here, '.build');
const slidesDir = join(here, 'slides');
const screensDir = join(here, '..', 'screens');
const require = createRequire(join(buildDir, 'package.json'));
const PptxGenJS = require('pptxgenjs');

const dataUri = (file, mime) => `data:${mime};base64,${readFileSync(file).toString('base64')}`;
const firstExisting = (paths) => {
  const found = paths.find((p) => existsSync(p));
  if (!found) throw new Error(`None of these exist:\n${paths.join('\n')}`);
  return found;
};
const fontFile = (pkg, names) =>
  firstExisting(names.map((n) => join(buildDir, 'node_modules', '@fontsource-variable', pkg, 'files', n)));

const fonts = {
  fraunces: fontFile('fraunces', ['fraunces-latin-full-normal.woff2', 'fraunces-latin-wght-normal.woff2']),
  inter: fontFile('inter', ['inter-latin-wght-normal.woff2']),
};
const scenes = {
  title: sceneSvg({ viewBox: [0, -180, 1440, 810], boat: [900, 592, 1.42], glintMaxY: 540 }),
  close: sceneSvg({ viewBox: [0, -230, 1440, 810], boat: [930, 540, 1.2] }),
};

const source = readFileSync(join(here, 'deck.src.html'), 'utf8')
  .replace(/\{\{font:(\w+)\}\}/g, (_, name) => dataUri(fonts[name], 'font/woff2'))
  .replace(/\{\{img:([\w.-]+)\}\}/g, (_, name) => dataUri(join(screensDir, name), 'image/png'))
  .replace(/\{\{shot:([\w.-]+)\}\}/g, (_, name) => dataUri(join(here, 'shots', name), 'image/png'))
  .replace(/\{\{news:([\w.-]+)\}\}/g, (_, name) => dataUri(join(here, 'news', name), 'image/png'))
  .replace(/\{\{logo:(\w+)\}\}/g, (_, name) =>
    readFileSync(join(here, 'logos', `${name}.svg`), 'utf8').replace(/<\?xml[^>]*\?>/, '').trim(),
  )
  .replace(/\{\{scene:(\w+)\}\}/g, (_, name) => scenes[name]);

mkdirSync(buildDir, { recursive: true });
mkdirSync(slidesDir, { recursive: true });
// The whole deck as one self-contained page, for a quick look in a browser.
writeFileSync(join(buildDir, 'kayal-log.pptx.html'), source);

const style = source.match(/<style>[\s\S]*?<\/style>/)[0];
const sections = source.match(/<section class="slide[\s\S]*?<\/section>/g);
const frame = '<style>html,body{margin:0;background:#000}.slide{width:960px;height:540px}</style>';
const plain = (html) =>
  html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const chromium = process.env.CHROMIUM || 'chromium';
const profile = join(buildDir, 'chrome-profile');
const slides = sections.map((section, i) => {
  const n = String(i + 1).padStart(2, '0');
  const notesHtml = section.match(/<aside class="notes">([\s\S]*?)<\/aside>/)?.[1] ?? '';
  const notes = [...notesHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => plain(m[1])).join('\n\n');
  const title = plain(section.match(/data-title="([^"]*)"/)?.[1] ?? `Slide ${i + 1}`);
  const page = join(buildDir, `slide-${n}.html`);
  const png = join(slidesDir, `slide-${n}.png`);
  writeFileSync(
    page,
    `<!doctype html><html lang="en"><head><meta charset="utf-8">${style}${frame}</head><body>${section.replace(/<aside class="notes">[\s\S]*?<\/aside>/, '')}</body></html>`,
  );
  rmSync(png, { force: true });
  execFileSync(
    chromium,
    [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${profile}`, '--force-device-scale-factor=2', '--window-size=960,540',
      `--screenshot=${png}`, pathToFileURL(page).href,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'], timeout: 60_000 },
  );
  if (!existsSync(png)) throw new Error(`Chromium did not write ${png}`);
  return { png, notes, title };
});

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';
pptx.title = 'Kayal Log';
pptx.subject = 'A voice logbook that lets Alappuzha houseboats prove where their sewage went';
pptx.author = 'Ajaneeshwar';
pptx.company = 'HackaThoni, Alappuzha, 21–22 November 2026';
for (const { png, notes, title } of slides) {
  const slide = pptx.addSlide();
  slide.background = { color: '0B2433' };
  slide.addImage({ path: png, x: 0, y: 0, w: 10, h: 5.625, altText: title });
  if (notes) slide.addNotes(notes);
}
const out = join(here, 'kayal-log.pptx');
await pptx.writeFile({ fileName: out });
console.log(`Wrote ${out} with ${slides.length} slides`);
