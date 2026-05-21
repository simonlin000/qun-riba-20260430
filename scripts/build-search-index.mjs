#!/usr/bin/env node
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outputPath = join(repoRoot, 'search-index.enc.json');
const privateDir = join(repoRoot, '.private');
const defaultPoemFile = join(privateDir, 'poem-lines.txt');
const defaultInputDirs = [join(repoRoot, 'private', 'chat-exports'), '/private/tmp/qunribao-chat-exports'];
const inputDirs = process.argv.slice(2).length ? process.argv.slice(2).map((item) => resolve(item)) : defaultInputDirs;
const iterations = Number(process.env.SEARCH_KDF_ITERATIONS || 210000);
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
const passwordPath = join(privateDir, `search-password-${today}.txt`);

function pickPassphrase() {
  if (process.env.SEARCH_PASSPHRASE) return { passphrase: process.env.SEARCH_PASSPHRASE, source: 'SEARCH_PASSPHRASE' };
  if (existsSync(passwordPath)) {
    const passphrase = readFileSync(passwordPath, 'utf8').trim();
    if (passphrase) return { passphrase, source: passwordPath };
  }
  if (!existsSync(defaultPoemFile)) {
    throw new Error([
      'Missing passphrase. Set SEARCH_PASSPHRASE, or create .private/poem-lines.txt with one poem line per row.',
      'Example: SEARCH_PASSPHRASE="山重水复疑无路" node scripts/build-search-index.mjs /path/to/chat-exports'
    ].join('\n'));
  }
  const lines = readFileSync(defaultPoemFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (!lines.length) throw new Error('.private/poem-lines.txt has no usable poem lines.');
  const passphrase = lines[Math.floor(Math.random() * lines.length)];
  return { passphrase, source: defaultPoemFile };
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
  return String(text || '')
    .replace(/\u2005/g, ' ')
    .replace(/<\?xml[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMessage(message, fallbackDate) {
  const raw = String(message || '');
  const match = raw.match(/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\]\s+([\s\S]*?)[:：]\s*([\s\S]*)$/);
  if (match) {
    return {
      date: match[1],
      time: match[2],
      who: cleanMessageText(match[3]) || '未知群友',
      text: cleanMessageText(match[4]) || '[空消息]',
      raw
    };
  }
  const systemMatch = raw.match(/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\]\s+([\s\S]*)$/);
  if (systemMatch) {
    return {
      date: systemMatch[1],
      time: systemMatch[2],
      who: '系统',
      text: cleanMessageText(systemMatch[3]) || '[系统消息]',
      raw
    };
  }
  return {
    date: fallbackDate || 'unknown',
    time: '',
    who: '系统',
    text: cleanMessageText(raw) || '[无法解析消息]',
    raw
  };
}

function loadMessages(files) {
  const seen = new Set();
  const messages = [];
  const days = new Map();
  for (const file of files) {
    const payload = JSON.parse(readFileSync(file, 'utf8'));
    const rows = Array.isArray(payload) ? payload : payload.messages || payload.data || [];
    const fallbackDate = (payload.start_time || basename(file)).match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
    for (const row of rows) {
      const parsed = typeof row === 'string' ? parseMessage(row, fallbackDate) : {
        date: row.date || row.day || fallbackDate,
        time: row.time || '',
        who: cleanMessageText(row.who || row.sender || row.name || '未知群友'),
        text: cleanMessageText(row.text || row.content || row.message || ''),
        raw: JSON.stringify(row)
      };
      if (!parsed.text || parsed.text === '[空消息]') continue;
      const key = `${parsed.date}|${parsed.time}|${parsed.who}|${parsed.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      messages.push({ date: parsed.date, time: parsed.time, who: parsed.who, text: parsed.text });
      days.set(parsed.date, (days.get(parsed.date) || 0) + 1);
    }
  }
  messages.sort((a, b) => `${a.date} ${a.time} ${a.id}`.localeCompare(`${b.date} ${b.time} ${b.id}`));
  return { messages, days };
}

function encryptJson(plain, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { salt, iv, ciphertext: Buffer.concat([ciphertext, tag]) };
}

const files = listJsonFiles(inputDirs);
if (!files.length) throw new Error(`No chat export JSON files found in: ${inputDirs.join(', ')}`);
const { passphrase, source } = pickPassphrase();
const { messages, days } = loadMessages(files);
const dayList = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
const plaintext = {
  version: 1,
  generatedAt: new Date().toISOString(),
  validForDate: today,
  stats: { messageCount: messages.length, dayCount: dayList.length },
  days: dayList,
  messages
};
const encrypted = encryptJson(plaintext, passphrase);
const publicPayload = {
  version: 1,
  title: 'SimonlinのAI学术交流 · 群知识库加密索引',
  algorithm: 'PBKDF2-SHA256/AES-256-GCM',
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: encrypted.salt.toString('base64') },
  cipher: { name: 'AES-GCM', iv: encrypted.iv.toString('base64'), tagLength: 128 },
  ciphertext: encrypted.ciphertext.toString('base64'),
  createdAt: plaintext.generatedAt,
  validForDate: today,
  stats: plaintext.stats,
  hint: '今日口令请看群公告；口令不会写入网页源码。'
};
writeFileSync(outputPath, JSON.stringify(publicPayload, null, 2));
mkdirSync(privateDir, { recursive: true });
writeFileSync(passwordPath, `${passphrase}\n`);
console.log(`Encrypted ${messages.length} messages from ${dayList.length} days.`);
console.log(`Index: ${outputPath}`);
console.log(`Passphrase source: ${source}`);
console.log(`Today's passphrase saved to: ${passwordPath}`);
console.log(`Today's passphrase: ${passphrase}`);
