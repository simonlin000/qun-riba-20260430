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

  function tokenize(value) {
    return Array.from(new Set(String(value || '')
      .toLowerCase()
      .match(/[a-z0-9\u4e00-\u9fff]{2,}|[\u4e00-\u9fff]/g) || []))
      .filter((token) => !['这个', '那个', '最近', '什么', '哪里', '如何', '一下', '文章', '知识库'].includes(token));
  }

  function retrieveForQuestion(question) {
    if (!state.decrypted) return [];
    const tokens = tokenize(question);
    const scored = [];
    for (const message of state.decrypted.messages || []) {
      const haystack = normalize(`${message.date} ${message.time} ${message.who} ${message.text}`);
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(normalize(token)) ? 1 : 0), 0);
      if (score <= 0) continue;
      scored.push({ message, score });
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((item, index) => ({
        id: index + 1,
        date: item.message.date || '',
        time: item.message.time || '',
        who: item.message.who || '',
        text: item.message.text || '',
        reportHref: item.message.reportHref || `${item.message.date}.html`
      }));
  }

  function buildActivityStats() {
    if (!state.decrypted) return [];
    const counts = new Map();
    for (const message of state.decrypted.messages || []) {
      const who = String(message.who || '').trim();
      if (!who) continue;
      counts.set(who, (counts.get(who) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([who, count]) => ({ who, count }));
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

  function renderAskAnswer(payload) {
    const answer = $('#askAnswer');
    if (!answer) return;
    const sources = payload.sources || [];
    answer.classList.add('is-visible');
    answer.innerHTML = `
      <div>${escapeHtml(payload.answer || '资料里没找到。').replace(/\n/g, '<br>')}</div>
      ${sources.length ? `<ol>${sources.map((source) => {
        const label = `【${source.id}】${source.date || ''} ${source.time || ''} ${source.who || ''}`.trim();
        return `<li>${source.reportHref ? `<a href="${escapeHtml(source.reportHref)}">${escapeHtml(label)}</a>` : escapeHtml(label)}</li>`;
      }).join('')}</ol>` : ''}
    `;
  }

  async function askKnowledgeBase() {
    const questionEl = $('#knowledgeQuestion');
    const status = $('#askStatus');
    const button = $('#askKnowledge');
    const answer = $('#askAnswer');
    const question = questionEl?.value.trim();
    if (!state.decrypted) {
      if (status) status.textContent = '先输入今日口令解锁。';
      return;
    }
    if (!question) {
      if (status) status.textContent = '先输入一个具体问题。';
      questionEl?.focus();
      return;
    }

    const contexts = retrieveForQuestion(question);
    const activityStats = buildActivityStats();
    if (answer) {
      answer.classList.add('is-visible');
      answer.textContent = contexts.length ? '正在把命中片段交给 AI...' : '没有明显命中片段，AI 会基于活跃度统计和空证据判断。';
    }
    if (status) status.textContent = `已选出 ${contexts.length} 条证据片段。`;
    if (button) button.disabled = true;

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, contexts, activityStats })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `请求失败：${response.status}`);
      renderAskAnswer(payload);
      if (status) status.textContent = '回答完成。';
    } catch (error) {
      if (answer) {
        answer.classList.add('is-visible');
        answer.textContent = `问答接口失败：${error.message}`;
      }
      if (status) status.textContent = '后端暂时没接通。';
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function boot() {
    const form = $('#unlockForm');
    const password = $('#dailyPassword');
    const query = $('#knowledgeQuery');
    const question = $('#knowledgeQuestion');
    const askButton = $('#askKnowledge');
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
        if (question) question.disabled = false;
        if (askButton) askButton.disabled = false;
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
      if (question) question.disabled = true;
      if (askButton) askButton.disabled = true;
      setStatus('已清除本次解锁状态。', 'hint');
      renderResults();
    });
    query?.addEventListener('input', renderResults);
    dayFilter?.addEventListener('change', renderResults);
    askButton?.addEventListener('click', askKnowledgeBase);
    question?.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') askKnowledgeBase();
    });
    renderResults();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
