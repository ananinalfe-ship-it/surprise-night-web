(function () {
  function getNested(obj, path) {
    return path.split(".").reduce(function (a, k) {
      return a && a[k];
    }, obj);
  }

  function msg(key) {
    var d = window.__i18nDict;
    var lang = window.snI18n && window.snI18n.getLang ? window.snI18n.getLang() : "zh";
    var bundle = lang === "en" ? "en" : "zh";
    var node = d ? getNested(d, key) : null;
    if (node && node[bundle] != null) return String(node[bundle]);
    return "";
  }

  function showStatus(el, type, text) {
    if (!el) return;
    el.textContent = text;
    el.className =
      "contact-form-status is-visible" + (type ? " contact-form-status--" + type : "");
    el.hidden = false;
  }

  function hideStatus(el) {
    if (!el) return;
    el.className = "contact-form-status";
    el.textContent = "";
    el.hidden = true;
  }

  var bound;

  function init() {
    if (bound) return;
    var form = document.getElementById("contact-form");
    var statusEl = document.getElementById("contact-form-status");
    if (!form || !statusEl) return;
    bound = true;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideStatus(statusEl);

      var fd = new FormData(form);
      var body = {
        name: fd.get("name"),
        organization: fd.get("organization"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        partnership_type: fd.get("partnership_type"),
        budget_range: fd.get("budget_range"),
        project_timeline: fd.get("project_timeline"),
        referral_source: fd.get("referral_source"),
        message: fd.get("message"),
      };

      var btn = form.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.setAttribute("data-label-restore", btn.textContent);
        btn.textContent = msg("contactPage.formSending") || btn.textContent;
      }

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          return r.text().then(function (text) {
            var data = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch (e) {}
            return { ok: r.ok, status: r.status, data: data };
          });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.ok) {
            showStatus(statusEl, "ok", msg("contactPage.formOk"));
            form.reset();
            return;
          }
          if (res.status === 503 && res.data && res.data.error === "not_configured") {
            showStatus(statusEl, "err", msg("contactPage.formErrConfig"));
            return;
          }
          showStatus(statusEl, "err", msg("contactPage.formErr"));
        })
        .catch(function () {
          showStatus(statusEl, "err", msg("contactPage.formErrNet"));
        })
        .then(function () {
          if (btn) {
            btn.disabled = false;
            var restore = btn.getAttribute("data-label-restore");
            if (restore) btn.textContent = restore;
          }
        });
    });

    window.addEventListener("sn-lang-changed", function () {
      hideStatus(statusEl);
    });
  }

  function boot() {
    if (window.__i18nDict) init();
    else {
      window.addEventListener("sn-i18n-ready", init, { once: true });
      setTimeout(function () {
        init();
      }, 12000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
