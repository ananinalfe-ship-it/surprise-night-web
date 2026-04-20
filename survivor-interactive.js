/*! survivor-interactive.js — card-based GA · turn-based GB */
(function(){
  'use strict';

  /* ========================================================
   * BOOT TERMINAL
   * ======================================================== */
  const termScreen = document.getElementById('termScreen');
  if (termScreen) {
    const lines = [
      {t:'sys', c:'Dranla OS v21.15 · Neural Node 0x0048 · booting...'},
      {t:'sys', c:'[✓] load /dranla/core.sys'},
      {t:'sys', c:'[✓] neural-bridge: 128-bit sync established'},
      {t:'ok',  c:'[✓] biometric scan: 1 signal detected — you'},
      {t:'',    c:''},
      {t:'input', c:'<span class="prompt">$</span>survivor --year 2115 --players 300'},
      {t:'sys', c:'>>> loading world_state.bin'},
      {t:'warn',c:'[!] WARN: 11% of neural transitions resulted in 兽之人 class'},
      {t:'err', c:'[!] BEAST_OF_HUMAN detected · population rising · social unrest +48%'},
      {t:'',    c:''},
      {t:'mag', c:'>>> Dranla Council directive #2115.07.13'},
      {t:'mag', c:'>>> Authorize Survival Game · Grand Prize: Transition Slot ×1'},
      {t:'',    c:''},
      {t:'input', c:'<span class="prompt">$</span>contestants --list'},
      {t:'sys', c:'CONTESTANT A · John Papadopoulos   · HUMAN · 2 HP'},
      {t:'sys', c:'CONTESTANT B · Eve Siemaszko       · AI    · 3 HP'},
      {t:'sys', c:'CONTESTANT C · Cyra Chiaroscuro    · BEAST · 5 HP'},
      {t:'mag', c:'HOST        · Maxwell Chiaroscuro · DRANLA · ∞ HP'},
      {t:'',    c:''},
      {t:'warn', c:'[!] NOTICE: rule stipulates "the winner transitions"'},
      {t:'warn', c:'[!] NOTICE: rule does NOT guarantee the winner exists'},
      {t:'',    c:''},
      {t:'input',c:'<span class="prompt">$</span>./approaching --init'},
      {t:'ok',   c:'Drala fen tiru. 永远尊敬德兰圣丁。'},
      {t:'ok cursor', c:'Press START to begin'},
    ];
    let i = 0;
    function add(){
      if (i >= lines.length) return;
      const l = lines[i++];
      const d = document.createElement('div');
      d.className = 'term__line' + (l.t ? ' term__line--' + l.t.split(' ')[0] : '');
      if (l.t && l.t.includes('cursor')) d.classList.add('cursor-blink');
      d.innerHTML = l.c || '&nbsp;';
      termScreen.appendChild(d);
      termScreen.scrollTop = termScreen.scrollHeight;
      setTimeout(add, l.c === '' ? 80 : (60 + Math.random()*140));
    }
    add();
  }

  /* ========================================================
   * GLOBAL STATE
   * ======================================================== */
  const state = {
    faction: null,
    gamesPlayed: { ga:false, gb:false },
    gaWinner: null,   // 'me' | 'eve' | 'draw'
    gaStyle:  null,   // 'aggressive' | 'defensive' | 'balanced'
    gbDone:   false,
    gbWinner: null,   // 'human' | 'ai' | 'beast'
  };

  /* ========================================================
   * FACTION PICKER
   * ======================================================== */
  const pickGrid = document.getElementById('pickGrid');
  const pickStatus = document.getElementById('pickStatus');
  if (pickGrid) {
    pickGrid.querySelectorAll('.sv-pick').forEach(el => {
      el.addEventListener('click', () => {
        pickGrid.querySelectorAll('.sv-pick').forEach(p => p.classList.remove('selected'));
        el.classList.add('selected');
        state.faction = el.dataset.key;
        const msgs = {
          human:  'SYS ▸ 阵营已选定：<b>原生人</b>。你是 300 人中最普通的那个——靠信任和勇气活下来。',
          ai:     'SYS ▸ 阵营已选定：<b>AI 机器人</b>。冷静、精算、免疫群体伤害——但不要忘了程序外的指令。',
          beast:  'SYS ▸ 阵营已选定：<b>兽之人</b>。5 条血的耐打体质——但情绪容易失控。',
          dranla: 'SYS ▸ 阵营已选定：<b>德兰圣丁（隐藏）</b>。你是这座剧场真正的主人——直到被识破为止。',
        };
        if (pickStatus) {
          pickStatus.classList.remove('empty');
          pickStatus.innerHTML = `<span>${msgs[state.faction]}</span><span style="color: var(--term-dim);">// faction=${state.faction}</span>`;
        }
        updateEndingsMeter();
      });
    });
  }

  /* ========================================================
   * GAME A · 生存战术对决 · 出牌对战
   * 规则：1=能量突击 · 2=护盾屏障 · 3=高级战术
   * 数字大胜，对手扣 1 血；但 1 克制 3（能量反制战术）
   * 相同 → 双方各扣 1 血
   * 血归 0 者败。
   * ======================================================== */
  const gaRoot = document.getElementById('ga');
  if (gaRoot) {
    const ui = {
      phase: document.getElementById('ga-phase'),
      prompt: document.getElementById('ga-prompt'),
      eveLabel: document.getElementById('ga-eve-label'),
      cards: document.querySelectorAll('#ga-cards .ga__card'),
      stage: document.getElementById('ga-stage'),
      scoreMe: document.getElementById('ga-score-me'),
      scoreEve: document.getElementById('ga-score-eve'),
      ind: document.getElementById('ga-round-ind'),
      history: document.getElementById('ga-history'),
      reveal: document.getElementById('ga-reveal'),
      revealMe: document.getElementById('ga-reveal-me'),
      revealEve: document.getElementById('ga-reveal-eve'),
      revealVs: document.getElementById('ga-reveal-vs'),
      finale: document.getElementById('ga-finale'),
      finaleTitle: document.getElementById('ga-finale-title'),
      finaleRead: document.getElementById('ga-finale-read'),
      finaleQuote: document.getElementById('ga-finale-quote'),
      finaleRetry: document.getElementById('ga-finale-retry'),
    };

    const cardNames = {1:'能量突击', 2:'护盾屏障', 3:'高级战术'};

    let match = null;

    function bumpScore(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

    function pushHistory(html, cls){
      const p = document.createElement('p');
      p.className = cls || '';
      p.innerHTML = html;
      const firstPh = ui.history.querySelector('p[style]');
      if (firstPh) firstPh.remove();
      ui.history.appendChild(p);
      ui.history.parentElement.scrollTop = ui.history.parentElement.scrollHeight;
    }

    function resetIndicators(){
      ui.ind.querySelectorAll('span').forEach((el,i) => {
        el.classList.remove('active','won','lost','draw');
        if (i === 0) el.classList.add('active');
      });
    }

    function markIndicator(idx, kind){
      const el = ui.ind.querySelectorAll('span')[idx];
      if (!el) return;
      el.classList.remove('active','won','lost','draw');
      el.classList.add(kind);
      const next = ui.ind.querySelectorAll('span')[idx+1];
      if (next) next.classList.add('active');
    }

    function newMatch(){
      match = { roundIdx: 0, meHP: 3, eveHP: 3, plays: [], done: false };
      ui.scoreMe.textContent = '3';
      ui.scoreEve.textContent = '3';
      ui.history.innerHTML = '<p style="color:var(--term-dim);">等待第一回合出牌…</p>';
      resetIndicators();
      ui.finale.classList.remove('show','win','lose','draw');
      ui.reveal.classList.remove('show');
      ui.cards.forEach(c => { c.classList.remove('disabled','selected'); });
      ui.phase.textContent = 'STAGE · R1 · PLAY CARD';
      ui.prompt.textContent = '夏娃把三张牌摊在桌面。"选一张——我也会同时出。"';
      ui.eveLabel.textContent = 'EVE · 正在选牌';
      ui.revealMe.className = 'ga__reveal__card';
      ui.revealMe.textContent = '?';
      ui.revealEve.className = 'ga__reveal__card';
      ui.revealEve.textContent = '?';
    }

    // Eve's AI pattern — learns from your history
    function eveChoose(){
      const recent = match.plays.slice(-3).map(p => p.me);
      // prob model: counter most-played
      const counts = {1:0,2:0,3:0};
      recent.forEach(v => counts[v]++);
      const maxC = Math.max(counts[1], counts[2], counts[3]);
      const mostPlayed = maxC === 0 ? null : (+Object.keys(counts).find(k => counts[k] === maxC));

      // Counter table: 1 counters 3; 2 beats 1; 3 beats 2
      const counter = {1:2, 2:3, 3:1};
      let choice;
      if (mostPlayed && Math.random() < 0.65) {
        choice = counter[mostPlayed];
      } else {
        // random with slight bias toward 3 (she likes "high tactic")
        const r = Math.random();
        choice = r < 0.25 ? 1 : r < 0.55 ? 2 : 3;
      }
      // occasional mind-game: mirror player
      if (match.plays.length > 0 && Math.random() < 0.12) {
        choice = match.plays[match.plays.length-1].me;
      }
      return choice;
    }

    function resolve(me, eve){
      // returns {result, reason}
      if (me === eve) return { result: 'draw', reason: '平手——双方各扣 1 血' };
      // 1 counters 3
      if (me === 1 && eve === 3) return { result: 'win', reason: '能量突击反制高级战术' };
      if (eve === 1 && me === 3) return { result: 'lose', reason: '能量突击反制高级战术' };
      // otherwise bigger wins
      return me > eve
        ? { result: 'win', reason: `${cardNames[me]} 压过 ${cardNames[eve]}` }
        : { result: 'lose', reason: `${cardNames[eve]} 压过 ${cardNames[me]}` };
    }

    function playRound(mePick){
      // disable cards during reveal
      ui.cards.forEach(c => c.classList.add('disabled'));
      const evePick = eveChoose();
      match.plays.push({ me: mePick, eve: evePick });

      ui.phase.textContent = `STAGE · R${match.roundIdx+1} · REVEAL`;
      ui.eveLabel.textContent = 'EVE · 翻牌';
      ui.prompt.textContent = '双方翻牌——';

      // Flip anim
      ui.revealMe.className = 'ga__reveal__card';
      ui.revealEve.className = 'ga__reveal__card';
      ui.revealMe.textContent = '?';
      ui.revealEve.textContent = '?';
      ui.reveal.classList.add('show');

      setTimeout(() => {
        ui.revealMe.textContent = mePick;
        ui.revealMe.classList.add('flip');
      }, 300);
      setTimeout(() => {
        ui.revealEve.textContent = evePick;
        ui.revealEve.classList.add('flip');
      }, 650);

      setTimeout(() => {
        const res = resolve(mePick, evePick);
        if (res.result === 'win') {
          match.eveHP = Math.max(0, match.eveHP - 1);
          ui.revealMe.classList.add('win');
          ui.revealEve.classList.add('lose');
          pushHistory(`R${match.roundIdx+1} · 你:${mePick} vs 夏娃:${evePick} · <span class="win">${res.reason}</span>`, 'win');
        } else if (res.result === 'lose') {
          match.meHP = Math.max(0, match.meHP - 1);
          ui.revealMe.classList.add('lose');
          ui.revealEve.classList.add('win');
          pushHistory(`R${match.roundIdx+1} · 你:${mePick} vs 夏娃:${evePick} · <span class="bad">${res.reason}</span>`, 'bad');
        } else {
          match.meHP = Math.max(0, match.meHP - 1);
          match.eveHP = Math.max(0, match.eveHP - 1);
          ui.revealMe.classList.add('draw');
          ui.revealEve.classList.add('draw');
          pushHistory(`R${match.roundIdx+1} · 你:${mePick} vs 夏娃:${evePick} · <span class="neu">${res.reason}</span>`, 'neu');
        }
        bumpScore(ui.scoreMe);
        bumpScore(ui.scoreEve);
        ui.scoreMe.textContent = match.meHP;
        ui.scoreEve.textContent = match.eveHP;
        markIndicator(match.roundIdx, res.result === 'win' ? 'won' : res.result === 'lose' ? 'lost' : 'draw');

        ui.phase.textContent = `STAGE · ${res.result === 'win' ? '你得分' : res.result === 'lose' ? '夏娃得分' : '两败俱伤'}`;
        ui.eveLabel.textContent = res.result === 'win' ? 'EVE · 被压制' : res.result === 'lose' ? 'EVE · 她笑了' : 'EVE · 可预期';

        // check end
        if (match.meHP <= 0 || match.eveHP <= 0 || match.roundIdx >= 4) {
          setTimeout(finishMatch, 1400);
        } else {
          match.roundIdx++;
          setTimeout(() => {
            ui.reveal.classList.remove('show');
            ui.cards.forEach(c => { c.classList.remove('disabled','selected'); });
            ui.phase.textContent = `STAGE · R${match.roundIdx+1} · PLAY CARD`;
            ui.prompt.textContent = '下一手——选一张。';
            ui.eveLabel.textContent = 'EVE · 正在选牌';
          }, 1400);
        }
      }, 1200);
    }

    function finishMatch(){
      match.done = true;
      state.gamesPlayed.ga = true;
      let winner;
      if (match.meHP > match.eveHP) winner = 'me';
      else if (match.meHP < match.eveHP) winner = 'eve';
      else winner = 'draw';
      state.gaWinner = winner;

      // Style read
      const plays = match.plays.map(p => p.me);
      const count = {1:0,2:0,3:0};
      plays.forEach(v => count[v]++);
      let style = 'balanced';
      if (count[1] > count[2] && count[1] > count[3]) style = 'aggressive';
      else if (count[2] > count[1] && count[2] > count[3]) style = 'defensive';
      else if (count[3] > count[1] && count[3] > count[2]) style = 'tactical';
      state.gaStyle = style;

      const titles = {
        me:   'YOU WIN · <em>HP '+match.meHP+' – '+match.eveHP+'</em>',
        eve:  'EVE WINS · <em>HP '+match.meHP+' – '+match.eveHP+'</em>',
        draw: 'MUTUAL DESTRUCTION · <em>'+match.meHP+' – '+match.eveHP+'</em>',
      };
      const reads = {
        'aggressive': 'EVE\u0027S READ · 兽之人 · 直击型',
        'defensive':  'EVE\u0027S READ · 原生人 · 守成型',
        'tactical':   'EVE\u0027S READ · 德兰圣丁 · 算计型',
        'balanced':   'EVE\u0027S READ · AI 机器人 · 均衡型',
      };
      const quotes = {
        me: {
          'aggressive': '"你一直用 1。你不算——你只是赌我会过度算计你。这在你们兽人里少见。"',
          'defensive':  '"你总用 2。防御不是弱——但你赢是因为我猜你一直会防。"',
          'tactical':   '"你总用 3。你赢了——但你赢的不是我，是你对"最优解"的执念。"',
          'balanced':   '"你三张牌用得很平均。这是 AI 的习惯——或者你在模仿一个 AI。"',
        },
        eve: {
          'aggressive': '"你一直用 1——我已经算到第三手。攻击者最容易预测。"',
          'defensive':  '"2、2、2——你在等我犯错。但我从不犯错。"',
          'tactical':   '"你太执着于 3。高级战术只在对手也算得够深时有用。我算得更深。"',
          'balanced':   '"你在打随机——对 AI 来说，没有比随机更好预测的东西。"',
        },
        draw: {
          'aggressive': '"我们互相消耗——这是暴力的代价。"',
          'defensive':  '"都在等对方失误——于是都失误了。"',
          'tactical':   '"两个赛博大脑的对撞。没有赢家。"',
          'balanced':   '"平局——我们可能是相似的生物。一半算法，一半直觉。"',
        },
      };

      ui.finale.classList.remove('win','lose','draw');
      ui.finale.classList.add(winner === 'me' ? 'win' : winner === 'eve' ? 'lose' : 'draw', 'show');
      ui.finaleTitle.innerHTML = titles[winner];
      ui.finaleRead.textContent = reads[style];
      ui.finaleQuote.textContent = quotes[winner][style];

      pushHistory('◉ MATCH END · '+ (winner === 'me' ? '<span class="win">你赢</span>' : winner === 'eve' ? '<span class="bad">夏娃赢</span>' : '<span class="neu">两败</span>'));
      updateEndingsMeter();
    }

    ui.cards.forEach(card => {
      card.addEventListener('click', () => {
        if (!match || match.done) return;
        if (card.classList.contains('disabled')) return;
        ui.cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const v = +card.dataset.v;
        setTimeout(() => playRound(v), 350);
      });
    });

    ui.finaleRetry.addEventListener('click', newMatch);
    newMatch();
  }

  /* ========================================================
   * GAME B · 熄灯者 · Night's Quencher
   * Turn-based: HUMAN (you) → AI (auto) → BEAST (auto) → repeat
   * Each turn: extinguish 1–5 bulbs.
   * Last one to extinguish = win.
   * ======================================================== */
  const gbRoot = document.getElementById('gb');
  if (gbRoot) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.getElementById('gb-svg');
    const bulbsG = document.getElementById('gb-bulbs');
    const remainingEl = document.getElementById('gb-remaining');
    const lineEl = document.getElementById('gb-line');
    const speakerEl = document.getElementById('gb-speaker');
    const speakerTagEl = document.getElementById('gb-speaker-tag');
    const speakerMetaEl = document.getElementById('gb-speaker-meta');
    const blackoutEl = document.getElementById('gb-blackout');
    const resetBtn = document.getElementById('gb-reset');
    const phaseLbl = document.getElementById('gb-phase-lbl');
    const playersEl = document.querySelectorAll('#gb-turnbar .gb__player');
    const pickLblEl = document.getElementById('gb-pick-lbl');
    const pickNEl = document.getElementById('gb-pick-n');
    const confirmBtn = document.getElementById('gb-confirm');
    const turnflashEl = document.getElementById('gb-turnflash');

    const BULB_COUNT = 40;
    const bulbs = [];

    /* ---------- Bulb layout: concentric rings, stratified — no overlap ---------- */
    function seedBulbs(){
      bulbsG.innerHTML = '';
      bulbs.length = 0;

      // Deterministic PRNG so layout stable across resets
      let seed = 41;
      function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed/233280; }

      // Divide 40 bulbs into 3 depth tiers (back/mid/front)
      // Each tier is a row across the horizontal stage; y-ranges don't overlap.
      // Stage area 0..1000 x 0..500 (viewBox)
      const tiers = [
        { n: 14, yBand:[70, 150],  size:[7, 10], ropeMin: 40 },   // back row, smaller, higher
        { n: 14, yBand:[160, 250], size:[9, 13], ropeMin: 110 },  // mid row
        { n: 12, yBand:[260, 360], size:[11, 16], ropeMin: 200 }, // front row, bigger
      ];

      let idx = 0;
      tiers.forEach((tier, tierIdx) => {
        // Distribute bulbs evenly across x with jitter, within tier x-range
        const n = tier.n;
        // Front tier narrower band (stage center-dominant), back tier wider
        const xMin = tierIdx === 0 ? 60 : tierIdx === 1 ? 90 : 140;
        const xMax = 1000 - xMin;
        const step = (xMax - xMin) / n;

        for (let k = 0; k < n; k++) {
          const x = xMin + step * (k + 0.5) + (rnd() - 0.5) * step * 0.55;
          const y = tier.yBand[0] + rnd() * (tier.yBand[1] - tier.yBand[0]);
          const size = tier.size[0] + rnd() * (tier.size[1] - tier.size[0]);
          const anchorX = x + (rnd() - 0.5) * 20;
          const ropeLen = y - 4; // hang from ceiling down to bulb top

          const bulbG = document.createElementNS(SVG_NS, 'g');
          bulbG.setAttribute('class', 'gb__bulb');
          bulbG.setAttribute('data-i', idx);

          const rope = document.createElementNS(SVG_NS, 'line');
          rope.setAttribute('class', 'gb__rope');
          rope.setAttribute('x1', anchorX);
          rope.setAttribute('y1', 2);
          rope.setAttribute('x2', x);
          rope.setAttribute('y2', y - size * 0.9);
          rope.setAttribute('stroke-dasharray', '2 1.5');
          bulbG.appendChild(rope);

          const glow = document.createElementNS(SVG_NS, 'circle');
          glow.setAttribute('class', 'gb__bulb-glow');
          glow.setAttribute('cx', x);
          glow.setAttribute('cy', y);
          glow.setAttribute('r', size * 2.4);
          glow.setAttribute('fill', 'url(#gbBulbGlow)');
          bulbG.appendChild(glow);

          const body = document.createElementNS(SVG_NS, 'circle');
          body.setAttribute('class', 'gb__bulb-body');
          body.setAttribute('cx', x);
          body.setAttribute('cy', y);
          body.setAttribute('r', size);
          body.setAttribute('fill', 'url(#gbBulbGrad)');
          bulbG.appendChild(body);

          const hi = document.createElementNS(SVG_NS, 'circle');
          hi.setAttribute('cx', x - size * 0.25);
          hi.setAttribute('cy', y - size * 0.3);
          hi.setAttribute('r', size * 0.18);
          hi.setAttribute('fill', '#fff');
          hi.setAttribute('opacity', '.85');
          hi.setAttribute('pointer-events', 'none');
          bulbG.appendChild(hi);

          bulbsG.appendChild(bulbG);
          bulbs.push({ node: bulbG, cx: x, cy: y, r: size, rope: rope, dark: false, pending: false, tier: tierIdx });
          idx++;
        }
      });
    }

    /* ---------- Dialogue pool ---------- */
    const lines = {
      openHuman: [
        { who:'sys',  name:'画外音',  meta:'// LAST GAME · 开局',
          text:'Last Game · Night\u0027s Quencher。本轮比赛，三个阵营将各派出熄灯者——你先来。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 独白',
          text:'40 盏灯。每灭一盏——我们都离终点近一步。先让我来吧。' },
      ],
      openAI: [
        { who:'eve',  name:'夏娃',  meta:'// AI · 冷算',
          text:'我没有算这一关的必要——因为无论规则怎么变，最后的问题永远是同一个。' },
        { who:'cyra', name:'塞拉',  meta:'// BEAST · 反击',
          text:'夏娃，你不是很会算吗？你能算到比赛的最后竟然是这种规则吗？' },
      ],
      openBeast: [
        { who:'cyra', name:'塞拉',  meta:'// BEAST · 咆哮',
          text:'任人摆布、电击惩罚、刺激！轮到我——我可不会客气。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 关切',
          text:'塞拉，你别太急。' },
      ],
      john_sister: [
        { who:'john', name:'约翰',  meta:'// HUMAN · 妹妹',
          text:'我的妹妹三岁那年发了一场高烧——烧坏了脑子，再也没醒过来。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 妹妹',
          text:'医生说，芯片植入可能救她——但需要一个生物芯片。这是唯一能救她的办法了。' },
        { who:'eve',  name:'夏娃',  meta:'// AI · 推理',
          text:'为了帮助另一个人不惜一切代价——这样的可能性有多大？' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 回答',
          text:'如果你有最珍视的人——这样的可能性就是 100%。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 独白',
          text:'因为风的尽头就是出路。' },
      ],
      ai_calc: [
        { who:'john', name:'约翰',  meta:'// HUMAN · 讽刺',
          text:'你这个人果然很讨厌，总是撒谎。' },
        { who:'eve',  name:'夏娃',  meta:'// AI · 反问',
          text:'你为什么说他在撒谎？' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 法则',
          text:'我们每个人都有一套自己的行事逻辑和标准。塞拉也一样——"命运要掌握在自己手中"。' },
        { who:'eve',  name:'夏娃',  meta:'// AI · 追问',
          text:'那你呢？你的法则是什么？' },
        { who:'eve',  name:'夏娃',  meta:'// AI · 判断',
          text:'看来你真的很爱你妹妹。' },
      ],
      beast_rage: [
        { who:'cyra', name:'塞拉',  meta:'// BEAST · 嘲讽',
          text:'这 40 盏灯，每一盏都比我活得更久。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 观察',
          text:'啧，他又在撒谎。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 悖论',
          text:'眼泪在悲伤面前最不值钱——因为最悲痛的人，往往笑得最开心。' },
        { who:'cyra', name:'塞拉',  meta:'// BEAST · 迸裂',
          text:'选我。反正我这种东西——本来就不该活到现在。' },
      ],
      midgame: [
        { who:'sys',  name:'画外音',  meta:'// ROUND END',
          text:'本轮灭灯结束。比赛继续——场内还有灯。' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 自嘲',
          text:'（轻声）我也不知道是谁在救谁。' },
        { who:'eve',  name:'夏娃',  meta:'// AI · 察觉',
          text:'有意思——原来你们真的会为了一个"珍视的人"，放弃整盘棋。' },
        { who:'cyra', name:'塞拉',  meta:'// BEAST · 咆哮',
          text:'这不叫放弃！这叫——兽人永不为奴！' },
        { who:'eve',  name:'夏娃',  meta:'// AI · 侧身',
          text:'我全都记下来了。' },
      ],
      endgame: [
        { who:'eve',  name:'夏娃',  meta:'// AI · 平静',
          text:'约翰——如果最后我们只剩一个人，你会选择谁？' },
        { who:'john', name:'约翰',  meta:'// HUMAN · 释然',
          text:'聊聊天死不了人。' },
      ],
      final: {
        human: { who:'sys', name:'画外音', meta:'// FINAL · HUMAN WIN',
          text:'灭灯结束——原生人阵营最后灭灯，获得 5000 积分。约翰点了点头，没说话。' },
        ai:    { who:'sys', name:'画外音', meta:'// FINAL · AI WIN',
          text:'灭灯结束——AI 机器人阵营最后灭灯，获得 5000 积分。夏娃平静地摘下了神经环。' },
        beast: { who:'sys', name:'画外音', meta:'// FINAL · BEAST WIN',
          text:'灭灯结束——兽之人阵营最后灭灯，获得 5000 积分。塞拉第一次笑了——然后哭了。' },
      }
    };

    /* ---------- Typewriter ---------- */
    let typingTimer = null;
    function showLine(entry){
      if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
      speakerEl.className = 'gb__dialogue__speaker ' + entry.who + ' show';
      speakerTagEl.textContent = entry.name;
      speakerMetaEl.textContent = entry.meta || '';
      lineEl.innerHTML = '<span class="cursor">▋</span>';
      let i = 0;
      const txt = entry.text;
      function step(){
        if (i >= txt.length) {
          lineEl.innerHTML = txt + '<span class="cursor">▋</span>';
          return;
        }
        i++;
        lineEl.innerHTML = txt.slice(0, i) + '<span class="cursor">▋</span>';
        const ch = txt[i-1];
        const d = /[。，！？—…]/.test(ch) ? 140 : /\s/.test(ch) ? 30 : 28 + Math.random()*28;
        typingTimer = setTimeout(step, d);
      }
      step();
    }

    function emitSmoke(cx, cy, size){
      for (let k = 0; k < 3; k++) {
        const puff = document.createElementNS(SVG_NS, 'circle');
        puff.setAttribute('class', 'gb__smoke');
        puff.setAttribute('cx', cx + (Math.random()-.5) * size * 0.8);
        puff.setAttribute('cy', cy - size * 0.4);
        puff.setAttribute('r', size * (0.5 + Math.random()*0.4));
        puff.setAttribute('fill', 'rgba(200,200,220,.35)');
        puff.style.animationDelay = (k * 0.1) + 's';
        bulbsG.appendChild(puff);
        setTimeout(() => puff.remove(), 2200);
      }
    }

    /* ---------- Turn / game state ---------- */
    const TURN_ORDER = ['human', 'ai', 'beast']; // human goes first
    const TURN_NAMES = { human:'原生人', ai:'AI 机器人', beast:'兽之人' };
    let turnIdx = 0;           // current player index
    let turnNumber = 1;        // overall turn number
    let roundDialogueIdx = 0;  // which mid dialogue block
    let pendingBulbs = new Set();
    let remaining = BULB_COUNT;
    let gameOver = false;

    function currentPlayer(){ return TURN_ORDER[turnIdx]; }

    function updateTurnUI(){
      playersEl.forEach(el => {
        el.classList.remove('active');
        const who = el.dataset.who;
        el.classList.toggle('done', false);
        if (who === currentPlayer()) el.classList.add('active');
      });
      // flash stage
      turnflashEl.className = 'gb__turnflash ' + currentPlayer();
      const who = currentPlayer();
      phaseLbl.textContent = `STAGE · TURN ${turnNumber} · ${who === 'human' ? '你的回合' : who === 'ai' ? 'AI · 夏娃行动' : '兽人 · 塞拉行动'}`;

      if (who === 'human') {
        pickLblEl.innerHTML = `你回合 · 选 1–5 盏灯（已选 <b id="gb-pick-n">${pendingBulbs.size}</b>）`;
        confirmBtn.disabled = pendingBulbs.size === 0;
        confirmBtn.textContent = '确认灭灯';
        confirmBtn.style.display = '';
      } else {
        pickLblEl.innerHTML = `<b>${TURN_NAMES[who]}</b> 正在选灯…`;
        confirmBtn.disabled = true;
        confirmBtn.style.display = 'none';
      }
    }

    function pickCount(who){
      // AI picks 1-3 (careful), Beast picks 2-5 (aggressive)
      if (who === 'ai')    return 1 + Math.floor(Math.random() * 3);
      if (who === 'beast') return 2 + Math.floor(Math.random() * 4);
      return 0;
    }

    function autoBulbsFor(who, n){
      // Pick n random live bulbs (not pending); AI picks evenly distributed, Beast picks clustered
      const live = bulbs.filter(b => !b.dark && !b.pending);
      n = Math.min(n, live.length);
      if (n <= 0) return [];
      if (who === 'beast') {
        // cluster: pick first then neighbors by distance
        const first = live[Math.floor(Math.random() * live.length)];
        const sorted = live.slice().sort((a,b) => {
          const da = Math.hypot(a.cx-first.cx, a.cy-first.cy);
          const db = Math.hypot(b.cx-first.cx, b.cy-first.cy);
          return da - db;
        });
        return sorted.slice(0, n);
      }
      if (who === 'ai') {
        // evenly spread: shuffle and pick
        const shuffled = live.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
      }
      return [];
    }

    function extinguish(bulb){
      if (!bulb || bulb.dark) return;
      bulb.dark = true;
      bulb.pending = false;
      bulb.node.classList.remove('pending');
      bulb.node.classList.add('dark');
      bulb.rope.classList.add('dark');
      emitSmoke(bulb.cx, bulb.cy, bulb.r);
      remaining--;
      remainingEl.textContent = remaining;
    }

    function pickDialogueForTurn(who, turnNum, afterExtinguish){
      // Every turn: pick 1 dialogue from a pool based on turn number
      // First turn: opening line from that player's pool
      if (turnNum === 1) {
        if (who === 'human') return lines.openHuman[0];
        if (who === 'ai')    return lines.openAI[0];
        if (who === 'beast') return lines.openBeast[0];
      }
      // Late game: endgame pool
      if (remaining <= 8) {
        return lines.endgame[(turnNum) % lines.endgame.length];
      }
      // Mid game: themed by player
      const pool = who === 'human' ? lines.john_sister
                 : who === 'ai'    ? lines.ai_calc
                 : lines.beast_rage;
      return pool[(turnNum) % pool.length];
    }

    function endTurn(){
      if (remaining <= 0) {
        finishGame();
        return;
      }
      // advance player
      turnIdx = (turnIdx + 1) % TURN_ORDER.length;
      if (turnIdx === 0) turnNumber++;
      updateTurnUI();
      if (currentPlayer() !== 'human') {
        setTimeout(autoTurn, 1100);
      }
    }

    function finishGame(){
      gameOver = true;
      const winnerSide = TURN_ORDER[(turnIdx) % TURN_ORDER.length]; // the one who just extinguished last
      state.gbDone = true;
      state.gbWinner = winnerSide;
      state.gamesPlayed.gb = true;

      showLine(lines.final[winnerSide]);
      phaseLbl.textContent = `STAGE · 收光 · ${TURN_NAMES[winnerSide]} 胜`;
      playersEl.forEach(el => {
        el.classList.remove('active');
        el.classList.toggle('done', el.dataset.who !== winnerSide);
      });
      pickLblEl.innerHTML = `<b style="color:var(--term-green);">${TURN_NAMES[winnerSide]}</b> 获得 5000 积分`;
      confirmBtn.disabled = true;
      confirmBtn.style.display = 'none';

      setTimeout(() => { blackoutEl.classList.add('show'); }, 1800);
      updateEndingsMeter();
    }

    function humanPlay(){
      if (gameOver) return;
      if (currentPlayer() !== 'human') return;
      if (pendingBulbs.size === 0) return;
      const toDouse = Array.from(pendingBulbs);
      pendingBulbs.clear();
      // Extinguish with slight stagger for feel
      toDouse.forEach((b, i) => setTimeout(() => extinguish(b), i * 120));

      // Dialogue right after
      setTimeout(() => {
        const entry = pickDialogueForTurn('human', turnNumber);
        if (entry) showLine(entry);
        if (remaining <= 0) {
          // human extinguished last
          turnIdx = 0; // human just moved, so "winner" is index 0
          finishGame();
        } else {
          setTimeout(endTurn, 1400);
        }
      }, toDouse.length * 120 + 300);
    }

    function autoTurn(){
      if (gameOver) return;
      const who = currentPlayer();
      const n = Math.min(pickCount(who), remaining);
      const targets = autoBulbsFor(who, n);
      if (!targets.length) { finishGame(); return; }

      // flash intent
      pickLblEl.innerHTML = `<b>${TURN_NAMES[who]}</b> 选择灭 ${targets.length} 盏灯…`;

      // Pending animation first
      targets.forEach((b, i) => setTimeout(() => {
        b.pending = true;
        b.node.classList.add('pending');
      }, i * 150));

      // Then extinguish
      const startAfter = targets.length * 150 + 500;
      targets.forEach((b, i) => setTimeout(() => extinguish(b), startAfter + i * 140));

      setTimeout(() => {
        const entry = pickDialogueForTurn(who, turnNumber);
        if (entry) showLine(entry);
        if (remaining <= 0) {
          // the current player extinguished last
          finishGame();
        } else {
          setTimeout(endTurn, 1600);
        }
      }, startAfter + targets.length * 140 + 300);
    }

    /* ---------- Bulb click (human turn only) ---------- */
    bulbsG.addEventListener('click', (e) => {
      if (gameOver) return;
      if (currentPlayer() !== 'human') return;
      const node = e.target.closest('.gb__bulb');
      if (!node) return;
      const i = +node.dataset.i;
      const bulb = bulbs[i];
      if (!bulb || bulb.dark) return;

      if (bulb.pending) {
        // unselect
        bulb.pending = false;
        node.classList.remove('pending');
        pendingBulbs.delete(bulb);
      } else {
        if (pendingBulbs.size >= 5) return;
        bulb.pending = true;
        node.classList.add('pending');
        pendingBulbs.add(bulb);
      }
      // update counter
      const nEl = document.getElementById('gb-pick-n');
      if (nEl) nEl.textContent = pendingBulbs.size;
      confirmBtn.disabled = pendingBulbs.size === 0;
    });

    confirmBtn.addEventListener('click', humanPlay);

    resetBtn.addEventListener('click', () => {
      gameOver = false;
      remaining = BULB_COUNT;
      turnIdx = 0;
      turnNumber = 1;
      roundDialogueIdx = 0;
      pendingBulbs.clear();
      state.gbDone = false;
      state.gbWinner = null;
      state.gamesPlayed.gb = false;
      remainingEl.textContent = BULB_COUNT;
      blackoutEl.classList.remove('show');
      seedBulbs();
      playersEl.forEach(el => el.classList.remove('done'));
      speakerEl.classList.remove('show');
      lineEl.innerHTML = '你的回合——点击亮灯选择 1–5 盏，再按<b>确认灭灯</b>。<span class="cursor">▋</span>';
      updateTurnUI();
      updateEndingsMeter();
    });

    // Init
    seedBulbs();
    updateTurnUI();
  }

  /* ========================================================
   * ENDINGS METER
   * ======================================================== */
  const endings = [
    { id: 'E.01', name: '夏娃觉醒', desc: '夏娃摆脱麦克斯维尔控制，牺牲自己——机器人真正觉醒。' },
    { id: 'E.02', name: '约翰取代', desc: '约翰利用夏娃取代麦克斯维尔，成为新的德兰圣丁领军。' },
    { id: 'E.03', name: '塞拉解放', desc: '塞拉带众人解放——但兴奋之后依旧是迷茫。' },
    { id: 'E.04', name: '真正的结局', desc: '四人都是德兰圣丁，20 位玩家只是替身——你们是玩物。' },
  ];
  const endingsListEl = document.getElementById('endingsList');
  if (endingsListEl) {
    endings.forEach(e => {
      const row = document.createElement('div');
      row.className = 'sv-ending'; row.dataset.eid = e.id;
      row.innerHTML = `
        <div class="sv-ending__id">${e.id}</div>
        <div class="sv-ending__name">${e.name}<small>${e.desc}</small></div>
        <div class="sv-ending__pct" data-p>25%</div>
        <div class="sv-ending__bar" style="--p:25%"></div>
      `;
      endingsListEl.appendChild(row);
    });
  }

  function computeEndings(){
    let w = [1,1,1,1];
    if (state.faction === 'ai')     w[0] += 1.8;
    if (state.faction === 'human')  w[1] += 1.8;
    if (state.faction === 'beast')  w[2] += 1.8;
    if (state.faction === 'dranla') w[3] += 2.5;

    if (state.gamesPlayed.ga) {
      if (state.gaWinner === 'me')   w[1] += 1.0;
      if (state.gaWinner === 'eve')  w[0] += 1.2;
      if (state.gaStyle === 'aggressive') w[2] += 0.8;
      if (state.gaStyle === 'defensive')  w[1] += 0.6;
      if (state.gaStyle === 'tactical')   w[3] += 1.0;
      if (state.gaStyle === 'balanced')   w[0] += 0.6;
    }
    if (state.gamesPlayed.gb) {
      if (state.gbWinner === 'human') w[1] += 1.2;
      if (state.gbWinner === 'ai')    w[0] += 1.2;
      if (state.gbWinner === 'beast') w[2] += 1.2;
    }
    const sum = w.reduce((a,b)=>a+b,0);
    return w.map(x => Math.round(x/sum*100));
  }

  function updateEndingsMeter(){
    const pcts = computeEndings();
    const diff = 100 - pcts.reduce((a,b)=>a+b,0);
    pcts[0] += diff;
    let maxIdx = 0; pcts.forEach((p,i) => { if (p > pcts[maxIdx]) maxIdx = i; });
    document.querySelectorAll('.sv-ending').forEach((row, i) => {
      row.querySelector('[data-p]').textContent = pcts[i] + '%';
      row.querySelector('.sv-ending__bar').style.setProperty('--p', pcts[i]+'%');
      row.classList.toggle('hot', i === maxIdx);
    });
    const f = document.getElementById('curFaction');
    if (f) {
      const names = {human:'原生人', ai:'AI', beast:'兽之人', dranla:'德兰圣丁'};
      f.textContent = state.faction ? names[state.faction] : '未选';
      f.style.color = state.faction ? 'var(--term-green)' : 'var(--term-warn)';
    }
    const gp = document.getElementById('gamesPlayed');
    if (gp) gp.textContent = Object.values(state.gamesPlayed).filter(Boolean).length;
    const te = document.getElementById('topEnding');
    if (te) { te.textContent = endings[maxIdx].name; te.style.color = 'var(--term-green)'; }
  }

  window.__updateEndingsMeter = updateEndingsMeter;
  updateEndingsMeter();

})();
