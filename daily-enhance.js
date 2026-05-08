(function () {
  const aliasMap = new Map([
    ['马其顿呼声Simonlin', '马其顿呼声（Simonlin）'],
    ['马其顿呼声（Simonlin）', '马其顿呼声（Simonlin）'],
    ['Simonlin', '马其顿呼声（Simonlin）'],
    ['Simon', '马其顿呼声（Simonlin）'],
    ['馆长', '李华荣'],
    ['李馆长', '李华荣'],
    ['华荣', '李华荣'],
    ['小刘', '霄凡旅行小刘'],
    ['蛋蛋', '是旦不是蛋'],
    ['悖老师', '悖'],
    ['山佬', '奕成'],
    ['苍何老师', '苍何'],
    ['饼干哥哥', '苍何'],
    ['花叔', 'Alchian花生'],
    ['玄真', 'Dark 玄真'],
    ['毒舌点评', '毒舌点评']
  ]);

  const seedNames = [
    '马其顿呼声（Simonlin）', 'Simonlin', 'Simon', '李华荣', '李馆长', '馆长', '华荣',
    '程玉', '那时年少', '马佳彬', '霄凡旅行小刘', '小刘', '千九', '凡有语',
    '是旦不是蛋', '蛋蛋', '吴熳Rosia', '紫苏子ACG', '紫苏子', '沙皮狗', '奕成',
    'Stanley', 'DDA', 'Stu(dy ing)', 'Stuart', '悖', '悖老师', '李继刚', '苍何',
    '苍何老师', '饼干哥哥', '留给中国队的时间不多了', '林义辉', '风林', 'Irene',
    '烈日松饼', '瓦叔', '小马哥', 'Alchian花生', '花叔', 'Dark 玄真', '玄真',
    'Alan', '强子', '信华神', 'Dario', 'Daniela', '毒舌点评'
  ];

  const getOnclickName = (value) => {
    const match = String(value || '').match(/filterByMember\(['"](.+?)['"]\)/);
    return match ? match[1] : '';
  };

  const stripRole = (name) => String(name || '')
    .replace(/[：:，,。.!！?？"'“”‘’（）()【】\s]+$/g, '')
    .replace(/^(导火索是|核心爆料|如今最新进展是|更扎心的是|最后|而|然后)/, '')
    .replace(/(在群里|的观点.*|的回答.*|最后总结.*|最后服气.*|神点评.*|直接定性.*|补刀.*|秒回.*|追问.*|爆料.*|评价.*|表示认同.*|发了一连串资源.*|发了一条链接.*|甩出一则链接.*|抛出了一个理论.*|分享.*|说.*|问.*|回.*|接.*|邀请.*|突然.*|率先发力.*)$/g, '')
    .trim();

  const canonical = (name) => {
    const clean = stripRole(name);
    return aliasMap.get(clean) || clean;
  };

  const displayName = (name) => {
    const clean = canonical(name);
    if (clean === '马其顿呼声（Simonlin）') return 'Simonlin';
    return clean || '群友合辑';
  };

  const avatarText = (name) => {
    const shown = displayName(name);
    if (shown === '群友合辑') return '群';
    if (/^[A-Za-z]/.test(shown)) return shown.slice(0, 2).toUpperCase();
    return shown.slice(0, 1);
  };

  const names = new Set(seedNames);
  document.querySelectorAll('.dragon-mini,.link-card,.bubble-who').forEach((el) => {
    const fromClick = getOnclickName(el.getAttribute('onclick'));
    const text = el.textContent.trim();
    if (fromClick) names.add(canonical(fromClick));
    if (text && text !== '群友') names.add(canonical(text));
  });

  const sortedNames = [...names]
    .map(canonical)
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index)
    .sort((a, b) => b.length - a.length);

  const aliasesFor = (name) => {
    const main = canonical(name);
    const aliases = new Set([main]);
    aliasMap.forEach((value, key) => {
      if (value === main) aliases.add(key);
    });
    if (main === '李华荣') aliases.add('馆长');
    if (main === '马其顿呼声（Simonlin）') {
      aliases.add('Simon');
      aliases.add('Simonlin');
    }
    return [...aliases].filter(Boolean);
  };

  const findKnownName = (text) => {
    const source = String(text || '');
    let best = null;
    for (const name of sortedNames) {
      for (const alias of aliasesFor(name)) {
        const index = source.indexOf(alias);
        if (index < 0) continue;
        if (!best || index < best.index || (index === best.index && alias.length > best.alias.length)) {
          best = { name, alias, index };
        }
      }
    }
    return best ? best.name : '';
  };

  const inferSpeaker = (row) => {
    const who = row.querySelector('.bubble-who')?.textContent.trim();
    if (who && who !== '群友') return canonical(who);

    const text = row.querySelector('.bubble-chat')?.textContent.trim() || '';
    const firstPart = text.slice(0, 90);
    const explicit = findKnownName(firstPart);
    if (explicit) return canonical(explicit);

    const match = firstPart.match(/^([\u4e00-\u9fa5A-Za-z0-9（）()·\s]{1,14})(?:说|问|回|接|分享|发|晒|吐槽|补充|总结|追问|评价|表示|感慨|爆料|甩出|贴出|引用|邀请)/);
    if (match) return canonical(match[1]);

    return '群友合辑';
  };

  const makeNameButton = (name, className) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = displayName(name);
    button.dataset.member = canonical(name);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      window.filterByMember(canonical(name));
    });
    return button;
  };

  const linkNamesInside = (node) => {
    const original = node.textContent;
    const candidates = sortedNames
      .flatMap((name) => aliasesFor(name).map((alias) => ({ alias, name })))
      .filter(({ alias }) => alias && original.includes(alias))
      .sort((a, b) => b.alias.length - a.alias.length);

    if (!candidates.length) return;

    const fragment = document.createDocumentFragment();
    let index = 0;
    let textBuffer = '';
    const flushText = () => {
      if (!textBuffer) return;
      fragment.append(document.createTextNode(textBuffer));
      textBuffer = '';
    };

    while (index < original.length) {
      const hit = candidates.find(({ alias }) => original.startsWith(alias, index));
      if (!hit) {
        textBuffer += original[index];
        index += 1;
        continue;
      }
      flushText();
      fragment.append(makeNameButton(hit.name, 'inline-member'));
      index += hit.alias.length;
    }
    flushText();
    node.textContent = '';
    node.append(fragment);
  };

  const decorateBubble = (row, index) => {
    const member = inferSpeaker(row);
    row.dataset.member = member;
    row.dataset.eventMembers = [member, findKnownName(row.textContent)].filter(Boolean).map(canonical).join(',');

    const avatar = row.querySelector('.bubble-avatar');
    if (avatar) {
      avatar.textContent = avatarText(member);
      avatar.dataset.member = member;
      avatar.classList.add('is-clickable');
      avatar.onclick = (event) => {
        event.stopPropagation();
        window.filterByMember(member);
      };
    }

    const who = row.querySelector('.bubble-who');
    if (who) {
      who.textContent = '';
      who.append(makeNameButton(member, 'bubble-name-button'));
    }

    const chat = row.querySelector('.bubble-chat');
    if (chat) {
      chat.onclick = null;
      linkNamesInside(chat);
    }

    if (member === '马其顿呼声（Simonlin）' || index % 5 === 3) {
      row.classList.add('right');
    }
  };

  const decorateEventTags = (section) => {
    const tagBox = section.querySelector('.event-tags');
    if (!tagBox) return;

    const found = sortedNames
      .filter((name) => name !== '群友合辑' && (section.textContent.includes(name) || aliasesFor(name).some((alias) => section.textContent.includes(alias))))
      .map(canonical)
      .filter((name, index, list) => name && list.indexOf(name) === index)
      .slice(0, 6);

    tagBox.textContent = '';
    found.forEach((name) => {
      const chip = makeNameButton(name, 'member-chip');
      tagBox.append(chip);
    });
  };

  document.querySelectorAll('.bubble-row').forEach(decorateBubble);
  document.querySelectorAll('.event-section').forEach((section) => {
    decorateEventTags(section);
    const eventNames = [...section.querySelectorAll('.bubble-row')]
      .map((row) => row.dataset.member)
      .filter(Boolean);
    section.dataset.members = [...new Set([...eventNames, section.dataset.members || ''])].join(',');
  });

  const banner = document.getElementById('filterBanner');
  if (banner && !document.getElementById('noFilterResult')) {
    const empty = document.createElement('div');
    empty.id = 'noFilterResult';
    empty.className = 'no-filter-result';
    empty.textContent = '这一期里暂时没有匹配到这个群友的事件。';
    banner.insertAdjacentElement('afterend', empty);
  }

  window.filterByMember = function filterByMember(name) {
    const member = canonical(name);
    if (!member) return clearFilter();

    const aliases = aliasesFor(member);
    const filterText = document.getElementById('filterText');
    const empty = document.getElementById('noFilterResult');
    let visibleCount = 0;

    if (banner) banner.classList.add('show');
    if (filterText) filterText.textContent = '当前筛选：' + displayName(member);

    document.querySelectorAll('.member-chip,.bubble-name-button,.inline-member,.dragon-mini').forEach((el) => {
      const target = canonical(el.dataset.member || getOnclickName(el.getAttribute('onclick')) || el.textContent.trim());
      el.classList.toggle('active', target === member);
    });

    document.querySelectorAll('.event-section').forEach((section) => {
      const matched = aliases.some((alias) => section.textContent.includes(alias));
      section.classList.toggle('hidden', !matched);
      if (matched) visibleCount += 1;

      section.querySelectorAll('.bubble-row').forEach((row) => {
        const rowMatched = aliases.some((alias) => row.textContent.includes(alias) || row.dataset.member === canonical(alias));
        row.classList.toggle('matching-member', rowMatched);
        row.querySelectorAll('.bubble-chat').forEach((chat) => chat.classList.toggle('highlight', rowMatched));
      });
    });

    if (empty) empty.classList.toggle('show', visibleCount === 0);
    const first = document.querySelector('.event-section:not(.hidden)');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.clearFilter = function clearFilter() {
    if (banner) banner.classList.remove('show');
    const empty = document.getElementById('noFilterResult');
    if (empty) empty.classList.remove('show');
    document.querySelectorAll('.member-chip,.bubble-name-button,.inline-member,.dragon-mini').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.event-section').forEach((section) => section.classList.remove('hidden'));
    document.querySelectorAll('.bubble-row').forEach((row) => row.classList.remove('matching-member'));
    document.querySelectorAll('.bubble-chat').forEach((chat) => chat.classList.remove('highlight'));
  };

  document.querySelectorAll('.dragon-mini,.chat-bubble-mini,.link-who').forEach((el) => {
    el.addEventListener('click', (event) => {
      const fromClick = getOnclickName(el.getAttribute('onclick'));
      const text = el.querySelector('.name,.bubble-who')?.textContent.trim() || el.textContent.trim();
      const member = canonical(fromClick || text);
      if (member) {
        event.stopPropagation();
        window.filterByMember(member);
      }
    });
  });
})();
