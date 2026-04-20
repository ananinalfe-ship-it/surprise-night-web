/* ============================================================
   v3 · 沉浸式戏剧交互层 — 行为
   依赖: window.TWEAKS 已存在
   ============================================================ */
(function(){
  const body = document.body;
  const T = window.TWEAKS || {};
  const ENTRY_FLOW_KEY = 'sn-v3-entry-flow-complete';

  /* ========== URL 参数：?reset 清线索 / ?reset-all 清所有进度 ========== */
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.has('reset')) {
      localStorage.removeItem('sn-props');
    }
    if (qs.has('reset-all')) {
      localStorage.removeItem('sn-props');
      localStorage.removeItem('sn-role');
      localStorage.removeItem('sn-v3-entry-flow-complete');
      sessionStorage.removeItem('sn-v3-entry-flow-complete');
      document.cookie = 'sn-v3-entry-flow-complete=;path=/;max-age=0;SameSite=Lax';
    }
  } catch(e){}
  function cookieHasEntryFlag(){
    try {
      return document.cookie.split(';').some((c)=>{
        const p = c.trim().split('=');
        return p[0] === ENTRY_FLOW_KEY && p[1] === '1';
      });
    } catch(e){ return false; }
  }
  function isEntryFlowComplete(){
    try {
      if (localStorage.getItem(ENTRY_FLOW_KEY) === '1') return true;
      if (sessionStorage.getItem(ENTRY_FLOW_KEY) === '1') return true;
    } catch(e){}
    if (cookieHasEntryFlag()) return true;
    /* 已选过身份即视为完成过进站链（避免仅依赖 ENTRY 标记在 600ms 延迟期间丢写） */
    try {
      const r = localStorage.getItem('sn-role');
      if (r === 'guest' || r === 'accomplice') return true;
    } catch(e){}
    return false;
  }
  function markEntryFlowComplete(){
    try { localStorage.setItem(ENTRY_FLOW_KEY, '1'); } catch(e){}
    try { sessionStorage.setItem(ENTRY_FLOW_KEY, '1'); } catch(e){}
    try {
      const max = 60 * 60 * 24 * 400;
      document.cookie = ENTRY_FLOW_KEY + '=1;path=/;max-age=' + max + ';SameSite=Lax';
    } catch(e){}
  }
  function getSavedIdentityRole(){
    let r;
    try { r = localStorage.getItem('sn-role'); } catch(e){}
    if (r === 'guest' || r === 'accomplice') return r;
    if (T.identityRole === 'guest' || T.identityRole === 'accomplice') return T.identityRole;
    return 'guest';
  }

  /* ========== ① 钥匙开门 ========== */
  function setupKey(){
    if (isEntryFlowComplete()){
      body.classList.add('no-key', 'key-done', 'no-intro', 'intro-done', 'intro-ready');
      body.classList.remove('identity-open');
      return;
    }
    if (!T.keyIntro){ body.classList.add('no-key','key-done'); return maybeShowIdentity(); }
    const gate = document.getElementById('keyGate');
    if (!gate) return;
    const handle = gate.querySelector('.key-gate__handle');
    const fill = gate.querySelector('.key-gate__fill');
    const track = gate.querySelector('.key-gate__track');
    let dragging = false, startX = 0, currentX = 4;

    const onDown = (e)=>{
      dragging = true;
      startX = (e.touches? e.touches[0].clientX : e.clientX) - currentX;
      handle.style.transition = 'none';
      fill.style.transition = 'none';
    };
    const onMove = (e)=>{
      if (!dragging) return;
      const x = (e.touches? e.touches[0].clientX : e.clientX) - startX;
      const max = track.offsetWidth - 60;
      currentX = Math.max(4, Math.min(max, x));
      handle.style.transform = `translate(${currentX}px, -50%)`;
      fill.style.width = (currentX + 30) + 'px';
      if (currentX >= max - 4){
        completeKey();
      }
    };
    const onUp = ()=>{
      if (!dragging) return;
      dragging = false;
      const max = track.offsetWidth - 60;
      if (currentX < max - 4){
        handle.style.transition = 'transform .5s cubic-bezier(.3,1.4,.5,1)';
        fill.style.transition = 'width .5s ease';
        currentX = 4;
        handle.style.transform = `translate(4px, -50%)`;
        fill.style.width = '0px';
      }
    };
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, {passive:true});
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, {passive:true});
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    function completeKey(){
      dragging = false;
      body.classList.add('key-done');
      setTimeout(maybeShowIdentity, 700);
    }
  }

  /* ========== ② 身份选择 ========== */
  function maybeShowIdentity(){
    if (T.identityRole && T.identityRole !== 'guest'){
      applyRole(T.identityRole);
      startMainIntro();
      return;
    }
    body.classList.add('identity-open');
  }
  function applyRole(role){
    const prev = body.getAttribute('data-role') || 'guest';
    body.setAttribute('data-role', role);
    T.identityRole = role;
    persist({identityRole: role});
    try { localStorage.setItem('sn-role', role); } catch(e){}
    // 更新导航栏身份徽章
    const badge = document.getElementById('roleBadge');
    if (badge){
      badge.style.display = 'inline-flex';
      const label = badge.querySelector('.role-badge__label');
      if (label) label.textContent = {guest:_t('role.badge.audience','Audience · 观众'), accomplice:_t('role.badge.accomplice','Accomplice · 共谋者')}[role] || _t('role.badge.audience','Audience');
    }
    // 注入/刷新卡片小标签
    injectCardLabels(role);
    // 刷新 Act rail 标签
    refreshActLabels(role);
    // 切换 AI 默认角色（观众=票务, 玩家=角色, 共谋者=导演）
    const defaultRoles = { guest:'agent', accomplice:'director' };
    const aiRole = defaultRoles[role];
    if (aiRole){
      currentRole = aiRole;
      document.querySelectorAll('[data-role-switch]').forEach(b=>{
        b.classList.toggle('is-active', b.dataset.roleSwitch === aiRole);
      });
    }
    // 视觉反馈（非首次）
    if (prev !== role && document.body.classList.contains('intro-done')){
      flashRoleSwitch(prev, role);
    }
    markEntryFlowComplete();
  }
  // 点击徽章重新选择身份
  document.addEventListener('click', (e)=>{
    if (e.target.closest('#roleBadge')){
      body.classList.add('identity-open');
    }
  });
  document.addEventListener('click', (e)=>{
    const roleBtn = e.target.closest('[data-role-pick]');
    if (roleBtn){
      const role = roleBtn.dataset.rolePick;
      applyRole(role);
      body.classList.remove('identity-open');
      setTimeout(startMainIntro, 600);
      if (role === 'accomplice'){
        setTimeout(()=>showUnlock(_t('prop.unlock.accomplice', '共谋者身份已激活 · <em>隐藏剧目已解锁</em>')), 1800);
      }
    }
    if (e.target.closest('[data-role-skip]')){
      applyRole('guest');
      body.classList.remove('identity-open');
      setTimeout(startMainIntro, 600);
    }
  });

  function startMainIntro(){
    /* 进站完成标记在 applyRole 末尾写入，避免身份层 600ms 延迟期间离开页面导致丢标记 */
    // 触发原 v2 的 curtain / hero 进场
    if (typeof window.__startV2Intro === 'function'){
      window.__startV2Intro();
    } else {
      body.classList.add('intro-ready');
      setTimeout(()=>body.classList.add('intro-done'), 1600);
    }
    setTimeout(()=>document.querySelector('.act-rail')?.classList.add('is-visible'), 2400);
    setTimeout(()=>document.querySelector('.sound-btn')?.classList.add('is-visible'), 2800);
    setTimeout(()=>document.querySelector('.props-counter')?.classList.add('is-visible'), 3200);
  }

  /* ========== ③ 追光鼠标 ========== */
  let mx = window.innerWidth/2, my = window.innerHeight/2;
  window.addEventListener('mousemove', (e)=>{
    mx = e.clientX; my = e.clientY;
    document.documentElement.style.setProperty('--mx', mx+'px');
    document.documentElement.style.setProperty('--my', my+'px');
  });

  /* ========== ⑤ 道具彩蛋 ========== */
  // 统一从 i18n dict 取值；若 dict 尚未加载，回退到中文默认
  const _t = (key, fallback) => (window.__i18n && window.__i18n.dict && window.__i18n.dict[key]) || fallback;
  const PROPS = [
    { id:'letter', icon:'\u2709\uFE0E',
      get title(){ return _t('prop.letter.title', '一封未寄出的信'); },
      get text(){ return _t('prop.letter.text', '"——如果你读到这封信，就说明你也在找我。第三场演出结束后，请留在原座位。"<br><br>【道具出自《终极骗局 3.0》】'); } },
    { id:'ticket', icon:'✦',
      get title(){ return _t('prop.ticket.title', '半张票根'); },
      get text(){ return _t('prop.ticket.text', '"1988 · 午夜场 · 座位 13C"<br><br>没人知道那晚到底演了什么。剧场在第二天清晨被拆除。'); } },
    { id:'coin', icon:'◉',
      get title(){ return _t('prop.coin.title', '一枚旧硬币'); },
      get text(){ return _t('prop.coin.text', '"正面是演员，反面是观众。<br>你抛向空中时——它会落在哪一面？"<br><br>【导演留言】'); } }
  ];
  let foundProps = new Set();

  /* ========== 聂小倩 banner 鼠标追光 ========== */
  function setupBannerSpotlight(){
    const banners = document.querySelectorAll('.card--spotlight-hover');
    banners.forEach(banner => {
      banner.addEventListener('mousemove', (e) => {
        const rect = banner.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        banner.style.setProperty('--spot-x', x + '%');
        banner.style.setProperty('--spot-y', y + '%');
      });
      banner.addEventListener('mouseleave', () => {
        banner.style.setProperty('--spot-x', '70%');
        banner.style.setProperty('--spot-y', '50%');
      });
    });
  }

  function setupProps(){
    if (!T.easterEggs) return;
    const saved = localStorage.getItem('sn-props');
    if (saved) foundProps = new Set(JSON.parse(saved));
    renderPropsCounter();

    PROPS.forEach((p, i)=>{
      if (foundProps.has(p.id)) return;
      const el = document.createElement('div');
      el.className = 'prop';
      el.dataset.propId = p.id;
      const rot = (Math.random()*20 - 10);
      el.style.setProperty('--rot', rot+'deg');
      el.style.fontSize = '36px';
      el.style.color = 'rgba(216,160,96,0.85)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontFamily = 'serif';
      el.textContent = p.icon;
      // 随机位置（不同 section）
      const positions = [
        { top: '85vh', left: '8vw' },
        { top: '220vh', right: '6vw' },
        { top: '360vh', left: '12vw' }
      ];
      const pos = positions[i];
      Object.assign(el.style, pos);
      el.style.position = 'absolute';
      document.body.appendChild(el);
      el.addEventListener('click', ()=>findProp(p));
    });
  }

  function findProp(p){
    if (foundProps.has(p.id)) return;
    foundProps.add(p.id);
    localStorage.setItem('sn-props', JSON.stringify([...foundProps]));
    const el = document.querySelector(`.prop[data-prop-id="${p.id}"]`);
    if (el) el.classList.add('is-found');
    setTimeout(()=>el?.remove(), 900);
    showPropModal(p);
    renderPropsCounter();
    if (foundProps.size === PROPS.length){
      setTimeout(()=>showUnlock(_t('prop.unlock.allFound', '三把钥匙已集齐 · <em>《第十三场》《残像》已解锁</em>')), 800);
    }
  }

  function showPropModal(p){
    const modal = document.getElementById('propModal');
    modal.querySelector('.prop-modal__title').textContent = p.title;
    modal.querySelector('.prop-modal__text').innerHTML = p.text;
    modal.classList.add('is-open');
  }
  document.addEventListener('click', (e)=>{
    if (e.target.closest('.prop-modal__close') || e.target.classList.contains('prop-modal')){
      document.getElementById('propModal')?.classList.remove('is-open');
    }
  });

  function renderPropsCounter(){
    const dots = document.querySelectorAll('.props-counter__dot');
    dots.forEach((d,i)=> d.classList.toggle('is-on', i < foundProps.size));
    updateSecretCardsLock();
    const count = document.querySelector('.props-counter__count');
    if (count) count.textContent = `${foundProps.size}/${PROPS.length}`;
  }

  /* 解锁横幅 */
  function showUnlock(html){
    const b = document.getElementById('unlockBanner');
    if (!b) return;
    b.innerHTML = html;
    b.classList.add('is-shown');
    setTimeout(()=>b.classList.remove('is-shown'), 4500);
  }

  /* 解锁隐藏剧目卡：遮罩随道具数量递减，集齐即显形 */
  function updateSecretCardsLock(){
    const cards = document.querySelectorAll('[data-secret-card]');
    const n = foundProps.size;
    // 判断 i18n 是否已 apply 完成（避免 innerHTML 覆盖 shard span）
    const i18nApplied = !!(window.__i18n && window.__i18n.dict && Object.keys(window.__i18n.dict).length > 0);
    cards.forEach(card => {
      // 首次 shardify 必须等 i18n apply 完之后，否则 shard span 会被字典 innerHTML 覆盖
      if (!card.dataset.shardReady && i18nApplied) {
        card.querySelectorAll('[data-shard-text]').forEach(el => shardifyText(el));
        card.dataset.shardReady = '1';
      }
      const prev = Number(card.getAttribute('data-found') || 0);
      card.setAttribute('data-found', String(n));
      if (n >= PROPS.length) {
        card.classList.remove('is-locked');
        card.classList.add('is-unlocked');
      } else {
        card.classList.add('is-locked');
        card.classList.remove('is-unlocked');
      }
      // 新批次字符做闪现（仅在 shardify 已完成后才有效）
      if (card.dataset.shardReady && n > prev && n > 0) {
        card.querySelectorAll(`[data-shard-text] .shard[data-shard="${n}"]`).forEach(s => {
          s.classList.add('is-just-revealed');
        });
        card.classList.add('is-shard-pulse');
        setTimeout(() => {
          card.classList.remove('is-shard-pulse');
          card.querySelectorAll('.shard.is-just-revealed').forEach(s => s.classList.remove('is-just-revealed'));
        }, 1200);
      }
    });
    // 若 i18n 还没 ready，注册一次性监听，ready 后再跑一次（此时才真正 shardify）
    if (!i18nApplied) {
      document.addEventListener('i18n:ready', () => updateSecretCardsLock(), { once: true });
    }
    document.querySelectorAll('[data-lock-progress]').forEach(el => {
      el.textContent = `${n} / ${PROPS.length}`;
    });
  }

  /* 把一个元素内的所有文本节点拆成字符 span，非空白字符随机分到 1/2/3 三组 */
  function shardifyText(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(tn => {
      const frag = document.createDocumentFragment();
      const text = tn.nodeValue;
      for (const ch of text) {
        if (/\s/.test(ch)) {
          frag.appendChild(document.createTextNode(ch));
        } else {
          const span = document.createElement('span');
          span.className = 'shard';
          span.setAttribute('data-shard', String(1 + Math.floor(Math.random() * 3)));
          span.textContent = ch;
          frag.appendChild(span);
        }
      }
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  /* ========== ⑥ AI 多角色 ========== */
  const ROLE_REPLIES = {
    director: {
      default: '我是这出戏的导演。关于惊喜之夜——我们相信剧场的本质不在于「表演」，而在于「共谋」。观众不是来看戏的，他们就是戏的一部分。',
      show: '2025 年的重点作品有三部：《终极骗局 3.0》是我们目前规模最大的沉浸式喜剧，共 47 个可分支结局；《第四面墙》是一部反思剧场本体的独角戏；《闹剧剧院》则把一座整栋老剧院变成了剧本杀。',
      cooperation: '合作上我最看重三件事：第一，空间是否允许我们改造叙事密度；第二，时间是否给演员与观众足够的建构时间；第三，品牌是否愿意放下「产品植入」这种思维。'
    },
    character: {
      default: '（灯光微暗）你好，观众。你是不是也在找那封信？——嘘，先别说话。墙后面有人。',
      show: '《终极骗局 3.0》你听说过吗？我就是里面那个「第二号线人」。不过——别告诉任何人你知道。',
      cooperation: '合作？你是说——想进入这个故事？那你得先回答一个问题：你愿意放弃「观众」这个身份吗？'
    },
    agent: {
      default: '你好，我是票务助手。想了解演出排期、购票、团体预订或企业合作，请告诉我你的具体问题。',
      show: '2025 年我们有三场主要演出：《终极骗局 3.0》周五六日、《第四面墙》每周三四、《闹剧剧院》每月最后一个周六。门票可以在官网购买。',
      cooperation: '合作渠道：品牌定制请发送 BD@surprise-night.com，演员合作 actor@，场地合作 venue@。我会在 24 小时内安排对接。'
    }
  };
  let currentRole = 'director';
  window.__getRoleReply = function(q){
    const roleData = ROLE_REPLIES[currentRole] || ROLE_REPLIES.director;
    if (q.includes('演出') || q.includes('剧目') || q.includes('骗局')) return roleData.show;
    if (q.includes('合作') || q.includes('合作') || q.includes('品牌')) return roleData.cooperation;
    return roleData.default;
  };

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-role-switch]');
    if (!btn) return;
    currentRole = btn.dataset.roleSwitch;
    document.querySelectorAll('[data-role-switch]').forEach(b=>b.classList.toggle('is-active', b===btn));
  });

  /* ========== ⑦ Act 指示 + 滚动感应 ========== */
  const ACTS = [
    { id:'hero', key:'act.hero', fallback:'I · 序幕', short:'I' },
    { id:'works', key:'act.works', fallback:'II · 剧目', short:'II' },
    { id:'press', key:'act.press', fallback:'III · 回响', short:'III' },
    { id:'caps', key:'act.caps', fallback:'IV · 合作', short:'IV' },
    { id:'manifesto', key:'act.manifesto', fallback:'V · 宣言', short:'V' },
    { id:'cta', key:'act.cta', fallback:'VI · 落幕', short:'VI' }
  ];
  function setupActRail(){
    if (!T.actIndicator) return;
    const rail = document.getElementById('actRail');
    if (!rail) return;
    rail.innerHTML = ACTS.map(a=>`
      <a href="#${a.id}" class="act-item" data-act="${a.id}">
        <span class="act-item__bar"></span>
        <span class="act-item__label" data-i18n="${a.key}">${_t(a.key, a.fallback)}</span>
      </a>`).join('');
    // 字典若还未加载完，等加载好再刷一次
    window.__i18n && window.__i18n.apply && window.__i18n.apply();

    const targets = ACTS.map(a=>document.getElementById(a.id)).filter(Boolean);
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if (en.isIntersecting){
          document.querySelectorAll('.act-item').forEach(i=>i.classList.toggle('is-active', i.dataset.act === en.target.id));
        }
      });
    }, { threshold: 0.35 });
    targets.forEach(t=> io.observe(t));
  }

  /* ========== ⑧ 间歇提示 ========== */
  let idleTimer;
  function resetIdle(){
    if (!T.idleNudge) return;
    body.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(()=>{
      if (body.classList.contains('identity-open')) return;
      if (document.querySelector('.prop-modal.is-open')) return;
      body.classList.add('is-idle');
    }, 45000);
  }
  ['mousemove','scroll','click','keydown'].forEach(ev=> window.addEventListener(ev, resetIdle, {passive:true}));
  resetIdle();

  /* ========== ⑨ 音效层 ========== */
  let ambientAudio = null;
  function toggleAmbient(force){
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    const shouldOn = force !== undefined ? force : !btn.classList.contains('is-on');
    btn.classList.toggle('is-on', shouldOn);
    T.ambientSound = shouldOn;
    persist({ambientSound: shouldOn});
    if (shouldOn){
      if (!ambientAudio){
        // 使用一个极低频的环境噪声合成 (Web Audio)
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i=0;i<data.length;i++){
            data[i] = (Math.random()*2-1) * 0.03 * Math.sin(i*0.0003);
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer; src.loop = true;
          const gain = ctx.createGain(); gain.gain.value = 0.15;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass'; filter.frequency.value = 300;
          src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
          src.start();
          ambientAudio = { ctx, src, gain };
        } catch(e){ console.warn(e); }
      } else {
        ambientAudio.gain.gain.value = 0.15;
      }
    } else if (ambientAudio){
      ambientAudio.gain.gain.value = 0;
    }
  }
  document.addEventListener('click', (e)=>{
    if (e.target.closest('#soundBtn')) toggleAmbient();
  });

  /* ========== 持久化 ========== */
  function persist(edits){
    try { window.parent?.postMessage({type:'__edit_mode_set_keys', edits}, '*'); } catch(e){}
  }

  /* ========== 身份专属：卡片标签 / Act 标签 / 切换反馈 ========== */

  // 每部剧的玩家难度 + 角色名 + 观演方式 + 共谋者幕后注释
  const CARD_META = {
    'shanhai':  { difficulty:3, role:'见证者', mode:'沉浸式 / 可站可走', note:'"第二幕结束时的雾，用的是食品级烟机——别告诉观众。"' },
    'ultimate': { difficulty:5, role:'合伙人', mode:'博弈式 / 全程参与', note:'"有一位常驻演员，其实是心理学博士。他在观察你。"' },
    'math':     { difficulty:1, role:'观众',   mode:'舞台 / 固定座位', note:'"灯光设计师坚持要用老式 PAR 灯——因为"数学需要硬光"。"' },
    'nie':      { difficulty:4, role:'线人',   mode:'沉浸式 / 需穿戏服', note:'"结局版本每月轮换一次。有些观众看过全部 7 版。"' },
    'yaonan':   { difficulty:4, role:'路人甲', mode:'沉浸式 / 分组行动', note:'"那间"空房间"其实不空。第三组观众会发现什么。"' }
  };

  function injectCardLabels(role){
    document.querySelectorAll('.card').forEach(card=>{
      // 清理旧标签
      card.querySelectorAll('.card__difficulty, .card__mode-audience, .card__secret-note').forEach(el=> el.remove());
      const key = Object.keys(CARD_META).find(k=> card.classList.contains('card--'+k));
      if (!key) return;
      const meta = CARD_META[key];

      if (false && role === 'player'){
        const stars = '◆'.repeat(meta.difficulty) + '◇'.repeat(5 - meta.difficulty);
        const el = document.createElement('div');
        el.className = 'card__difficulty';
        el.innerHTML = `<span>你：${meta.role}</span><span class="card__difficulty-stars">${stars}</span>`;
        card.appendChild(el);
      } else if (role === 'guest'){
        const el = document.createElement('div');
        el.className = 'card__mode-audience';
        el.textContent = meta.mode;
        card.appendChild(el);
      } else if (role === 'accomplice'){
        const el = document.createElement('div');
        el.className = 'card__secret-note';
        el.innerHTML = `<strong style="color:#b87df8">导演私注 · </strong>${meta.note}`;
        card.appendChild(el);
      }
    });
  }

  // 根据身份换 Act rail 的标签
  const ACT_LABELS = {
    guest:      ['I · 序幕','II · 剧目','III · 回响','IV · 合作','V · 宣言','VI · 落幕'],
    accomplice: ['启幕','密谋','交接','分岔','残响','散场']
  };
  function refreshActLabels(role){
    const labels = ACT_LABELS[role] || ACT_LABELS.guest;
    document.querySelectorAll('.act-item').forEach((el, i)=>{
      const lbl = el.querySelector('.act-item__label');
      if (lbl && labels[i]) lbl.textContent = labels[i];
    });
  }

  // 身份切换的一闪反馈
  function flashRoleSwitch(from, to){
    const flash = document.getElementById('roleFlash');
    const toast = document.getElementById('roleToast');
    const names = {
      guest: _t('role.audience', '观众'),
      accomplice: _t('role.accomplice', '共谋者')
    };
    if (flash){
      flash.classList.add('is-on');
      setTimeout(()=> flash.classList.remove('is-on'), 360);
    }
    if (toast){
      toast.innerHTML = `${_t('role.toast.prefix', '身份已切换：')}${names[from]||_t('role.guest','访客')} → <em>${names[to]||to}</em>`;
      toast.classList.add('is-shown');
      setTimeout(()=> toast.classList.remove('is-shown'), 2600);
    }
  }

  // 共谋者专属：暗门面板切换
  document.addEventListener('click', (e)=>{
    if (e.target.closest('#secretDoor')){
      document.getElementById('secretPanel')?.classList.toggle('is-open');
    } else if (!e.target.closest('.secret-panel')){
      document.getElementById('secretPanel')?.classList.remove('is-open');
    }
  });

  /* ========== 初始化 ========== */
  document.addEventListener('DOMContentLoaded', ()=>{
    const resumedHome = isEntryFlowComplete();
    setupKey();
    setupProps();
    setupActRail();
    setupBannerSpotlight();
    if (resumedHome){
      const role = getSavedIdentityRole();
      applyRole(role);
      document.querySelector('.act-rail')?.classList.add('is-visible');
      document.querySelector('#soundBtn')?.classList.add('is-visible');
      document.querySelector('.props-counter')?.classList.add('is-visible');
    }
    if (T.spotlightMode) body.classList.add('spotlight');
    // 如果之前已经选过身份（不是 guest 或明确记忆了），立即显示徽章
    if (T.identityRole && !resumedHome){
      body.setAttribute('data-role', T.identityRole);
      const badge = document.getElementById('roleBadge');
      if (badge){
        badge.style.display = 'inline-flex';
        const label = badge.querySelector('.role-badge__label');
        if (label) label.textContent = {guest:_t('role.badge.audience','Audience · 观众'), accomplice:_t('role.badge.accomplice','Accomplice · 共谋者')}[T.identityRole] || _t('role.badge.audience','Audience');
      }
      // 注入身份专属内容
      setTimeout(()=>{
        injectCardLabels(T.identityRole);
        refreshActLabels(T.identityRole);
        // 同步 AI 默认角色
        const defaultRoles = { guest:'agent', accomplice:'director' };
        const aiRole = defaultRoles[T.identityRole];
        if (aiRole){
          currentRole = aiRole;
          document.querySelectorAll('[data-role-switch]').forEach(b=>{
            b.classList.toggle('is-active', b.dataset.roleSwitch === aiRole);
          });
        }
      }, 100);
    }
    // 语言切换已由 i18n.js 接管
  });

  /* ========== 暴露给 Tweaks 面板 ========== */
  window.__v3 = {
    setSpotlight: (on)=> body.classList.toggle('spotlight', on),
    setEasterEggs: (on)=>{
      document.querySelectorAll('.prop').forEach(p=> p.style.display = on ? '' : 'none');
      document.querySelector('.props-counter')?.style.setProperty('display', on ? '' : 'none');
    },
    setActIndicator: (on)=> document.querySelector('.act-rail')?.classList.toggle('is-visible', on),
    setIdleNudge: (on)=>{ if (!on){ clearTimeout(idleTimer); body.classList.remove('is-idle'); } else resetIdle(); },
    replayKey: ()=>{
      body.classList.remove('key-done');
      localStorage.removeItem('sn-identity');
      const handle = document.querySelector('.key-gate__handle');
      const fill = document.querySelector('.key-gate__fill');
      if (handle) handle.style.transform = 'translate(4px, -50%)';
      if (fill) fill.style.width = '0';
    },
    resetProps: ()=>{
      localStorage.removeItem('sn-props');
      foundProps.clear();
      location.reload();
    }
  };
})();
