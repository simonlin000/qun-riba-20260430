#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outputPath = join(repoRoot, 'resources-index.json');
const defaultInputDirs = [join(repoRoot, 'private', 'chat-exports'), '/private/tmp/qunribao-chat-exports'];
const inputDirs = process.argv.slice(2).length ? process.argv.slice(2).map((item) => resolve(item)) : defaultInputDirs;
const urlPattern = /https?:\/\/[^\s<>'"，（）。！？、\])]+/g;
const blockedHosts = [
  'support.weixin.qq.com',
  'wxapp.tenpay.com',
  'qlogo.cn',
  'mmbiz.qpic.cn',
  'dldir1v6.qq.com',
  'wxapp.tc.qq.com',
  'vweixinf.tc.qq.com',
  'cwxlive.qlogo.cn'
];

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

function cleanUrl(value) {
  return decodeHtml(value)
    .replace(/[\])）.,;:!?！？。，、]+$/g, '')
    .replace(/\.\.$/, '')
    .trim();
}

function getUrlHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isBlockedUrl(url, text = '') {
  const host = getUrlHost(url);
  if (!host) return true;
  if (blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return true;
  if (/当前(?:微信)?版本不支持展示该内容|微信红包|stodownload|auth_icon|emoji/i.test(text)) return true;
  return false;
}

function canonicalResourceKey(url) {
  try {
    const parsed = new URL(cleanUrl(url));
    parsed.hash = '';
    if (parsed.hostname === 'mp.weixin.qq.com') {
      const keep = new URLSearchParams();
      for (const key of ['__biz', 'mid', 'idx', 'sn']) {
        const value = parsed.searchParams.get(key);
        if (value) keep.set(key, value);
      }
      parsed.search = keep.toString();
    } else {
      for (const key of [...parsed.searchParams.keys()]) {
        if (/^(mpshare|scene|srcid|sharer_|from|clicktime|enterid|ascene|subscene|sessionid|fasttmpl_|realreporttime|chksm)$/i.test(key)) {
          parsed.searchParams.delete(key);
        }
      }
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return cleanUrl(url);
  }
}

function listJsonFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (/\.json$/i.test(name)) files.push(join(dir, name));
    }
  }
  return [...new Set(files)].sort();
}

function cleanMessageText(text) {
  return decodeHtml(String(text || '')
    .replace(/\u2005/g, ' ')
    .replace(/<\?xml[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' '));
}

function parseMessage(message, fallbackDate) {
  const raw = String(message || '');
  const visible = raw.split(/\n\s*↳\s*回复/)[0] || raw;
  const match = visible.match(/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\]\s+([\s\S]*?)[:：]\s*([\s\S]*)$/);
  if (match) {
    return {
      date: match[1],
      time: match[2],
      who: cleanMessageText(match[3]) || '未知群友',
      text: cleanMessageText(match[4]) || '[空消息]',
      visible,
    };
  }
  return {
    date: fallbackDate || 'unknown',
    time: '',
    who: '系统',
    text: cleanMessageText(visible) || '[无法解析消息]',
    visible,
  };
}

function titleFromMessage(text, url) {
  const clean = cleanMessageText(text);
  const withoutPrefix = clean.replace(/^\[(?:链接|链接\/文件)\]\s*/, '').trim();
  const before = withoutPrefix.split(url)[0].trim();
  const after = withoutPrefix.slice(withoutPrefix.indexOf(url) + url.length).trim();
  const title = (before || after)
    .replace(/^[:：\-—\s]+|[:：\-—\s]+$/g, '')
    .replace(/\s*https?:\/\/\S+.*/g, '')
    .trim();
  if (title) return title.slice(0, 120);
  const host = getUrlHost(url).replace(/^www\./, '');
  return host ? `${host} 链接` : '群聊链接';
}

function shouldSkipBulkReportMessage(text, urls) {
  return urls.length >= 4 && /群日报|资源分享|龙王榜|今日总结/.test(text);
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
      url: cleanUrl(extractUrl(block)),
      reportHref: fileName,
      source: 'report',
    }))
    .filter((item) => item.title || item.url);
}

function extractResourcesFromChatExport(file) {
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const fallbackDate = (payload.start_time || basename(file)).match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
  const rows = Array.isArray(payload) ? payload : payload.messages || payload.data || [];
  const resources = [];
  for (const row of rows) {
    const parsed = typeof row === 'string'
      ? parseMessage(row, fallbackDate)
      : {
        date: row.date || row.day || fallbackDate,
        time: row.time || '',
        who: cleanMessageText(row.who || row.sender || row.name || '未知群友'),
        text: cleanMessageText(row.text || row.content || row.message || ''),
        visible: String(row.text || row.content || row.message || ''),
      };
    const urls = [...String(parsed.visible || parsed.text).matchAll(urlPattern)]
      .map((match) => cleanUrl(match[0]))
      .filter(Boolean);
    if (!urls.length || shouldSkipBulkReportMessage(parsed.text, urls)) continue;
    for (const url of urls) {
      if (isBlockedUrl(url, parsed.text)) continue;
      resources.push({
        date: parsed.date || fallbackDate,
        time: parsed.time || '',
        who: parsed.who || '未知群友',
        title: titleFromMessage(parsed.text, url),
        url,
        reportHref: `${parsed.date || fallbackDate}.html`,
        source: 'chat',
      });
    }
  }
  return resources;
}

const files = readdirSync(repoRoot)
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name))
  .sort();

const seen = new Set();
const resources = [];
for (const file of files) {
  for (const item of extractResourcesFromHtml(file)) {
    const key = `${item.date}|${canonicalResourceKey(item.url || item.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resources.push({ id: `resource-${String(resources.length + 1).padStart(4, '0')}`, ...item });
  }
}

for (const file of listJsonFiles(inputDirs)) {
  for (const item of extractResourcesFromChatExport(file)) {
    const key = `${item.date}|${canonicalResourceKey(item.url || item.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resources.push({ id: `resource-${String(resources.length + 1).padStart(4, '0')}`, ...item });
  }
}

writeFileSync(outputPath, JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  stats: {
    resourceCount: resources.length,
    reportResourceCount: resources.filter((item) => item.source === 'report').length,
    chatResourceCount: resources.filter((item) => item.source === 'chat').length,
  },
  resources,
}, null, 2));

console.log(`Indexed ${resources.length} public resources.`);
console.log(`Index: ${outputPath}`);
