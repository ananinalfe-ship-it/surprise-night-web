(function () {
  var root = document.getElementById("archive-app");
  var introEl = document.getElementById("archive-intro");
  var modal = document.getElementById("archiveModal");
  var modalBody = document.getElementById("archiveModalBody");
  if (!root || !modal || !modalBody) return;

  var byId = {};
  var payload = null;

  function getLang() {
    try {
      return localStorage.getItem("sn_lang") === "en" ? "en" : "zh";
    } catch (e) {
      return "zh";
    }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escUrl(u) {
    return String(u || "")
      .replace(/\\/g, "/")
      .replace(/"/g, "%22");
  }

  function t(obj, lang) {
    if (!obj || typeof obj !== "object") return "";
    return obj[lang] != null ? obj[lang] : obj.zh || "";
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openModal(id) {
    var item = byId[id];
    if (!item) return;
    var lang = getLang();
    var html =
      '<div class="archive-modal__image" style="background-image:url(&quot;' +
      escUrl(item.image) +
      '&quot;)"></div>' +
      '<div class="archive-modal__text">' +
      '<p class="archive-modal__tags"><span class="archive-modal__type">' +
      esc(t(item.typeTag, lang)) +
      "</span>" +
      '<span class="archive-modal__status">' +
      esc(t(item.status, lang)) +
      "</span></p>" +
      "<h2>" +
      esc(t(item.title, lang)) +
      "</h2>" +
      "<p>" +
      esc(t(item.detail, lang)) +
      "</p></div>";
    modalBody.innerHTML = html;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function render() {
    if (!payload) return;
    var lang = getLang();
    var data = payload;
    if (introEl) introEl.textContent = t(data.intro, lang);

    var order = ["urban", "suspense", "traditional"];
    var sections = {};
    data.items.forEach(function (it) {
      if (!sections[it.section]) sections[it.section] = [];
      sections[it.section].push(it);
      byId[it.id] = it;
    });

    var html = "";
    order.forEach(function (key) {
      if (!sections[key] || !sections[key].length) return;
      html += '<section class="archive-section" aria-labelledby="arc-' + esc(key) + '">';
      html +=
        '<h2 id="arc-' +
        esc(key) +
        '" class="archive-section__title">' +
        esc(t(data.sectionLabels[key], lang)) +
        "</h2>";
      html += '<div class="archive-grid">';
      sections[key].forEach(function (it) {
        html +=
          '<article class="archive-card" tabindex="0" role="button" data-archive-id="' +
          esc(it.id) +
          '" aria-expanded="false">';
        html +=
          '<div class="archive-card__media" style="background-image:url(\'' +
          escUrl(it.image) +
          "')\"></div>";
        html += '<div class="archive-card__body">';
        html += '<span class="archive-card__type">' + esc(t(it.typeTag, lang)) + "</span>";
        html += "<h3>" + esc(t(it.title, lang)) + "</h3>";
        html += '<p class="archive-card__line">' + esc(t(it.oneLine, lang)) + "</p>";
        html +=
          '<span class="archive-card__status">' + esc(t(it.status, lang)) + "</span>";
        html += "</div></article>";
      });
      html += "</div></section>";
    });
    root.innerHTML = html;
  }

  root.addEventListener("click", function (e) {
    var card = e.target.closest(".archive-card");
    if (!card) return;
    openModal(card.getAttribute("data-archive-id"));
  });

  root.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest(".archive-card");
    if (!card) return;
    e.preventDefault();
    openModal(card.getAttribute("data-archive-id"));
  });

  modal.addEventListener("click", function (e) {
    if (
      e.target === modal ||
      (e.target.classList && e.target.classList.contains("archive-modal__backdrop"))
    ) {
      closeModal();
    }
  });

  document.querySelectorAll("[data-archive-modal-close]").forEach(function (btn) {
    btn.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  function load() {
    fetch("data/archive-works.json")
      .then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then(function (data) {
        payload = data;
        byId = {};
        render();
      })
      .catch(function () {
        root.innerHTML =
          '<p class="archive-error">内容加载失败，请使用本地服务器打开本站。</p>';
      });
  }

  load();
  window.addEventListener("sn-lang-changed", function () {
    if (modal.classList.contains("is-open")) closeModal();
    if (payload) render();
  });
})();

