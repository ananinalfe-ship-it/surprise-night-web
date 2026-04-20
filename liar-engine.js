/*! liar-engine.js — 4-act interactive engine for 《终极骗局 3.0》 */
(function(){
  'use strict';

  /* ==========================================================
   * GLOBAL STATE
   * ========================================================== */
  const state = {
    role: null,            // 'liar'|'cop'|'witness'|'bystander'
    chips: 0,              // accumulated chips (万)
    cluesUnlocked: 0,      // 0..3
    culpritGuess: null,    // suspect id
    culpritCorrect: false,
    moralVote: null,       // 'revenge'|'justice'
    actsDone: { 1:false, 2:false, 3:false, 4:false },
  };

  /* ==========================================================
   * ROLE CARD integration (update HUD when cards get flipped)
   * ========================================================== */
  const HUD = {
    role: document.getElementById('hudRole'),
    chips: document.getElementById('hudChips'),
    clues: document.getElementById('hudClues'),
    moral: document.getElementById('hudMoral'),
  };
  const ROLE_LABEL = {
    liar: '骗子', cop: '警探', witness: '证人', bystander: '旁观者'
  };
  const ROLE_EN = {
    liar: 'Liar', cop: 'Cop', witness: 'Witness', bystander: 'Bystander'
  };

  function updateHUD(){
    if (HUD.role) {
      if (state.role) HUD.role.innerHTML = ROLE_LABEL[state.role] + '<small>' + ROLE_EN[state.role] + '</small>';
      else HUD.role.innerHTML = '—<small>先从上方抽牌</small>';
    }
    if (HUD.chips) HUD.chips.innerHTML = state.chips + '<small>万</small>';
    // Clues counter now tracks completed acts (1, 2, 3). Completing any of
    // those ticks the counter, so finishing the mystery (Act 2) always
    // advances progress toward unlocking Act 4 in the player's mental model.
    if (HUD.clues) {
      const done = [1,2,3].filter(n => state.actsDone[n]).length;
      HUD.clues.innerHTML = done + '<small>/3</small>';
    }
    if (HUD.moral) {
      if (state.moralVote === 'revenge') HUD.moral.innerHTML = '复仇<small>Revenge</small>';
      else if (state.moralVote === 'justice') HUD.moral.innerHTML = '正义<small>Justice</small>';
      else HUD.moral.innerHTML = '—<small>未选</small>';
    }
  }

  // Hook into role card clicks
  document.querySelectorAll('.card[data-role]').forEach(c => {
    c.addEventListener('click', () => {
      const r = c.dataset.role;
      setTimeout(() => {
        if (c.classList.contains('is-selected')) {
          state.role = r;
          updateHUD();
        }
      }, 900);
    });
  });

  /* ==========================================================
   * ACT TABS · navigation
   * ========================================================== */
  const tabs = document.querySelectorAll('.lg-acts__tab');
  const stages = { 1: document.getElementById('stage1'), 2: document.getElementById('stage2'),
                   3: document.getElementById('stage3'), 4: document.getElementById('stage4') };

  function goAct(n){
    if (tabs[n-1].classList.contains('is-locked')) return;
    tabs.forEach(t => t.classList.remove('is-active'));
    tabs[n-1].classList.add('is-active');
    Object.entries(stages).forEach(([k, s]) => s.style.display = (+k === n ? '' : 'none'));
  }
  function unlockAct(n){
    tabs[n-1].classList.remove('is-locked');
    console.log('[liar-engine] unlockAct', n, '→ tab lock removed');
  }
  function markDone(n){
    tabs[n-1].classList.add('is-done');
    state.actsDone[n] = true;
    console.log('[liar-engine] markDone', n, state.actsDone);
    // Safety net: if any act completes, unlock ALL subsequent acts so the user
    // never gets stuck. (Sequential unlocking was too strict in practice.)
    for (let i = n+1; i <= 4; i++) unlockAct(i);
    updateHUD();
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => goAct(i+1)));

  /* ==========================================================
   * ACT I · 欺诈行动
   * ========================================================== */
  const LIARS = [
    { n:'达尼尔', en:'Daniel',  i:'达', bias: 0.32, greed: 0.55 },
    { n:'鲍斯',   en:'Boss',    i:'鲍', bias: 0.18, greed: 0.40 },
    { n:'凡妮',   en:'Fannie',  i:'凡', bias: 0.22, greed: 0.50 },
    { n:'洛特',   en:'Lott',    i:'洛', bias: 0.28, greed: 0.58 },
    { n:'里昂',   en:'Leon',    i:'里', bias: 0.35, greed: 0.65 },
    { n:'芙罗拉', en:'Flora',   i:'芙', bias: 0.25, greed: 0.52 },
    { n:'诺拉',   en:'Nora',    i:'诺', bias: 0.14, greed: 0.38 },
  ];
  const POOL_SEQ   = [100, 200, 500];
  const BOUNTY_SEQ = [10, 20, 50];

  const fraudUI = {
    pool: document.getElementById('fraudPool'),
    liars: document.getElementById('fraudLiars'),
    hand: document.getElementById('fraudHand'),
    play: document.getElementById('fraudPlay'),
    reset: document.getElementById('fraudReset'),
    round: document.getElementById('fraudRound'),
    log: document.getElementById('fraudLog'),
  };

  let fraud = null;

  function renderLiars(){
    fraudUI.liars.innerHTML = '';
    LIARS.forEach((l, idx) => {
      const el = document.createElement('div');
      el.className = 'fraud__liar';
      el.dataset.idx = idx;
      el.innerHTML = `
        <div class="fraud__liar-avatar">${l.i}</div>
        <div class="fraud__liar-name">${l.n}</div>
        <div class="fraud__liar-en">${l.en}</div>
        <div class="fraud__liar-card" data-card>—</div>
      `;
      fraudUI.liars.appendChild(el);
    });
  }

  function flog(html, cls){
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.innerHTML = html;
    const first = fraudUI.log.querySelector('.sys');
    if (first && fraudUI.log.children.length === 1) first.remove();
    fraudUI.log.appendChild(p);
    fraudUI.log.scrollTop = fraudUI.log.scrollHeight;
  }

  function setFraudRound(idx){
    fraudUI.round.querySelectorAll('span').forEach((s, i) => {
      s.classList.remove('active','done','busted');
      if (i < idx) s.classList.add('done');
      if (i === idx) s.classList.add('active');
    });
  }

  function bumpPool(){
    fraudUI.pool.classList.remove('bump');
    void fraudUI.pool.offsetWidth;
    fraudUI.pool.classList.add('bump');
  }

  function newFraudMatch(){
    fraud = {
      round: 0,
      matchAttempts: 0,             // total round-attempts this match (cap to force termination)
      activeLiars: LIARS.map((_, i) => i),
      bounties: LIARS.map(() => 0),   // accumulated bounty per liar
      playerBounty: 0,
      playerPick: null,
      playerActive: true,
      deck: makeDeck(),     // 20 cards, 14+ / 6-
      done: false,
    };
    state.chips = 0;
    updateHUD();
    fraudUI.pool.innerHTML = POOL_SEQ[0] + '万<small>诈骗资金</small>';
    setFraudRound(0);
    fraudUI.log.innerHTML = '<p class="sys">执行官：好了各位，这是你们的第一回合任务悬赏金 10万，和本回合诈骗资金 100万。请出牌。</p>';
    fraudUI.play.disabled = true;
    document.querySelectorAll('.fraud__card').forEach(c => { c.classList.remove('selected','disabled'); });
    document.querySelectorAll('.fraud__liar').forEach(el => {
      el.classList.remove('out','played');
      const cc = el.querySelector('[data-card]');
      if (cc) { cc.className = 'fraud__liar-card'; cc.textContent = '—'; }
    });
  }

  function makeDeck(){
    const arr = [];
    for (let i = 0; i < 14; i++) arr.push('+');
    for (let i = 0; i < 6; i++) arr.push('-');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function liarPick(liar, roundIdx, activeCount){
    // Bias = probability of striking; scales with greed × pool size
    const poolWeight = (POOL_SEQ[roundIdx] / 100) * 0.12;
    const crowdBonus = activeCount <= 3 ? -0.10 : 0;  // fewer people → more cautious (rule 6)
    const p = Math.min(0.75, liar.bias + liar.greed * poolWeight + crowdBonus);
    return Math.random() < p ? '-' : '+';
  }

  function resolveRound(){
    fraudUI.play.disabled = true;
    document.querySelectorAll('.fraud__card').forEach(c => c.classList.add('disabled'));

    const roundIdx = fraud.round;
    fraud.matchAttempts = (fraud.matchAttempts || 0) + 1;
    const active = fraud.activeLiars.slice();
    const picks = {};
    active.forEach(i => { picks[i] = liarPick(LIARS[i], roundIdx, active.length + 1); });
    const playerPick = fraud.playerPick;

    // Reveal animations
    active.forEach((i, k) => {
      setTimeout(() => {
        const el = fraudUI.liars.querySelector(`[data-idx="${i}"] [data-card]`);
        if (el) {
          el.classList.remove('wait','strike');
          el.classList.add(picks[i] === '+' ? 'wait' : 'strike');
          el.textContent = picks[i] === '+' ? '+ 等待' : '− 骗术';
        }
      }, k * 120 + 300);
    });

    setTimeout(() => {
      // Count strikes
      const strikesLiars = active.filter(i => picks[i] === '-');
      const playerStrikes = playerPick === '-' ? 1 : 0;
      const totalStrikes = strikesLiars.length + playerStrikes;
      const allActive = active.length + (fraud.playerActive ? 1 : 0);

      // Add bounties this round (everyone who's active gets them, before resolution)
      const bounty = BOUNTY_SEQ[roundIdx];
      active.forEach(i => { fraud.bounties[i] += bounty; });
      if (fraud.playerActive) fraud.playerBounty += bounty;

      // Under-6-person rule: if active ≤ 5, strikes >= 2 = bust
      const strictMode = allActive < 6;
      const isBustByCount = strictMode ? totalStrikes >= 2 : totalStrikes > 2;

      if (totalStrikes === 0) {
        // All wait — executive draws next card
        const drawn = fraud.deck.pop();
        if (drawn === '-') {
          flog('◉ R' + (roundIdx+1) + ' · 全员等待时机；执行官翻牌 <b class="bad">实施骗术</b> — <b class="bad">计划败露！</b>', 'bad');
          flog('执行官：很遗憾，本次计划败露，请归还手中悬赏金。', 'sys');
          fraud.round = 0;
          fraud.bounties = LIARS.map(() => 0);
          fraud.playerBounty = 0;
          setFraudRound(0);
          fraudUI.pool.innerHTML = POOL_SEQ[0] + '万<small>重置</small>';
          setTimeout(() => { afterBust(); }, 800);
          return;
        } else {
          flog('◉ R' + (roundIdx+1) + ' · 全员等待时机；执行官翻牌 + — 进入下一回合', 'sys');
          fraud.round++;
          const nextPool = POOL_SEQ[fraud.round];
          fraudUI.pool.innerHTML = nextPool + '万<small>诈骗资金</small>';
          bumpPool();
          setFraudRound(fraud.round);
          setTimeout(nextTurn, 900);
          return;
        }
      }

      if (isBustByCount) {
        flog(`◉ R${roundIdx+1} · ${totalStrikes} 人同时实施骗术 — <b class="bad">计划败露！</b>`, 'bad');
        // Only strikers get their bounty wiped — waiting players keep theirs.
        const playerStruck = playerStrikes === 1;
        if (strikesLiars.length > 0) {
          flog(`执行官：${strikesLiars.map(i => LIARS[i].n).join('、')} 的悬赏金清零，出局。`, 'sys');
        }
        strikesLiars.forEach(i => {
          fraud.bounties[i] = 0;
          const el = fraudUI.liars.querySelector(`[data-idx="${i}"]`);
          if (el) el.classList.add('out');
        });
        fraud.activeLiars = fraud.activeLiars.filter(i => !strikesLiars.includes(i));
        if (playerStruck) {
          flog(`执行官：你也被卷入——你的悬赏金清零，出局。`, 'bad');
          fraud.playerBounty = 0;
          fraud.playerActive = false;
        } else {
          flog(`◉ 你选择了等待——悬赏金保留 <b class="gold">${fraud.playerBounty}万</b>，筹码不动。`, 'sys');
        }
        fraud.done = true;
        fraudUI.round.querySelectorAll('span')[roundIdx].classList.add('busted');
        // On final settlement, give waiting player their accumulated bounty as chips
        if (!playerStruck && fraud.playerBounty > 0) {
          state.chips += fraud.playerBounty;
          flog(`◉ <b class="gold">你守住了——带着 ${fraud.playerBounty}万 离场。</b>`, 'gold');
          fraud.playerBounty = 0;
          updateHUD();
        }
        setTimeout(endFraudMatch, 1400);
        return;
      }

      // 1-2 strikers split the pool
      const pool = POOL_SEQ[roundIdx] + (roundIdx > 0 ? POOL_SEQ.slice(0, roundIdx).reduce((a,b)=>a+b,0) : 0);
      // Actually — according to the script the pool ACCUMULATES: 100, then +200, then +300...
      // Use that:
      let cumPool = 0;
      for (let k = 0; k <= roundIdx; k++) cumPool += POOL_SEQ[k];

      const playerStriking = playerStrikes === 1;
      const strikers = strikesLiars.slice();
      const totalStrikers = strikers.length + (playerStriking ? 1 : 0);
      const share = Math.floor(cumPool / totalStrikers);

      if (playerStriking) {
        state.chips += share + fraud.playerBounty;
        flog(`◉ R${roundIdx+1} · <b class="gold">你 实施骗术</b>，与 ${strikers.length} 位骗术师平分公池 ${cumPool}万 → 各得 <b class="gold">${share}万</b> + 悬赏金 ${fraud.playerBounty}万`, 'gold');
        flog(`◉ <b class="gold">你拿着钱走了。</b>本局到此为止——下一幕已解锁。`, 'gold');
        fraud.playerActive = false;
        fraud.playerBounty = 0;
        fraud.done = true;
        setTimeout(endFraudMatch, 1400);
        return;
      } else {
        flog(`◉ R${roundIdx+1} · ${strikers.map(i => LIARS[i].n).join('、')} 实施骗术 — <b>卷款潜逃</b>，带走 ${share}万`, 'bad');
      }
      // Remove strikers from active
      strikers.forEach(i => {
        fraud.bounties[i] = 0;
        fraudUI.liars.querySelector(`[data-idx="${i}"]`).classList.add('out');
      });
      fraud.activeLiars = fraud.activeLiars.filter(i => !strikers.includes(i));

      updateHUD();

      // Check if player already struck or all liars out
      if (!fraud.playerActive && fraud.activeLiars.length === 0) {
        flog('◉ 桌上已无人继续——本局结束。', 'sys');
        fraud.done = true;
        setTimeout(endFraudMatch, 1200);
        return;
      }

      // Continue — exec turns next card
      if (fraud.round >= POOL_SEQ.length - 1 || fraud.activeLiars.length === 0) {
        flog('◉ 已到最终回合，本局结束。', 'sys');
        fraud.done = true;
        setTimeout(endFraudMatch, 1200);
        return;
      }

      fraud.round++;
      fraudUI.pool.innerHTML = POOL_SEQ[fraud.round] + '万<small>下回合资金</small>';
      bumpPool();
      setFraudRound(fraud.round);
      setTimeout(nextTurn, 900);

    }, active.length * 120 + 900);
  }

  function afterBust(){
    // Hard cap to guarantee match termination even if repeated "all-wait" busts occur
    if (fraud.matchAttempts >= 6) {
      flog('◉ 本局结束（已超过最多重试次数）。', 'sys');
      endFraudMatch();
      return;
    }
    // Continue next round if not done
    if (fraud.round >= POOL_SEQ.length) {
      endFraudMatch();
      return;
    }
    fraudUI.pool.innerHTML = POOL_SEQ[fraud.round] + '万<small>诈骗资金</small>';
    setFraudRound(fraud.round);
    nextTurn();
  }

  function nextTurn(){
    if (fraud.done) return;
    if (!fraud.playerActive) {
      // Auto-continue — liars only
      setTimeout(resolveRound, 800);
      return;
    }
    fraudUI.play.disabled = true;
    document.querySelectorAll('.fraud__card').forEach(c => { c.classList.remove('selected','disabled'); });
    fraud.playerPick = null;
    flog(`执行官：本回合悬赏金 ${BOUNTY_SEQ[fraud.round]}万，公池 ${POOL_SEQ[fraud.round]}万。请出牌。`, 'sys');
  }

  function endFraudMatch(){
    markDone(1);
    unlockAct(2);
    flog(`◉ 结算 · 你最终持有筹码 <b class="gold">${state.chips}万</b>`, 'gold');
    flog('执行官：本组比赛结束，你可以进入下一幕 — 名画悬案推理。', 'sys');
    fraudUI.play.disabled = true;
    document.querySelectorAll('.fraud__card').forEach(c => c.classList.add('disabled'));
    // Precompute clue access
    if (state.chips >= 150) state.cluesUnlocked = 3;
    else if (state.chips >= 60) state.cluesUnlocked = 2;
    else if (state.chips >= 10) state.cluesUnlocked = 1;
    else state.cluesUnlocked = 0;
    updateHUD();
  }

  // Wire cards
  document.querySelectorAll('.fraud__card').forEach(c => {
    c.addEventListener('click', () => {
      if (c.classList.contains('disabled')) return;
      if (!fraud || fraud.done || !fraud.playerActive) return;
      document.querySelectorAll('.fraud__card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      fraud.playerPick = c.dataset.card;
      fraudUI.play.disabled = false;
    });
  });
  fraudUI.play.addEventListener('click', () => {
    if (!fraud || !fraud.playerPick) return;
    resolveRound();
  });
  fraudUI.reset.addEventListener('click', newFraudMatch);

  renderLiars();
  newFraudMatch();

  /* ==========================================================
   * ACT II · 名画悬案
   * ========================================================== */
  const SUSPECTS = [
    { id:'leon',    n:'里昂',   en:'Leon',    i:'里', tag:'35 · 地下拳手',
      alibi:'"我？我只会用拳头说话。博物馆配电室那种精细活儿，我连线都分不清红蓝。要真凶手是我，那晚爆炸现场站着的就不是替身，是半条街的尸体。"' },
    { id:'nora',    n:'诺拉',   en:'Nora',    i:'诺', tag:'26 · 财阀千金 / 黑客',
      alibi:'"我那天在远程黑进博物馆监控——时间码你们可以去查。我负责让镜头睡着，不负责让人死。至于是谁动了手，那是他们的事，不是我的键盘。"' },
    { id:'lott',    n:'洛特',   en:'Lott',    i:'洛', tag:'48 · 前 CIA 爆破专家',
      alibi:'"是，炸药是我布的。可按我的量，最多震碎几盏灯。后来我走的时候——配电室里多了 0.1 克 TNT，不是我的手笔。谁加的，问谁去。"' },
    { id:'flora',   n:'芙罗拉', en:'Flora',   i:'芙', tag:'33 · 前毒贩',
      alibi:'"我早就收山了，行动那晚我在车里望风。我给你们留下一包薄荷糖，这是全部。指认我，就是冤枉一个再也不想赚脏钱的女人。"' },
    { id:'daniel',  n:'达尼尔', en:'Daniel',  i:'达', tag:'29 · 街头画家 / 临摹大师',
      alibi:'"我只是个画画的。博物馆里那幅《罂粟花》，我站了十七分钟——不是为了偷，是为了看。我画不出杀人的颜色。你们要找真凶，应该去听那天黑市的电话记录。"' },
    { id:'fannie',  n:'凡妮',   en:'Fannie',  i:'凡', tag:'? · 催眠师 / 剑桥心理',
      alibi:'"我的职业让我能让人说出真相，而不是掩盖真相。你们每一个人坐在我面前，我都能知道你在想什么——我还用得着爆炸吗？"' },
    { id:'boss',    n:'鲍斯',   en:'Boss',    i:'鲍', tag:'? · 欺诈师 · 组织者',
      alibi:'"我是组织者——所以我才是最该活着的人。爆炸那天，尸体穿着我的西装，戴着我的表。有人想让你们以为我死了。活下来的人，才有资格被怀疑。"' },
  ];

  const CLUES = [
    { tier: 1, title: 'CLUE 01', body: '爆炸现场的尸体——身份并不是表面看上去的那样。有人早就知道爆炸会发生。'},
    { tier: 2, title: 'CLUE 02', body: '七人之中，有一位天赋异禀的临摹者——他的童年悲剧，与梵高重合得令人不安。'},
    { tier: 3, title: 'CLUE 03', body: '行动前夜，组织者无意听到一通电话——有人准备把某样东西"卖两次"。<br/><em style="color:var(--text-3);">更多的线索，留在剧场里。</em>'},
  ];

  const suspectsEl = document.getElementById('suspects');
  const cluesEl = document.getElementById('clues');
  const mysteryGoBtn = document.getElementById('mysteryGo');
  const mysterySkipBtn = document.getElementById('mysterySkip');
  const mysterySubmitEl = document.getElementById('mysterySubmit');

  function renderSuspects(){
    suspectsEl.innerHTML = '';
    SUSPECTS.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'suspect';
      el.dataset.id = s.id;
      el.innerHTML = `
        <div class="suspect__n">0${i+1} · ${s.en}</div>
        <div class="suspect__portrait">${s.i}</div>
        <div class="suspect__name">${s.n}</div>
        <div class="suspect__name-en">${s.en}</div>
        <div class="suspect__tag">${s.tag}</div>
      `;
      el.addEventListener('click', () => {
        if (state.actsDone[2]) return;
        suspectsEl.querySelectorAll('.suspect').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        state.culpritGuess = s.id;
        mysteryGoBtn.disabled = false;
      });
      suspectsEl.appendChild(el);
    });
  }

  function renderClues(){
    cluesEl.innerHTML = '';
    CLUES.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'clue';
      if (i + 1 > state.cluesUnlocked) el.classList.add('locked');
      el.innerHTML = `
        <div class="clue__head"><b>${c.title}</b> <span>TIER ${c.tier}</span></div>
        <div class="clue__body">${c.body}</div>
      `;
      cluesEl.appendChild(el);
    });
  }

  function submitMystery(){
    const guess = SUSPECTS.find(s => s.id === state.culpritGuess);
    // No truth is revealed on this site. We record the player's pick so Act IV
    // can branch — but we never expose who the "real" culprit is.
    state.culpritCorrect = false; // never rewarded / revealed on the web
    mysterySubmitEl.classList.add('done');
    mysterySubmitEl.innerHTML = `
      <div class="mystery__verdict">◉ 你指认了 · <b>${guess ? guess.n : '—'}</b></div>
      <div class="mystery__defense">
        <div class="mystery__defense-hd">${guess ? guess.n : '—'} · 辩解 <span>Defense</span></div>
        <div class="mystery__defense-body">${guess ? guess.alibi : ''}</div>
      </div>
      <div class="mystery__read">
        ——每一位嫌疑人都有自己的说法。<br/>
        <b>真相只在剧场中揭晓。</b>网站不会告诉你谁才是真凶——<br/>
        要知道答案，请来现场。
      </div>`;
    markDone(2);
    unlockAct(3);
    updateHUD();
  }

  mysteryGoBtn.addEventListener('click', () => {
    if (!state.culpritGuess) return;
    submitMystery();
  });
  mysterySkipBtn.addEventListener('click', () => {
    state.culpritGuess = null;
    state.culpritCorrect = false;
    mysterySubmitEl.classList.add('done');
    mysterySubmitEl.innerHTML = `
      <div class="mystery__verdict">◉ 已跳过指认</div>
      <div class="mystery__read">
        你选择不指认。<br/>
        <b>真相只在剧场中揭晓。</b>要知道答案，请来现场。
      </div>`;
    markDone(2);
    unlockAct(3);
    updateHUD();
  });

  renderSuspects();
  renderClues();
  // Re-render clues when unlock state might change — do it on act open
  tabs[1].addEventListener('click', () => {
    if (!tabs[1].classList.contains('is-locked')) renderClues();
  });

  /* ==========================================================
   * ACT III · 以暴制暴 / 诉诸正义
   * ========================================================== */
  const voteBtns = document.querySelectorAll('.vote__btn');
  const voteResult = document.getElementById('voteResult');

  voteBtns.forEach(b => {
    b.addEventListener('click', () => {
      if (state.moralVote) return;
      const v = b.dataset.v;
      state.moralVote = v;
      // fake live poll numbers (weighted toward revenge per script)
      const revenge = v === 'revenge' ? 61 + Math.floor(Math.random()*8) : 54 + Math.floor(Math.random()*8);
      const justice = 100 - revenge;
      const bR = document.querySelector('.vote__btn.revenge');
      const bJ = document.querySelector('.vote__btn.justice');
      bR.style.setProperty('--p', revenge + '%');
      bJ.style.setProperty('--p', justice + '%');
      bR.querySelector('[data-pct]').textContent = revenge + '% · 历史观众';
      bJ.querySelector('[data-pct]').textContent = justice + '% · 历史观众';
      bR.classList.toggle('picked', v === 'revenge');
      bJ.classList.toggle('picked', v === 'justice');
      voteBtns.forEach(x => x.disabled = true);

      if (v === 'revenge') {
        voteResult.classList.add('show');
        voteResult.innerHTML = `
          <b style="color:var(--accent); font-family: var(--display); letter-spacing:.08em;">画外音：</b>
          我很高兴看到你选择执行复仇。"正义虽然会迟到，但从来都不会缺席"——
          这简直就是放屁！迟到的正义就不可能再成为正义。<br/><br/>
          如果没有是非，就不要自诩善良；如果不敢说真话，就不要标榜正义。活着可以卑微，但不要卑鄙。
          <br/><br/>
          <b style="color:#d4b46a;">[解锁支线]</b> 你被推入「骗亦有道」——接下来会有拍卖环节的技能牌在场内流通。
        `;
      } else {
        voteResult.classList.add('show');
        voteResult.innerHTML = `
          <b style="color:#7ba86b; font-family: var(--display); letter-spacing:.08em;">画外音：</b>
          如我所料，你们大多数人都选择诉诸正义。<br/>
          汉娜·阿伦特说：善可以是根本性的，而恶从来不是。因为它不具备深度——
          当思维坠入恶的深渊时，总会一无所获。恶泯灭了思维。这就是恶的平庸性。
          <br/><br/>
          <b style="color:#7ba86b;">[解锁支线]</b> 你进入「骗亦有道」——但你失去了拍卖环节的技能卡特权。
        `;
      }
      markDone(3);
      unlockAct(4);
      maybeUnlockEndingBtn();
      updateHUD();
    });
  });

  /* ==========================================================
   * ACT IV · 结局
   * ========================================================== */
  const ENDINGS = {
    E01: {
      code: 'E.01',
      title: '瞒天过海 · <em>Grand Deceit</em>',
      body: '你带着满袋筹码走到了最后一幕。灯暗下来的一瞬，你听见有人说——"你想知道的答案，都在这一幕里。"你看着他们说话，看着他们彼此怀疑，却始终没开口。本组冠军：你。',
      closer: 'Truth surfaces — but only once.'
    },
    E02: {
      code: 'E.02',
      title: '反派死于话多 · <em>Villain Talks Too Much</em>',
      body: '你坐在第一排，看着其中一个人越说越多——多到已经没办法收回去了。真相是不是他给出的那个版本？你不确定。但你知道，话说多了的人，最终会把自己说穿。本组亚军：你。',
      closer: 'You are almost Van Gogh.'
    },
    E03: {
      code: 'E.03',
      title: '无德之人 · <em>The Outcast</em>',
      body: '你在"以暴制暴"中选择了复仇——也因此被贴上了标签。灯打到你脸上的时候，你成为众矢之的。你被带出剧场，筹码归零。但工作人员递给你一只信封……',
      closer: 'Losing is just another game.'
    },
    E04: {
      code: 'E.04',
      title: '欺骗是一个圆 · <em>A Liar\u0027s Circle</em>',
      body: '你的筹码不够看清全局。最后一幕，你只是一个观众——画外音替你说话："骗子的最终目的不是骗过所有人，而是要骗过自己。" 本组出局：你。',
      closer: 'When the lie lasts forever, it becomes real.'
    },
  };

  function pickEnding(){
    const rich    = state.chips >= 120;
    const middle  = state.chips >= 40;
    const guessed = !!state.culpritGuess;
    const revenge = state.moralVote === 'revenge';

    if (rich && guessed)    return 'E01';
    if (guessed && middle)  return 'E02';
    if (revenge)            return 'E03';
    return 'E04';
  }

  const endingDisplay = document.getElementById('endingDisplay');
  const endingReveal = document.getElementById('endingReveal');
  const endingReplay = document.getElementById('endingReplay');

  function maybeUnlockEndingBtn(){
    // Enable the reveal as soon as Act 3 is done (or Act 4 tab is opened).
    const ready = state.actsDone[3] || state.actsDone[2] || state.actsDone[1];
    if (!ready) return;
    endingReveal.disabled = false;
    // Replace the locked placeholder so the stage no longer reads "未完成".
    if (endingDisplay.querySelector('.ending__locked')) {
      endingDisplay.innerHTML = `
        <div class="ending__ready">
          <div class="ending__ready-k">一切就绪</div>
          <div class="ending__ready-v">四种结局 · 即将揭晓其一</div>
          <div class="ending__ready-hint">按下下方「揭示结局」</div>
        </div>`;
    }
    console.log('[liar-engine] ending unlocked');
  }
  tabs[3].addEventListener('click', maybeUnlockEndingBtn);

  endingReveal.addEventListener('click', () => {
    const key = pickEnding();
    const e = ENDINGS[key];
    endingDisplay.innerHTML = `
      <div class="ending__code">Ending ${e.code} · 共 4 种可能</div>
      <h3 class="ending__title">${e.title}</h3>
      <p class="ending__body">${e.body}</p>
      <div class="ending__closer">"${e.closer}"</div>
      <div class="ending__scorecard">
        <div class="ending__score"><div class="ending__score-k">Role</div><div class="ending__score-v">${state.role ? ROLE_LABEL[state.role] : '未选'}</div></div>
        <div class="ending__score"><div class="ending__score-k">Chips</div><div class="ending__score-v">${state.chips} 万</div></div>
        <div class="ending__score"><div class="ending__score-k">Suspect</div><div class="ending__score-v">${(SUSPECTS.find(s=>s.id===state.culpritGuess)||{}).n || '未指认'}</div></div>
        <div class="ending__score"><div class="ending__score-k">Moral</div><div class="ending__score-v">${state.moralVote === 'revenge' ? '执行复仇' : state.moralVote === 'justice' ? '诉诸正义' : '—'}</div></div>
      </div>
    `;
    markDone(4);
  });

  endingReplay.addEventListener('click', () => {
    state.chips = 0; state.cluesUnlocked = 0;
    state.culpritGuess = null; state.culpritCorrect = false;
    state.moralVote = null; state.actsDone = {1:false,2:false,3:false,4:false};
    tabs.forEach((t,i) => { t.classList.remove('is-done'); if (i > 0) t.classList.add('is-locked'); });
    updateHUD();
    newFraudMatch();
    renderSuspects(); renderClues();
    mysterySubmitEl.classList.remove('done');
    mysterySubmitEl.innerHTML = `
      <div class="mystery__submit-q">你怀疑谁是爆炸案的真凶？</div>
      <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        <button class="lg-btn lg-btn--primary" id="mysteryGo" disabled>听他的辩解 · Hear Defense</button>
        <button class="lg-btn lg-btn--ghost" id="mysterySkip">跳过 · Skip</button>
      </div>`;
    // Re-bind mystery buttons after innerHTML reset
    document.getElementById('mysteryGo').addEventListener('click', () => { if (state.culpritGuess) submitMystery(); });
    document.getElementById('mysterySkip').addEventListener('click', () => {
      state.culpritGuess = null;
      mysterySubmitEl.classList.add('done');
      mysterySubmitEl.innerHTML = `
        <div class="mystery__verdict">◉ 已跳过指认</div>
        <div class="mystery__read">
          你选择不指认。<br/>
          <b>真相只在剧场中揭晓。</b>要知道答案，请来现场。
        </div>`;
      markDone(2); unlockAct(3); updateHUD();
    });
    document.querySelectorAll('.vote__btn').forEach(b => {
      b.disabled = false;
      b.classList.remove('picked');
      b.style.setProperty('--p', '0%');
      const p = b.querySelector('[data-pct]'); if (p) p.textContent = '—';
    });
    voteResult.classList.remove('show');
    voteResult.innerHTML = '';
    endingDisplay.innerHTML = `<div class="ending__locked">完成前一幕后，此幕自动解锁<br/><small>Unlocks as you play through</small></div>`;
    endingReveal.disabled = true;
    goAct(1);
  });

  updateHUD();

})();
