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

const report22 = {
  file: '2026-05-22.html',
  titleDate: '5月22日',
  fullDate: '2026年5月22日',
  weekday: '周五',
  count: '978',
  sidebarEvents: [
    ['Marvis与AI泔水', '凌晨从腾讯 Marvis、Claude Code 流量文聊到 AI 泔水和新媒体封面，马佳彬直接开骂。', '马佳彬', '内容'],
    ['Codex/Appshots 更新', 'Vinc 分享 Codex Appshots 更新，群里继续讨论 Mac、窗口快照和 AI 编程体验。', 'Vinc', 'Codex'],
    ['Hermes与AI工程', '风林要把 Codex 接入 hermes，Simon 分享 PRD Skill、AI 工程从零开始项目和 WaytoAGI 资料。', '马其顿呼声（Simonlin）', '工程'],
    ['工具与资源爆发', 'remove-ai-watermarks、sub2api、乔木快捷提示词、carboncode、Seedance Fast 等资源全天出现。', '程玉', '资源'],
    ['Pan总账号互助', '晚上 Pan 继续发 GPT/Grok/Gemini 账号福利，钢针Edu、夏日午茶等人在线完成登录。', 'Pan', '互助']
  ],
  dragons: [
    ['🥇', '马佳彬', '115次'],
    ['🥈', '马其顿呼声（Simonlin）', '110次'],
    ['🥉', '亿华工业地产  朱孟凯 13616607031', '71次'],
    ['4', '程玉', '55次'],
    ['5', '千九', '55次']
  ],
  resources: [
    ['数字阿启', '腾讯操作系统级 AI 助手 Marvis 相关视频', 'https://v.douyin.com/5_EprUbFCJA/'],
    ['辛亥', '用 Claude Code，你以为说了一个 Hello？不是，你发过去一本三国演义', 'https://mp.weixin.qq.com/s?__biz=MjM5NzI0Mjg0MA==&mid=2652378174&idx=1&sn=72bb773a932e7c5f56582e8c187e9bc5'],
    ['Vinc', 'OpenAI Codex Appshots 更新介绍', 'https://mapp.api.weibo.cn/fx/2b42c1706bdb137fc97dd1d5ae3de7a0.html&wx=1'],
    ['瓦叔', '8天，120美元，我和一个AI搭档做了个产品', 'https://mp.weixin.qq.com/s/1rgRa5KSgIPXBytbJLmksA'],
    ['星淇', '云舒的AI实践笔记', 'https://mp.weixin.qq.com/s?scene=1&__biz=MzIyNTE1NTAzOA==&mid=2648669925&idx=1&sn=f26395bdea4c3202646e36d67f7e7617'],
    ['马其顿呼声（Simonlin）', '云舒 PRD Skill：prd-test-writer', 'https://github.com/yunshu0909/yunshu_skillshub/tree/master/prd-test-writer'],
    ['马其顿呼声（Simonlin）', 'WaytoAGI 资料库', 'https://waytoagi.feishu.cn/wiki/OpxpwRsrYiaWs3kNUqbc2hhnngg'],
    ['๑🌱๑', 'hermes-agent：NousResearch Hermes Agent', 'https://github.com/NousResearch/hermes-agent'],
    ['雨一直下', '3.9元搞定Codex！国内也能畅用', 'https://mp.weixin.qq.com/s/Apug3BJtiIxItslFkmEvnA'],
    ['马其顿呼声（Simonlin）', 'AI Engineering From Scratch', 'https://github.com/rohitg00/ai-engineering-from-scratch'],
    ['程玉', 'remove-ai-watermarks：移除 AI 图片水印工具', 'https://github.com/wiltodelta/remove-ai-watermarks'],
    ['十九', 'GLM-5.1 高速版来了', 'https://mp.weixin.qq.com/s?__biz=MzUxNjg4NDEzNA==&mid=2247533878&idx=1&sn=c8ecc5c7d91dda9355eda9c51c87f2b0'],
    ['对长亭晚', 'sub2api：把现成 AI 账号接成统一 API 入口', 'https://github.com/Wei-Shaw/sub2api'],
    ['李华荣', '拆解 Agent Skill 核心逻辑，告别 skill 频繁翻车', 'https://mp.weixin.qq.com/s?__biz=Mzk4ODQ3MTU0Nw==&mid=2247484719&idx=1&sn=692ffe367084bc70364fd8420dc014d5'],
    ['向阳乔木', '乔木快捷提示词 Chrome 插件', 'https://chromewebstore.google.com/detail/%E4%B9%94%E6%9C%A8%E5%BF%AB%E6%8D%B7%E6%8F%90%E7%A4%BA%E8%AF%8D/ndfmbdiaclladmoeifbhlkacllmfhjej'],
    ['数字阿启', 'carboncode', 'https://github.com/Yapie0/carboncode'],
    ['留给中国队的时间不多了', 'Seedance2.0 Fast 版更新', 'https://mp.weixin.qq.com/s?__biz=MzE5ODI2NDM3Mw==&mid=2247498888&idx=1&sn=a978271aaa16ae153edf868d88d20b44']
  ],
  events: [
    {
      title: 'Marvis上线与AI泔水大战，凌晨直接吵醒内容焦虑',
      avatar: '泔',
      lines: [
        '数字阿启凌晨抛出腾讯 AI 助手 Marvis，上来就问“马维斯谁用了？”并补充它像本地 Codex/Cowork 类助手。',
        '辛亥转发 Claude Code 流量文后，马佳彬对 AI 生成泔水内容火力全开，群里顺势聊到封面、标题、阅读量和新媒体玩法变迁。'
      ],
      comment: 'AI泔水最离谱的地方不是难喝，是它真的有人排队喝。'
    },
    {
      title: 'Codex Appshots更新，Mac一等公民话题再起',
      avatar: 'CDX',
      lines: [
        'Vinc 分享 Codex Appshots：双 Command 截屏送入 Codex，不只是 OCR，还能结合 Chrome 自动化补上下文。',
        '晚间夏日午茶问 Mac 是否必备，群友从“AI时代一等公民”聊到 Windows 路径报错、Codex 控制电脑体验和 Mac 托儿梗。'
      ],
      comment: '以前买 Mac 是为了设计审美，现在买 Mac 是为了少跟路径和权限吵架。'
    },
    {
      title: 'Hermes、PRD Skill和AI工程，工具链继续向工程化推进',
      avatar: '工',
      lines: [
        '风林提出安装 hermes-agent，并把 Codex 接入 Hermes 作为底层模型，群里继续把模型、代理和工具链往一起拧。',
        'Simon 分享云舒的 PRD Skill、WaytoAGI 资料库和 AI Engineering From Scratch，上午主线从“用工具”切到“搭系统”。'
      ],
      comment: '这群人的日常：别人收藏教程，他们想把教程变成 skill，再让 agent 替自己学教程。'
    },
    {
      title: '资源分享全天不断，从水印工具到统一API入口',
      avatar: '链',
      lines: [
        '程玉分享 remove-ai-watermarks，能移除可见水印和 SynthID 等不可见水印；对长亭晚带来 sub2api，把现成 AI 账号接成统一 API 入口。',
        '李华荣分享 Agent Skill 核心逻辑文章，向阳乔木发布快捷提示词 Chrome 插件，数字阿启抛出 carboncode，深夜还有 Seedance Fast 更新。'
      ],
      comment: '资源密度已经不是“今天有几个链接”，而是“今天不建索引就会迷路”。'
    },
    {
      title: 'Pan总账号互助继续，Codex入门靠验证码续命',
      avatar: '号',
      lines: [
        '晚上 Pan 发第20期 AI 会员账号福利，GPT Plus、Grok、Gemini、镜像站一应俱全，还持续帮群友接验证码。',
        '钢针Edu想用 Codex 做网站，夏日午茶登录 Antigravity，群里一边调账号一边感慨 Pan 总大气。'
      ],
      comment: 'AI时代的新手村 NPC：发账号、接验证码、顺手帮你跨过第一道门。'
    }
  ],
  edgeSignals: [
    'Codex Appshots 让“截图上下文 + 浏览器自动化”成为新的入口，桌面环境状态正在变成 Agent 输入。',
    'Marvis、Cowork、Antigravity、Codex 被放在一起比较，群友已经默认多 Agent 客户端并存。',
    'sub2api、共享账号、镜像站反复出现，说明“把账号能力 API 化/共享化”仍是强需求。',
    'AI泔水争论背后，是创作者对“低质量内容获得流量”的长期焦虑。'
  ],
  summary: [
    ['最活跃的人', '马佳彬 — 115条消息，从AI泔水骂到Mac托儿，输出密度拉满'],
    ['最佳推进者', '马其顿呼声（Simonlin） — 110条消息，继续分享 PRD Skill、AI工程和资料库'],
    ['最佳资源官', '程玉 — 55条消息，贡献水印工具、Appshots理解和多个工程资源'],
    ['最佳后勤', 'Pan — 继续发账号福利、接验证码，帮群友跨过 Codex/Antigravity 登录门槛']
  ]
};

function renderReport(item) {
  const footerDate = item.file.replace(/^(\d{4})-(\d{2})-(\d{2})\.html$/, (_, year, month, day) => `${year}-${Number(month)}-${Number(day)}`);
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
<div class="footer">共${esc(item.count)}条记录 · ${esc(footerDate)}完 · 🐉</div>
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

const reports = [report, report22];
const latestReport = report22;
for (const item of reports) {
  writeFileSync(join(repoRoot, item.file), renderReport(item));
}

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
  .replace(/<span class="num">(?:25|26)<\/span>\n      <span class="label">期日报<\/span>/, '<span class="num">27</span>\n      <span class="label">期日报</span>')
  .replace(/<span class="num">5月(?:20|21)日<\/span>\n      <span class="label">最新一期<\/span>/, '<span class="num">5月22日</span>\n      <span class="label">最新一期</span>')
  .replace('href="2026-05-20.html">查看最新日报', 'href="2026-05-22.html">查看最新日报')
  .replace(/共\d+期日报 · 持续更新中/, '共27期日报 · 持续更新中')
  .replace('<a href="2026-05-20.html" class="report-card newest">', '<a href="2026-05-20.html" class="report-card">')
  .replace('<a href="2026-05-21.html" class="report-card newest">', '<a href="2026-05-21.html" class="report-card">')
  .replace(/\n\s*<span class="newest-badge">最新<\/span>\n\s*<span class="card-weekday">周三<\/span>/, '\n          <span class="card-weekday">周三</span>');
index = index.replace(/\n\s*<span class="newest-badge">最新<\/span>\n\s*<span class="card-weekday">周四<\/span>/, '\n          <span class="card-weekday">周四</span>');

function upsertIndexCard(item, newest = false) {
  const pattern = new RegExp(`    <!-- ${item.titleDate} -->\\n    <a href="${item.file}" class="report-card(?: newest)?">[\\s\\S]*?\\n    <\\/a>`);
  if (pattern.test(index)) {
    index = index.replace(pattern, indexCard(item, newest));
    return;
  }
  const nextDate = item.file === '2026-05-22.html' ? '5月21日' : '5月20日';
  index = index.replace(`    <!-- ${nextDate} -->`, `${indexCard(item, newest)}\n    <!-- ${nextDate} -->`);
}

upsertIndexCard(report, false);
upsertIndexCard(latestReport, true);

writeFileSync(join(repoRoot, 'index.html'), index);

console.log('Updated 2026-05-22.html, 2026-05-21.html, 2026-05-20.html resource links, and index.html');
