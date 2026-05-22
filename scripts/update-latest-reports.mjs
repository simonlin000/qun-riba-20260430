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
  count: '1298',
  sidebarEvents: [
    ['GUI软件一键变CLI', 'Simon凌晨分享 CLI-Anything，GUI 自动转原生 CLI，延续工具链自动化狂潮。', '马其顿呼声（Simonlin）', 'CLI'],
    ['知识库口令上线', '群知识库加密搜索继续调试，今日口令“直挂云帆济沧海”在群里公开。', '马其顿呼声（Simonlin）', '知识库'],
    ['共学活动被提上日程', 'Simon一句“要不搞搞共学活动”，把潜水、清人和学习氛围串成了社群治理话题。', '马其顿呼声（Simonlin）', '共学'],
    ['AI工具入门互助', 'Codex、GPT Plus、Claude Code、Qoder、OpenClaw提示音等问题在下午持续排雷。', '李华荣', 'AI工具'],
    ['资源分享持续到深夜', 'wx-cli、微信读书Skill、boss-agent-cli、Agent学习路线等链接从下午一路刷到晚上。', '程玉', '资源']
  ],
  dragons: [
    ['🥇', '是旦不是蛋', '180次'],
    ['🥈', '马其顿呼声（Simonlin）', '176次'],
    ['🥉', '千九', '98次'],
    ['4', '马佳彬', '74次'],
    ['5', '李华荣', '62次']
  ],
  resources: [
    ['马其顿呼声（Simonlin）', 'CLI-Anything：GUI软件一键变原生CLI', 'https://github.com/HKUDS/CLI-Anything'],
    ['李华荣', 'Oracle：Claude Code 与网页版 GPT 5.5 Pro 讨论方案', 'https://github.com/steipete/oracle'],
    ['李华荣', 'codex-image-bridge：用 Codex 能力桥接 Claude 生成图片', 'https://github.com/xmasdong/codex-image-bridge'],
    ['李华荣', '飞书资料库：Claude/Codex 相关知识整理', 'https://ccnk05wgo092.feishu.cn/wiki/Q52dwmohyi5dNAkUmMWcTFEfnLq?from=from_copylink'],
    ['Leo Feng 🍊', 'AGENT橘的文字分享', 'https://mp.weixin.qq.com/s?scene=1&__biz=MzkwMzY5NzU2Nw==&mid=2247489735&idx=1&sn=6634dc2adef26643accfa6d6153deb66'],
    ['千九', '数字生命卡兹克的文字分享', 'https://mp.weixin.qq.com/s/TOlv8akMwwHM9u41U-P5eQ'],
    ['小耳｜李娟｜AI Builder', '网页撕拉技术开源说明', 'https://x.com/xiaoerzhan/status/2057266029714370946'],
    ['马其顿呼声（Simonlin）', '云舒：从提示词卡片到 Agent，一个 AI 产品经理的“游戏”之路', 'https://www.xiaoyuzhoufm.com/episode/6a0dbcf5e1eb34a939c730b4'],
    ['马其顿呼声（Simonlin）', '2026中国AI应用全景图谱报告（量子位智库）', '群内文件'],
    ['马其顿呼声（Simonlin）', '飞书 AI 应用图谱/资料库', 'https://jkhbjkhb.feishu.cn/wiki/W5D7wuDcbiPXDLkaRLQcAJpOn8f?view=vewf0LppY2'],
    ['数字阿启', 'nima-tech：集众人之广博做的平台', 'https://www.nima-tech.space/'],
    ['马其顿呼声（Simonlin）', 'wx-cli：微信命令行工具', 'https://github.com/jackwener/wx-cli'],
    ['李华荣', '微信读书 Skill：生成阅读地图', 'https://cdn.weread.qq.com/skills/weread-skills.zip'],
    ['李华荣', 'xiaojing-map：阅读地图项目', 'https://github.com/Trentct/xiaojing-map.git'],
    ['程玉', 'boss-agent-cli：BOSS直聘/智联招聘命令行工具', 'https://github.com/can4hou6joeng4/boss-agent-cli'],
    ['程玉', 'datacenter.fm：机房背景音生成器', 'https://datacenter.fm/'],
    ['马佳彬', '让AI帮我们实现肖像照自由，就这么简单！', 'https://mp.weixin.qq.com/s/vZJQAWSgcyVrG6PxXqHRyA'],
    ['程玉', '向阳乔木博客', 'https://blog.qiaomu.ai/'],
    ['马其顿呼声（Simonlin）', '完备的 AI Agent 学习路线，最详细的资源整理', 'https://mp.weixin.qq.com/s?__biz=MzIyNjM2MzQyNg==&mid=2247722983&idx=1&sn=43f9fe12b2b5b835515e7bdf1b1b78da'],
    ['白天乐', 'WaytoAGI：资料库链接', 'https://waytoagi.feishu.cn/wiki/OSGuw6RvRiRi3bkoYy9c4SC6nrg?from=from_copylink']
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
      title: '第一次大清洗预告，共学活动也被提上日程',
      avatar: '清',
      lines: [
        'Simon一句“兄弟们，过两天就要清人了”，群里立刻进入求生模式。',
        '林义辉称之为“第一次大清洗”，强子补刀“史称第一次大清洗”。下午 Simon 又问“要不搞搞共学活动？”，群友从求生模式切到学习模式。'
      ],
      comment: '清人通知一发，群活跃度 KPI 当场起飞；共学活动一提，潜水也有了正当上岸理由。'
    },
    {
      title: 'Codex、GPT Plus、Qoder，新手入门和工具迁移一起发生',
      avatar: 'CDX',
      lines: [
        '小辣椒说下载了 Codex，但没有 ChatGPT 账号，卡在第一步；青元跟着表示“同卡”。',
        '下午话题继续延伸到 GPT Plus、Claude Code、Qoder、OpenClaw 完成任务响铃等工具体验，李华荣建议新手先开一个月 GPT Plus 试用 Codex。'
      ],
      comment: 'AI时代的第一道门槛不是 prompt，是登录。'
    },
    {
      title: '这个群真能学到东西，复读机模式开启',
      avatar: '学',
      lines: [
        '信华发图感慨“上网真的能学到东西”，小辣椒接着说“这个群真能学到东西啦，把我这个小白拉高多少个的层次了”。',
        '一句话引发全群复读，早上不吃饭的孟凡、朱孟凯、李华荣、马佳彬、星淇等接连复制。下午又围绕划线、摘要、错题本、知识内化展开了一轮方法论争论。'
      ],
      comment: '知识型社群的最高形态：先学习，再复读，最后变成群梗。'
    },
    {
      title: '资源从白天刷到深夜，日报馆漏掉的后半场补上了',
      avatar: '链',
      lines: [
        '13点后继续出现 wx-cli、微信读书 Skill、xiaojing-map、boss-agent-cli、datacenter.fm、乔木博客、AI Agent 学习路线等链接。',
        '晚间话题从工具资源切到健康作息、妹妹人脉、阅文 IP 授权、小红书和 WaytoAGI 资料库，5月21日实际远不止上午那313条。'
      ],
      comment: '前半天像工具发布会，后半天像共学群、资源群、养生群和吐槽群同时开会。'
    }
  ],
  edgeSignals: [
    'CAISI 评估报告显示闭源旗舰模型与开源模型差距从4个月扩大到8个月。',
    '小耳开源“网页撕拉”技术，继续把浏览器内容采集做成生产力工具。',
    'wx-cli、boss-agent-cli、微信读书 Skill 等工具链接集中出现，命令行化和 skill 化继续扩散。',
    '“有效发言”“共学活动”“群除我佬”等表达显示，社群正在从围观热闹转向有意识地经营学习氛围。'
  ],
  summary: [
    ['最活跃的人', '是旦不是蛋 — 180条消息，下午后半场持续输出观点和工具体验'],
    ['最佳推进者', '马其顿呼声（Simonlin） — 176条消息，继续推进群知识库、清人规则、共学活动和资源沉淀'],
    ['最佳助攻', '李华荣 — 从 Claude/Codex 资料到 GPT Plus 入门建议，继续在线给新手排雷'],
    ['最佳气氛组', '全体复读机 — “这个群真能学到东西啦”“群除我佬”把学习感和群梗一起刷屏']
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

const reportCardPattern = new RegExp(`    <!-- ${report.titleDate} -->\\n    <a href="${report.file}" class="report-card newest">[\\s\\S]*?\\n    <\\/a>`);
if (reportCardPattern.test(index)) {
  index = index.replace(reportCardPattern, indexCard(report, true));
} else if (!index.includes(`href="${report.file}"`)) {
  index = index.replace('    <!-- 5月20日 -->', `${indexCard(report, true)}\n    <!-- 5月20日 -->`);
}

writeFileSync(join(repoRoot, 'index.html'), index);

console.log('Updated 2026-05-21.html, 2026-05-20.html resource links, and index.html');
