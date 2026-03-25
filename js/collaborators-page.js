(function () {
  var root = document.getElementById("collab-app");
  var introEl = document.getElementById("collab-intro");
  if (!root) return;

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

  function safeImageFocus(s) {
    if (!s || typeof s !== "string") return "center 35%";
    return /^[\d.%\s]+$/.test(s.trim()) ? s.trim() : "center 35%";
  }

  function t(obj, lang) {
    if (!obj || typeof obj !== "object") return "";
    return obj[lang] != null ? obj[lang] : obj.zh || "";
  }

  function render(payload) {
    var lang = getLang();
    if (introEl && payload.intro) introEl.textContent = t(payload.intro, lang);

    var html = "";
    (payload.people || []).forEach(function (p, i) {
      var alt = esc(t(p.name, lang) + " — " + t(p.roleEyebrow, lang));
      var bioHtml = (p.bio || [])
        .map(function (block) {
          return "<p>" + esc(t(block, lang)) + "</p>";
        })
        .join("");

      var worksBlock = "";
      if (p.works && p.works.length && p.worksTitle) {
        worksBlock +=
          '<p class="collab-card__works-head">' +
          esc(t(p.worksTitle, lang)) +
          "</p><p class=\"collab-card__works-body\">";
        worksBlock += p.works
          .map(function (w) {
            return esc(t(w, lang));
          })
          .join(" ");
        worksBlock += "</p>";
      }

      var rowClass = "collab-card" + (i % 2 === 1 ? " collab-card--reverse" : "");
      html += '<article class="' + rowClass + '" id="' + esc(p.id) + '">';
      html += '<div class="collab-card__media">';
      var focus = safeImageFocus(p.imageFocus);
      html +=
        '<div class="collab-card__frame"><img src="' +
        escUrl(p.image) +
        '" alt="' +
        alt +
        '" loading="lazy" decoding="async" style="object-position: ' +
        focus +
        '" /></div>';
      html += "</div>";
      html += '<div class="collab-card__body">';
      html += '<header class="collab-card__head">';
      html += '<p class="collab-card__eyebrow">' + esc(t(p.roleEyebrow, lang)) + "</p>";
      html += '<div class="collab-card__head-main">';
      html += '<div class="collab-card__head-titles">';
      html += '<p class="collab-card__roleline">' + esc(t(p.roleDisplay, lang)) + "</p>";
      html += '<div class="collab-card__rule" aria-hidden="true"></div>';
      html += "</div>";
      html += '<h2 class="collab-card__name">' + esc(t(p.name, lang)) + "</h2>";
      html += "</div></header>";
      html += '<div class="collab-card__bio">' + bioHtml + "</div>";
      html += worksBlock;
      html += "</div></article>";
    });
    root.innerHTML = html;
  }

  function load() {
    fetch("data/collaborators.json")
      .then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then(function (data) {
        window.__collabPayload = data;
        render(data);
      })
      .catch(function () {
        root.innerHTML =
          '<p class="collab-error">内容加载失败，请使用本地服务器打开本站。</p>';
      });
  }

  load();
  window.addEventListener("sn-lang-changed", function () {
    if (window.__collabPayload) render(window.__collabPayload);
  });
})();
