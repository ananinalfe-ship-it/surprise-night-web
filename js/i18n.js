(function () {
  var STORAGE = "sn_lang";
  try {
    var q = new URLSearchParams(window.location.search);
    if (q.get("lang") === "en") localStorage.setItem(STORAGE, "en");
    if (q.get("lang") === "zh") localStorage.setItem(STORAGE, "zh");
  } catch (e) {}

  function getQueryLang() {
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.get("lang") === "en") return "en";
      if (p.get("lang") === "zh") return "zh";
    } catch (e) {}
    return null;
  }

  function getStoredLang() {
    try {
      var s = localStorage.getItem(STORAGE);
      if (s === "en" || s === "zh") return s;
    } catch (e) {}
    return "zh";
  }

  function getLang() {
    var q = getQueryLang();
    if (q) {
      try {
        localStorage.setItem(STORAGE, q);
      } catch (e) {}
      return q;
    }
    return getStoredLang();
  }

  function setLang(lang) {
    if (lang !== "en" && lang !== "zh") return;
    try {
      localStorage.setItem(STORAGE, lang);
    } catch (e) {}
    applyLang(lang);
    window.dispatchEvent(new CustomEvent("sn-lang-changed", { detail: { lang: lang } }));
    try {
      var u = new URL(window.location.href);
      u.searchParams.set("lang", lang);
      window.history.replaceState({}, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  function getNested(obj, path) {
    return path.split(".").reduce(function (a, k) {
      return a && a[k];
    }, obj);
  }

  function applyLang(lang) {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.documentElement.setAttribute("data-lang", lang);

    if (!window.__i18nDict) return;

    var dict = window.__i18nDict;
    var bundle = lang === "en" ? "en" : "zh";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var node = getNested(dict, key);
      if (!node || typeof node !== "object") return;
      var str = node[bundle];
      if (str == null) return;
      if (el.getAttribute("data-i18n-html") === "true") {
        el.innerHTML = str;
      } else if (el.tagName === "IMG") {
        el.setAttribute("alt", str);
      } else {
        el.textContent = str;
      }
    });

    var metaDesc = document.querySelector('meta[name="description"]');
    var page = document.body && document.body.getAttribute("data-i18n-page");

    var META_KEYS = {
      home: { title: "index.metaTitle", desc: "index.metaDesc" },
      works: { title: "worksPage.metaTitle", desc: "worksPage.metaDesc" },
      collaborate: { title: "collabPage.metaTitle", desc: "collabPage.metaDesc" },
      about: { title: "aboutPage.metaTitle", desc: "aboutPage.metaDesc" },
      collaborators: { title: "collaboratorsPage.metaTitle", desc: "collaboratorsPage.metaDesc" },
      contact: { title: "contactPage.metaTitle", desc: "contactPage.metaDesc" },
      "project-shanhai": { title: "projectShanhai.metaTitle", desc: "projectShanhai.metaDesc" },
      "project-shanhai-story": { title: "projectShanhai.storyPageMetaTitle", desc: "projectShanhai.storyPageMetaDesc" },
      "project-shanhai-stagecraft": { title: "projectShanhai.stagePageMetaTitle", desc: "projectShanhai.stagePageMetaDesc" },
      "project-shanhai-gallery": { title: "projectShanhai.galleryPageMetaTitle", desc: "projectShanhai.galleryPageMetaDesc" },
      "project-shanhai-visit": { title: "projectShanhai.visitPageMetaTitle", desc: "projectShanhai.visitPageMetaDesc" },
      "project-math": { title: "projectMath.metaTitle", desc: "projectMath.metaDesc" },
      "project-nie": { title: "projectNie.metaTitle", desc: "projectNie.metaDesc" },
      "project-ultimate-con": { title: "projectUltimateCon.metaTitle", desc: "projectUltimateCon.metaDesc" },
      "project-survivor": { title: "projectSurvivor.metaTitle", desc: "projectSurvivor.metaDesc" },
      "project-yaonan": { title: "projectYaonan.metaTitle", desc: "projectYaonan.metaDesc" },
      "project-balala": { title: "projectBalala.metaTitle", desc: "projectBalala.metaDesc" },
      "project-submarine": { title: "projectSubmarine.metaTitle", desc: "projectSubmarine.metaDesc" },
      "project-archive": { title: "projectArchive.metaTitle", desc: "projectArchive.metaDesc" }
    };

    if (page && META_KEYS[page]) {
      var mk = META_KEYS[page];
      var mtt = getNested(dict, mk.title);
      if (mtt && mtt[bundle]) document.title = mtt[bundle];
      var mdd = getNested(dict, mk.desc);
      if (metaDesc && mdd && mdd[bundle]) metaDesc.setAttribute("content", mdd[bundle]);
    }

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      var node = getNested(dict, key);
      if (!node || typeof node !== "object") return;
      var str = node[bundle];
      if (str != null) el.setAttribute("placeholder", str);
    });

    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      var target = btn.getAttribute("data-set-lang");
      var active = target === lang;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.classList.toggle("is-active", active);
    });
  }

  function init() {
    Promise.all([
      fetch("data/i18n.json").then(function (r) {
        if (!r.ok) throw new Error("i18n");
        return r.json();
      }),
      fetch("data/i18n-pages.json").then(function (r) {
        return r.ok ? r.json() : {};
      })
    ])
      .then(function (parts) {
        window.__i18nDict = Object.assign({}, parts[0], parts[1]);
        applyLang(getLang());
        window.dispatchEvent(new CustomEvent("sn-i18n-ready"));

        document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            var lang = btn.getAttribute("data-set-lang");
            setLang(lang);
          });
        });
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.snI18n = { setLang: setLang, getLang: getLang, applyLang: applyLang };
})();
