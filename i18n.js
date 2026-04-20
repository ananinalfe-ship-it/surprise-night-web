/* ============================================================
   i18n · 中英切换（loader + 切换器 + 持久化）
   用法：
     <script src="i18n.js"></script>  // 放在 head，或 body 前加载
     <元素 data-i18n="key">中文默认</元素>
     <元素 data-i18n-attr="placeholder:some.key">
     <元素 data-i18n-html="some.key">支持包含 <br><em> 的 HTML</元素>
   ============================================================ */
(function(){
  const STORAGE_KEY = 'sn-lang';
  const DEFAULT_LANG = 'zh';
  const LANGS = ['zh', 'en'];

  // 决定当前语言（URL 参数 > localStorage > 默认）
  function detectLang() {
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang && LANGS.includes(urlLang)) return urlLang;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LANGS.includes(stored)) return stored;
    } catch(e) {}
    return DEFAULT_LANG;
  }

  // 计算 locale 文件相对路径（支持根目录和 site/ 子目录）
  function localesBase() {
    return location.pathname.includes('/site/') ? '../locales/' : 'locales/';
  }

  // 直接把 data-lang 属性尽早设到 <html> 上，避免 FOUC
  const currentLang = detectLang();
  document.documentElement.setAttribute('data-lang', currentLang);
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-CN';

  let dict = {};

  async function loadDict(lang) {
    try {
      const res = await fetch(localesBase() + lang + '.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.warn('[i18n] 加载 ' + lang + ' 失败:', err);
      return {};
    }
  }

  function apply(dict) {
    // 文本节点替换
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = dict[key];
      if (val == null) return;
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    // 属性替换（如 placeholder, aria-label, title）
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.getAttribute('data-i18n-attr').split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (!attr || !key) return;
        if (dict[key] != null) el.setAttribute(attr, dict[key]);
      });
    });
  }

  function updateLangButtons(lang) {
    document.querySelectorAll('.nav__lang button, [data-set-lang]').forEach(btn => {
      const target = btn.dataset.setLang || (btn.textContent.trim().toLowerCase() === 'en' ? 'en' : 'zh');
      btn.classList.toggle('is-active', target === lang);
      btn.setAttribute('aria-pressed', target === lang ? 'true' : 'false');
    });
  }

  async function setLang(lang) {
    if (!LANGS.includes(lang) || lang === currentLang) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e) {}
    // 简化：刷新页面重新应用（保留现有 URL 参数，只换 lang）
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    location.href = url.toString();
  }

  // 给语言按钮绑定：兼容 .nav__lang button 和 [data-set-lang]
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav__lang button, [data-set-lang]');
    if (!btn) return;
    const target = btn.dataset.setLang || (btn.textContent.trim().toLowerCase() === 'en' ? 'en' : 'zh');
    setLang(target);
  });

  // DOM ready 帮助函数（兼容 await fetch 之后 DOMContentLoaded 已触发的情况）
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  // 先在 DOM 就绪时就更新按钮状态（不依赖 dict 加载）
  onReady(() => updateLangButtons(currentLang));

  // 初始化：加载 dict 并应用
  (async () => {
    dict = await loadDict(currentLang);
    window.__i18n = { lang: currentLang, dict, apply: () => apply(dict), setLang };
    apply(dict);
    onReady(() => {
      apply(dict);
      updateLangButtons(currentLang);
      document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: currentLang, dict } }));
    });
  })();
})();
