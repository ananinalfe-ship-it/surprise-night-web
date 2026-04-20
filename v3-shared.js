/* 惊喜之夜 v3 · 共享脚本：curtain / cursor / nav scroll / reveal / video modal */
(function(){
  const STORAGE_KEY = 'sn-v3-intro-seen';
  const body = document.body;

  // 幕布开场 —— 只在一次 session 内首个页面播放
  const playedCurtain = sessionStorage.getItem(STORAGE_KEY);
  if (playedCurtain) {
    body.classList.add('intro-done', 'intro-ready', 'no-intro');
  } else {
    requestAnimationFrame(()=>{
      setTimeout(()=> body.classList.add('intro-ready'), 80);
      setTimeout(()=>{
        body.classList.add('intro-done');
        sessionStorage.setItem(STORAGE_KEY, '1');
      }, 1600);
    });
  }

  // cursor glow
  const glow = document.querySelector('.cursor-glow');
  if (glow) {
    let rx=0, ry=0, cx=0, cy=0, raf;
    body.classList.add('has-cursor');
    window.addEventListener('mousemove', (e)=>{
      rx = e.clientX; ry = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(function tick(){
          cx += (rx - cx) * .18;
          cy += (ry - cy) * .18;
          glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
          if (Math.abs(rx-cx) > .5 || Math.abs(ry-cy) > .5) {
            raf = requestAnimationFrame(tick);
          } else { raf = null; }
        });
      }
    });
  }

  // nav scroll bg
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = ()=> nav.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // reveal on scroll
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }});
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // video modal helper
  window.openVideoModal = (src)=>{
    let modal = document.getElementById('videoModal');
    if (!modal) return;
    const frame = modal.querySelector('iframe');
    frame.src = src;
    modal.classList.add('is-open');
  };
  window.closeVideoModal = ()=>{
    const modal = document.getElementById('videoModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.querySelector('iframe').src = '';
  };
  document.addEventListener('click', (e)=>{
    if (e.target.matches('.video-modal') || e.target.closest('.video-modal__close')) {
      window.closeVideoModal();
    }
  });

  // lang toggle 已由 i18n.js 接管，这里不再绑定

  // 为每一行文字分字段动画（给 .split-chars 类加）
  document.querySelectorAll('.split-chars').forEach(el=>{
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch,i)=>{
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.setProperty('--i', i);
      el.appendChild(s);
    });
  });
})();

// ========== 汉堡菜单（移动端） ==========
(function hamburger(){
  const navEl = document.getElementById('nav') || document.querySelector('.nav');
  const burger = document.getElementById('navBurger');
  if (!burger || !navEl) return;
  const body = document.body;
  const closeNav = () => {
    navEl.classList.remove('nav--open');
    burger.setAttribute('aria-expanded', 'false');
    body.style.overflow = '';
  };
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = navEl.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.style.overflow = open ? 'hidden' : '';
  });
  navEl.querySelectorAll('.nav__link').forEach(a => a.addEventListener('click', closeNav));
  document.addEventListener('click', (e) => {
    if (navEl.classList.contains('nav--open') && !navEl.contains(e.target)) closeNav();
  });
})();
