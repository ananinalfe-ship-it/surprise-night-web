(function () {
  var bar = document.querySelector("[data-works-filter-bar]");
  var grid = document.querySelector("[data-works-grid='all']");
  if (!bar || !grid) return;

  function apply(filter) {
    grid.querySelectorAll(".work-card").forEach(function (card) {
      var ok = filter === "all" || card.getAttribute("data-category") === filter;
      card.style.display = ok ? "" : "none";
    });
  }

  bar.querySelectorAll("button[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter") || "all";
      bar.querySelectorAll("button[data-filter]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      apply(f);
    });
  });

  grid.addEventListener("works:rendered", function () {
    var active = bar.querySelector("button[data-filter].is-active");
    apply(active ? active.getAttribute("data-filter") : "all");
  });
})();
