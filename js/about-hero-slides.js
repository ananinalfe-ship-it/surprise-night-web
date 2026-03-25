(function () {
  var root = document.querySelector(".about-hero__slides");
  if (!root) return;

  var images = [
    "assets/images/about-bg.jpg",
    "assets/images/works-hero-stage.png",
    "assets/images/work-shanhai.png",
    "assets/images/gallery/shanhai-1.jpg",
    "assets/images/gallery/nie-1.jpg",
    "assets/images/gallery/ultimate-1.jpg",
    "assets/images/gallery/survivor-1.png",
    "assets/images/gallery/submarine-still-01.png",
    "assets/images/gallery/yaonan-1.jpg"
  ];

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  images.forEach(function (src, i) {
    var el = document.createElement("div");
    el.className = "about-hero__slide" + (i === 0 ? " is-active" : "");
    el.style.backgroundImage = "url(" + JSON.stringify(src) + ")";
    el.setAttribute("role", "presentation");
    root.appendChild(el);
  });

  var slides = root.querySelectorAll(".about-hero__slide");
  if (slides.length <= 1 || reduceMotion) return;

  var idx = 0;
  var period = 6500;

  function next() {
    slides[idx].classList.remove("is-active");
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add("is-active");
  }

  setInterval(next, period);
})();
