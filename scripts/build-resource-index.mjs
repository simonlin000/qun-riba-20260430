#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outputPath = join(repoRoot, 'resources-index.json');

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]*>/g, ' '));
}

function extractClass(block, className) {
  const match = block.match(new RegExp(`<div class="${className}">([\\s\\S]*?)<\\/div>`));
  return match ? stripTags(match[1]) : '';
}

function extractUrl(block) {
  const onclick = block.match(/window\.open\('([^']+)'/);
  if (onclick) return decodeHtml(onclick[1]);
  return extractClass(block, 'link-url');
}

function extractResourcesFromHtml(fileName) {
  const date = fileName.replace(/\.html$/i, '');
  const html = readFileSync(join(repoRoot, fileName), 'utf8');
  const blocks = html.match(/<div class="link-card"[\s\S]*?<\/div><\/div>/g) || [];
  return blocks
    .map((block) => ({
      date,
      who: extractClass(block, 'link-who'),
      title: extractClass(block, 'link-desc'),
      url: extractUrl(block),
      reportHref: fileName,
    }))
    .filter((item) => item.title || item.url);
}

const files = readdirSync(repoRoot)
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name))
  .sort();

const seen = new Set();
const resources = [];
for (const file of files) {
  for (const item of extractResourcesFromHtml(file)) {
    const key = `${item.date}|${item.who}|${item.title}|${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resources.push({ id: `resource-${String(resources.length + 1).padStart(4, '0')}`, ...item });
  }
}

writeFileSync(outputPath, JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  stats: { resourceCount: resources.length },
  resources,
}, null, 2));

console.log(`Indexed ${resources.length} public resources.`);
console.log(`Index: ${outputPath}`);
