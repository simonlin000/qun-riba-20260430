(function () {
  const state = { indexMeta: null, decrypted: null, unlockedAt: null };
  const $ = (selector) => document.querySelector(selector);
  const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, '');
  const escapeHtml = (value) => String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function deriveKey(password, salt, iterations) {
    const encoder = new TextEncoder();
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  async function decryptIndex(password) {
    const meta = state.indexMeta;
    const payload = base64ToBytes(meta.ciphertext);
    const tagLength = 16;
    const cipherBytes = payload.slice(0, payload.length - tagLength);
    const tag = payload.slice(payload.length - tagLength);
    const combined = new Uint8Array(cipherBytes.length + tag.length);
    combined.set(cipherBytes);
    combined.set(tag, cipherBytes.length);
    const key = await deriveKey(password, base64ToBytes(meta.kdf.salt), meta.kdf.iterations);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(meta.cipher.iv), tagLength: meta.cipher.tagLength }, key, combined);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function setStatus(message, type) {
    const status = $('#unlockStatus');
    if (!status) return;
    status.textContent = message || '';
    status.className = type ? `unlock-status ${type}` : 'unlock-status';
  }

  function renderMeta() {
    const meta = state.indexMeta;
    const metaBox = $('#indexMeta');
    if (!metaBox || !meta) return;
    const created = meta.createdAt ? new Date(meta.createdAt).toLocaleString('zh-CN') : '未知';
    metaBox.innerHTML = [
      `<span>${meta.stats?.dayCount || 0} 天记录</span>`,
      `<span>${(meta.stats?.messageCount || 0).toLocaleString('zh-CN')} 条消息</span>`,
      `<span>索引生成：${escapeHtml(created)}</span>`
    ].join('');
  }

  function buildSnippet(message, query) {
    const text = message.text || '';
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const found = lowerText.indexOf(lowerQuery);
    const start = found >= 0 ? Math.max(0, found - 58) : 0;
    const end = Math.min(text.length, found >= 0 ? found + query.length + 86 : 170);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet += '…';
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapeHtml(snippet).replace(new RegExp(safeQuery, 'ig'), (match) => `<mark>${match}</mark>`);
  }

  function searchMessages(query, day) {
    const normalizedQuery = normalize(query);
    if (!state.decrypted || !normalizedQuery) return [];
    const results = [];
    for (const message of state.decrypted.messages || []) {
      if (day && message.date !== day) continue;
      const haystack = normalize(`${message.date} ${message.time} ${message.who} ${message.text}`);
      if (!haystack.includes(normalizedQuery)) continue;
      results.push(message);
      if (results.length >= 120) break;
    }
    return results;
  }

  function renderDayFilter() {
    const select = $('#dayFilter');
    if (!select || !state.decrypted) return;
    const days = state.decrypted.days || [];
    select.innerHTML = '<option value="">全部日期</option>' + days.map((day) => `<option value="${escapeHtml(day.date)}">${escapeHtml(day.date)} · ${day.count}条</option>`).join('');
    select.disabled = false;
  }

  function renderResults() {
    const input = $('#knowledgeQuery');
    const day = $('#dayFilter')?.value || '';
    const resultsEl = $('#searchResults');
    const countEl = $('#resultCount');
    if (!input || !resultsEl || !countEl) return;
    const query = input.value.trim();
    if (!state.decrypted) {
      resultsEl.innerHTML = '<div class="empty-state">先输入今日古诗口令，解锁群知识库。</div>';
      countEl.textContent = '';
      return;
    }
    if (!query) {
      resultsEl.innerHTML = '<div class="empty-state">输入关键词后，只展示命中的聊天片段；完整聊天记录不会直接铺在页面上。</div>';
      countEl.textContent = '';
      return;
    }
    const results = searchMessages(query, day);
    countEl.textContent = `找到 ${results.length} 条${results.length >= 120 ? '（最多显示 120 条）' : ''}`;
    if (!results.length) {
      resultsEl.innerHTML = '<div class="empty-state">没搜到，换个关键词试试。</div>';
      return;
    }
    resultsEl.innerHTML = results.map((message) => {
      const href = message.reportHref || `${message.date}.html`;
      return `<article class="result-card">
        <div class="result-meta"><span>${escapeHtml(message.date)} ${escapeHtml(message.time)}</span><span>${escapeHtml(message.who)}</span></div>
        <p>${buildSnippet(message, query)}</p>
        <a href="${escapeHtml(href)}">打开当日日报</a>
      </article>`;
    }).join('');
  }

  async function boot() {
    const form = $('#unlockForm');
    const password = $('#dailyPassword');
    const query = $('#knowledgeQuery');
    const dayFilter = $('#dayFilter');
    const lockPanel = $('#lockPanel');
    const searchPanel = $('#searchPanel');
    try {
      const response = await fetch('search-index.enc.json?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('index not found');
      state.indexMeta = await response.json();
      renderMeta();
      setStatus('加密索引已就绪，输入今日古诗口令即可搜索。', 'hint');
    } catch (error) {
      setStatus('没有找到加密索引，请先运行构建脚本。', 'error');
      return;
    }
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const value = password?.value.trim();
      if (!value) return setStatus('先输入今日口令。', 'error');
      setStatus('正在本地解密索引…', 'hint');
      try {
        state.decrypted = await decryptIndex(value);
        state.unlockedAt = Date.now();
        lockPanel?.classList.add('is-unlocked');
        searchPanel?.classList.add('is-ready');
        query.disabled = false;
        renderDayFilter();
        query.focus();
        setStatus(`已解锁：${state.decrypted.stats.messageCount.toLocaleString('zh-CN')} 条消息，只在本机浏览器内解密。`, 'ok');
        renderResults();
      } catch (error) {
        state.decrypted = null;
        setStatus('口令不对，或者索引已经换日重建。', 'error');
      }
    });
    $('#clearUnlock')?.addEventListener('click', () => {
      state.decrypted = null;
      if (password) password.value = '';
      if (query) query.value = '';
      dayFilter.innerHTML = '<option value="">全部日期</option>';
      dayFilter.disabled = true;
      lockPanel?.classList.remove('is-unlocked');
      searchPanel?.classList.remove('is-ready');
      query.disabled = true;
      setStatus('已清除本次解锁状态。', 'hint');
      renderResults();
    });
    query?.addEventListener('input', renderResults);
    dayFilter?.addEventListener('change', renderResults);
    renderResults();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
