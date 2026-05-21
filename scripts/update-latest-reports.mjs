#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function onclick(url) {
  return /^https?:\/\//.test(url) ? ` onclick="window.open('${esc(url)}','_blank')"` : '';
}

function linkCard([who, desc, url]) {
  return `<div class="link-card"${onclick(url)}><div class="link-who">${esc(who)}</div><div class="link-desc">${esc(desc)}</div><div class="link-url">${esc(url)}</div></div>`;
}

function dragonMini([rank, name, count]) {
  return `<div class="dragon-mini" onclick="filterByMember('${esc(name)}')"><span class="rank">${esc(rank)}</span><span class="name">${esc(name)}</span><span class="count">${esc(count)}</span></div>`;
}

function quickEvent([title, text, member, tag]) {
  return `<div class="chat-bubble-mini" onclick="filterByMember('${esc(member)}')"><div class="bubble-who">${esc(title)}</div><div class="bubble-text">${esc(text)}</div><span class="event-tag">${esc(tag)}</span></div>`;
}

function eventSection(event, index) {
  const rows = event.lines.map((line) => (
    `<div class="bubble-row"><div class="bubble-avatar">${esc(event.avatar)}</div><div class="bubble-content"><div class="bubble-who"></div><div class="bubble-chat">${esc(line)}</div></div></div>`
  )).join('\n');
  return `<div class="event-section" id="event-${index + 1}"><div class="event-title">🔥 ${esc(event.title)}<div class="event-tags"></div></div><div class="bubbles">
${rows}
</div><div class="event-comment">💬 毒舌点评：${esc(event.comment)}</div></div>`;
}

function summarySection(report) {
  const items = report.summary.map(([label, value]) => (
    `<div class="summary-item"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`
  )).join('\n');
  return `<div class="event-section"><div class="event-title">📊 今日总结</div><div class="summary-grid">
${items}
</div></div>`;
}

function edgeSection(report) {
  const rows = report.edgeSignals.map((line) => (
    `<div class="bubble-row"><div class="bubble-avatar">信</div><div class="bubble-content"><div class="bubble-who"></div><div class="bubble-chat">${esc(line)}</div></div></div>`
  )).join('\n');
  return `<div class="event-section"><div class="event-title">🔭 边缘信号</div><div class="bubbles">
${rows}
</div></div>`;
}

const css = readFileSync(join(repoRoot, '2026-05-20.html'), 'utf8')
  .match(/<style>\n([\s\S]*?)\n<\/style>/)?.[1] || '';

const report = {
  file: '2026-05-21.html',
  titleDate: '5月21日',
  fullDate: '2026年5月21日',
  weekday: '周四',
  count: '313',
  sidebarEvents: [
    ['GUI软件一键变CLI', 'Simon凌晨分享 CLI-Anything，GUI 自动转原生 CLI，延续工具链自动化狂潮。', '马其顿呼声（Simonlin）', 'CLI'],
    ['知识库口令上线', '群知识库加密搜索继续调试，今日口令“直挂云帆济沧海”在群里公开。', '马其顿呼声（Simonlin）', '知识库'],
    ['Codex登录小白互助', '小辣椒、青元、Augenstern等卡在 Codex/OpenAI 登录，马佳彬和 Pan 在线排雷。', '马佳彬', 'Codex'],
    ['群友集体复读', '“这个群真能学到东西啦”引发大规模复读，群除我佬成为午间暗号。', '小辣椒', '复读'],
    ['Tw93独立开发者直播', '向阳乔木邀请 Tw93 周六开播，聊 Mole、Kaku、Miaoyan 背后的开发经验。', '向阳乔木', '独立开发']
  ],
  dragons: [
    ['🥇', '马其顿呼声（Simonlin）', '52次'],
    ['🥈', '马佳彬', '25次'],
    ['🥉', '千九', '22次'],
    ['4', '程玉', '22次'],
    ['5', '亿华工业地产  朱孟凯 13616607031', '13次']
  ],
  resources: [
    ['马其顿呼声（Simonlin）', 'CLI-Anything：GUI软件一键变原生CLI', 'https://github.com/HKUDS/CLI-Anything'],
    ['李华荣', 'Oracle：Claude Code 与网页版 GPT 5.5 Pro 讨论方案', 'https://github.com/steipete/oracle'],
    ['李华荣', 'codex-image-bridge：用 Codex 能力桥接 Claude 生成图片', 'https://github.com/xmasdong/codex-image-bridge'],
    ['Leo Feng 🍊', 'AGENT橘的文字分享', 'https://mp.weixin.qq.com/s?scene=1&__biz=MzkwMzY5NzU2Nw==&mid=2247489735&idx=1&sn=6634dc2adef26643accfa6d6153deb66'],
    ['千九', '数字生命卡兹克的文字分享', 'https://mp.weixin.qq.com/s/TOlv8akMwwHM9u41U-P5eQ'],
    ['小耳｜李娟｜AI Builder', '网页撕拉技术开源说明', 'https://x.com/xiaoerzhan/status/2057266029714370946'],
    ['马其顿呼声（Simonlin）', '云舒：从提示词卡片到 Agent，一个 AI 产品经理的“游戏”之路', 'https://www.xiaoyuzhoufm.com/episode/6a0dbcf5e1eb34a939c730b4'],
    ['马其顿呼声（Simonlin）', '2026中国AI应用全景图谱报告（量子位智库）', '群内文件'],
    ['马其顿呼声（Simonlin）', '飞书 AI 应用图谱/资料库', 'https://jkhbjkhb.feishu.cn/wiki/W5D7wuDcbiPXDLkaRLQcAJpOn8f?view=vewf0LppY2'],
    ['数字阿启', 'nima-tech：集众人之广博做的平台', 'https://www.nima-tech.space/']
  ],
  events: [
    {
      title: 'GUI软件一键变CLI，自动化工具链继续卷',
      avatar: 'CLI',
      lines: [
        '凌晨1点，Simon分享 HKUDS/CLI-Anything，标题直接写着“GUI软件一键变原生CLI”。',
        '李华荣随后连发 Oracle 和 codex-image-bridge，讨论 Claude Code、GPT 5.5 Pro、Codex 与图片生成的协作玩法。'
      ],
      comment: '昨天还在卷模型，今天已经开始卷“谁能把软件榨成命令行”。'
    },
    {
      title: '群知识库继续上线，口令文化正式形成',
      avatar: '知',
      lines: [
        '上午9点47，Simon把群知识库新版链接发到群里，说“做了一些小小更新”。千九马上追问是否还需要口令。',
        'Simon确认“对”，并公开今日口令“直挂云帆济沧海”。群友顺势接上“天王盖地虎”“地振高冈”，古诗口令硬是玩出了江湖暗号感。'
      ],
      comment: '别人上知识库像登录系统，这群人上知识库像拜山头。'
    },
    {
      title: '第一次大清洗预告，潜水群友集体冒泡',
      avatar: '清',
      lines: [
        'Simon一句“兄弟们，过两天就要清人了”，群里立刻进入求生模式。',
        '林义辉称之为“第一次大清洗”，强子补刀“史称第一次大清洗”。Simon补充“有效发言才算哦”，潜水群众瞬间开始证明自己还活着。'
      ],
      comment: '清人通知一发，群活跃度 KPI 当场起飞。'
    },
    {
      title: 'Codex登录互助，小白入门第一关',
      avatar: 'CDX',
      lines: [
        '小辣椒说下载了 Codex，但没有 ChatGPT 账号，卡在第一步；青元跟着表示“同卡”。',
        '马佳彬直接发 OpenAI 验证码协助 Augenstern，提醒“输入上面验证码，确认搞定”“Codex客户端取消登录，重新用账号登录”。Pan 也解释手机号和代理属地不必一致。'
      ],
      comment: 'AI时代的第一道门槛不是 prompt，是登录。'
    },
    {
      title: '这个群真能学到东西，复读机模式开启',
      avatar: '学',
      lines: [
        '信华发图感慨“上网真的能学到东西”，小辣椒接着说“这个群真能学到东西啦，把我这个小白拉高多少个的层次了”。',
        '一句话引发全群复读，早上不吃饭的孟凡、朱孟凯、李华荣、马佳彬、星淇等接连复制。午后又切换成“大佬们都谦虚，群除我佬”。'
      ],
      comment: '知识型社群的最高形态：先学习，再复读，最后变成群梗。'
    }
  ],
  edgeSignals: [
    'CAISI 评估报告显示闭源旗舰模型与开源模型差距从4个月扩大到8个月。',
    '小耳开源“网页撕拉”技术，继续把浏览器内容采集做成生产力工具。',
    '向阳乔木邀请 Tw93 直播，独立开发者工具链话题升温。',
    '2026中国AI应用全景图谱报告在群里流转，AI应用分类信息继续被沉淀。'
  ],
  summary: [
    ['最卷的人', '马其顿呼声（Simonlin） — 52条消息，继续推进群知识库、日报和AI应用资料沉淀'],
    ['最佳助攻', '马佳彬 — 从 OpenAI 验证码到 Codex 重新登录，在线给新手排雷'],
    ['最佳气氛组', '全体复读机 — “这个群真能学到东西啦”把午间气氛直接刷屏'],
    ['最佳信号源', '向阳乔木 — 带来 Tw93 独立开发者直播和网页撕拉开源线索']
  ]
};

function renderReport(item) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>群日报 · ${esc(item.titleDate)}</title>
<style>
${css}
</style>
<link rel="stylesheet" href="daily-enhance.css?v=6">
</head>
<body>
<div class="layout">
<div class="sidebar">
<div class="sidebar-header"><h1>🐉 群日报</h1><div class="date">${esc(item.titleDate)} · ${esc(item.weekday)}</div></div>
<div class="sidebar-section"><div class="sidebar-section-title">🔥 快捷事件</div>
${item.sidebarEvents.map(quickEvent).join('\n')}
</div>
<div class="sidebar-section"><div class="sidebar-section-title">🏆 龙王榜</div>
${item.dragons.map(dragonMini).join('\n')}
</div>
<div class="sidebar-section"><div class="sidebar-section-title">🔗 资源分享</div>
${item.resources.map(linkCard).join('\n')}
</div>
</div>
<div class="main">
<div class="main-header"><h1>📰 SimonlinのAI学术交流（兄弟姐妹）· 日报</h1><div class="subtitle">${esc(item.fullDate)} · ${esc(item.weekday)} · 共${esc(item.count)}条记录</div></div>
<div class="active-filter-banner" id="filterBanner"><span id="filterText">当前筛选：</span><button class="clear-btn" onclick="clearFilter()">清除筛选</button></div>
<div class="event-section"><div class="event-title">🔗 资源分享</div><div class="links-grid">
${item.resources.map(linkCard).join('\n')}
</div></div>
${item.events.map(eventSection).join('\n')}
${edgeSection(item)}
${summarySection(item)}
<div class="footer">共${esc(item.count)}条记录 · 2026-5-21完 · 🐉</div>
</div>
</div>
<script src="daily-enhance.js?v=4"></script>
</body>
</html>
`;
}

function indexCard(item, newest = false) {
  const dragonItems = item.dragons.slice(0, 3).map(([rank, name, count]) => (
    `<div class="dragon-item"><span class="rank">${esc(rank)}</span><span class="name">${esc(name)}</span><span class="count">${esc(count)}</span></div>`
  )).join('');
  return `    <!-- ${item.titleDate} -->
    <a href="${item.file}" class="report-card${newest ? ' newest' : ''}">
      <div class="card-header">
        <div>
          <div class="card-date">${item.titleDate}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${newest ? '<span class="newest-badge">最新</span>' : ''}
          <span class="card-weekday">${item.weekday}</span>
        </div>
      </div>
      <div class="card-events"><span>${item.events.length}</span> 个高光事件 · ${item.count}条记录</div>
      <div class="dragon-list">
        <div class="dragon-title">🐉 龙王榜</div>
        ${dragonItems}
      </div>
    </a>`;
}

writeFileSync(join(repoRoot, report.file), renderReport(report));

let html20 = readFileSync(join(repoRoot, '2026-05-20.html'), 'utf8');
const replacements20 = [
  ['Anthropic 2028 AI Leadership 研究</div><div class="link-url">资源线索', 'Anthropic 2028 AI Leadership 研究</div><div class="link-url">https://www.anthropic.com/research/2028-ai-leadership'],
  ['html-anything 项目（GitHub）</div><div class="link-url">GitHub项目', 'html-anything 项目（GitHub）</div><div class="link-url">https://github.com/nexu-io/html-anything/blob/main/README.zh-CN.md'],
  ['qiaomu-userscripts 油猴脚本（GitHub）</div><div class="link-url">GitHub项目', 'qiaomu-userscripts 油猴脚本（GitHub）</div><div class="link-url">https://github.com/joeseesun/qiaomu-userscripts'],
  ['Gemini 3.5 案例合集+教程：几十个场景测评，含 GPT Image 2 横向对比</div><div class="link-url">教程资源', 'Gemini 3.5 案例合集+教程：几十个场景测评，含 GPT Image 2 横向对比</div><div class="link-url">https://seedesign.feishu.cn/wiki/ZJKQwuOSPicL7EktJJkcypy7nid'],
  ['DeepSeek 组建 Harness 团队对标 Claude Code（甲子光年报道）</div><div class="link-url">行业报道', 'DeepSeek 组建 Harness 团队对标 Claude Code（甲子光年报道）</div><div class="link-url">https://mp.weixin.qq.com/s?__biz=MzU5OTI0NTc3Mg==&amp;mid=2247554219&amp;idx=1&amp;sn=dcd3b9d1c29e2f6bbfa49b4f96cc875a'],
  ['微信读书 Skill 升级文章《踢飞信息焦虑找回阅读快乐》</div><div class="link-url">文章资源', '微信读书 Skill 升级文章《踢飞信息焦虑找回阅读快乐》</div><div class="link-url">https://mp.weixin.qq.com/s?__biz=Mzg3MTk3NzYzNw==&amp;mid=2247507153&amp;idx=1&amp;sn=1b5e804355bd86b824c0209820b9f0b3'],
  ['抖音 AI 视频《骗你的，其实520那天我没去白宫》</div><div class="link-url">视频资源', '抖音 AI 视频《骗你的，其实520那天我没去白宫》</div><div class="link-url">https://v.douyin.com/Hdho5fOib1M/']
];
for (const [from, to] of replacements20) html20 = html20.split(from).join(to);
writeFileSync(join(repoRoot, '2026-05-20.html'), html20);

let index = readFileSync(join(repoRoot, 'index.html'), 'utf8');
index = index
  .replace('<span class="num">25</span>\n      <span class="label">期日报</span>', '<span class="num">26</span>\n      <span class="label">期日报</span>')
  .replace('<span class="num">5月20日</span>\n      <span class="label">最新一期</span>', '<span class="num">5月21日</span>\n      <span class="label">最新一期</span>')
  .replace('<a href="2026-05-20.html" class="report-card newest">', '<a href="2026-05-20.html" class="report-card">')
  .replace(/\n\s*<span class="newest-badge">最新<\/span>\n\s*<span class="card-weekday">周三<\/span>/, '\n          <span class="card-weekday">周三</span>');

if (!index.includes('href="2026-05-21.html"')) {
  index = index.replace('    <!-- 5月20日 -->', `${indexCard(report, true)}\n    <!-- 5月20日 -->`);
}

writeFileSync(join(repoRoot, 'index.html'), index);

console.log('Updated 2026-05-21.html, 2026-05-20.html resource links, and index.html');
