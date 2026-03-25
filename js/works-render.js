(function () {
  var grids = document.querySelectorAll("[data-works-grid]");
  if (!grids.length) return;

  var cached = null;

  function getLang() {
    try {
      return localStorage.getItem("sn_lang") === "en" ? "en" : "zh";
    } catch (e) {
      return "zh";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  function mediaStyle(cover) {
    if (!cover) return "";
    if (cover.type === "image" && cover.src) {
      var u = String(cover.src).replace(/\\/g, "/");
      return 'background-image:url("' + u.replace(/"/g, '\\"') + '")';
    }
    if (cover.type === "gradient" && cover.value) {
      return "background:" + cover.value;
    }
    return "";
  }

  function tagClass(variant) {
    if (variant === "muted") return "tag muted";
    if (variant === "outline") return "tag outline";
    return "tag";
  }

  function cardHtml(w, opts) {
    opts = opts || {};
    var lang = getLang();
    var href = w.href || "#";
    var titleMain = lang === "en" ? w.titleEn || w.titleZh : w.titleZh;
    var titleSub = lang === "en" ? w.titleZh : w.titleEn;
    var useHomeTag =
      (opts.isFlagship || opts.isSpotlight) && (w.homeTagZh || w.homeTagEn);
    var tagText = useHomeTag
      ? lang === "en"
        ? w.homeTagEn || w.homeTagZh || w.tagEn || w.tag
        : w.homeTagZh || w.homeTagEn || w.tag
      : lang === "en"
        ? w.tagEn || w.tag
        : w.tag;
    var sr = lang === "en" ? w.srLabelEn || w.srLabel || "View" : w.srLabel || "查看作品";
    var cat = w.category || "general";
    var pillText = lang === "en" ? w.categoryLabelEn || w.categoryLabel : w.categoryLabel;
    var blurbText = lang === "en" ? w.blurbEn || w.blurb : w.blurb;

    var blurb =
      blurbText &&
      '<p class="card-blurb">' +
        escapeHtml(blurbText) +
        "</p>";
    var pill =
      pillText &&
      '<p class="type-pill">' +
        escapeHtml(pillText) +
        "</p>";

    var cardClass =
      "work-card" +
      (opts.isFlagship ? " work-card--flagship" : "") +
      (opts.isSpotlight ? " work-card--spotlight" : "") +
      (w.id === "archive" ? " work-card--archive" : "");

    var mediaStack =
      '<div class="media" style="' +
      escapeAttr(mediaStyle(w.cover)) +
      '"></div>' +
      '<div class="overlay"></div>' +
      '<span class="' +
      tagClass(w.tagVariant) +
      '">' +
      escapeHtml(tagText) +
      "</span>";

    var bodyBlock =
      '<div class="body">' +
      (pill || "") +
      "<h3>" +
      escapeHtml(titleMain) +
      "</h3>" +
      '<p class="en">' +
      escapeHtml(titleSub) +
      "</p>" +
      (blurb || "") +
      "</div>";

    var inner =
      w.id === "archive"
        ? '<div class="work-card--archive__media-wrap">' + mediaStack + "</div>" + bodyBlock
        : mediaStack + bodyBlock;

    return (
      '<article class="' +
      cardClass +
      '" data-category="' +
      escapeAttr(cat) +
      '">' +
      inner +
      '<a class="card-link" href="' +
      escapeAttr(href) +
      '"><span class="sr-only">' +
      escapeHtml(sr) +
      "</span></a>" +
      "</article>"
    );
  }

  function render() {
    if (!cached) return;
    var data = cached;
    var all = data.works || [];
    var byId = {};
    all.forEach(function (w) {
      if (w.id) byId[w.id] = w;
    });

    grids.forEach(function (grid) {
      var mode = grid.getAttribute("data-works-grid");
      var list;
      if (mode === "home") {
        var order = data.homeOrder || [];
        list = order
          .map(function (id) {
            return byId[id];
          })
          .filter(Boolean);
        var lim = grid.getAttribute("data-limit");
        if (lim) {
          list = list.slice(0, parseInt(lim, 10));
        }
        var layout = grid.getAttribute("data-home-layout");
        grid.innerHTML = list
          .map(function (w, i) {
            var isFlagship = layout === "flagship" && i === 0;
            return cardHtml(w, { isFlagship: isFlagship });
          })
          .join("");
      } else {
        var orderIds = data.worksListOrder;
        if (orderIds && orderIds.length) {
          list = orderIds
            .map(function (id) {
              return byId[id];
            })
            .filter(Boolean);
          all.forEach(function (w) {
            if (!w.id || orderIds.indexOf(w.id) !== -1) return;
            list.push(w);
          });
        } else {
          list = all.slice();
        }
        var spotlight = grid.getAttribute("data-works-spotlight") === "true";
        grid.innerHTML = list
          .map(function (w, i) {
            return cardHtml(w, { isSpotlight: spotlight && i === 0 });
          })
          .join("");
      }
      grid.dispatchEvent(new CustomEvent("works:rendered", { bubbles: true }));
    });
  }

  fetch("data/works.json")
    .then(function (r) {
      if (!r.ok) throw new Error("bad response");
      return r.json();
    })
    .then(function (data) {
      cached = data;
      render();
    })
    .catch(function () {
      var msg =
        '<p style="color:var(--muted);text-align:center;grid-column:1/-1;padding:24px;">作品列表未能加载。请使用本地服务器打开本站（例如 <code style="color:var(--text)">python3 -m http.server 8080</code>）。</p>';
      grids.forEach(function (g) {
        g.innerHTML = msg;
      });
    });

  window.addEventListener("sn-lang-changed", render);
})();
