/* Load the original media only when needed. No dimensions, type or artwork changes. */
(function () {
  'use strict';
  var root = document.documentElement;
  var restoreAll = window.__snRestoreMedia;
  try {
    clearTimeout(window.__snMediaTimer);
    var margin = Math.max(window.innerHeight, 800);
    var backgrounds = Array.from(document.querySelectorAll('[data-defer-bg]'));
    var reveal = function (element) { element.setAttribute('data-bg-ready', ''); };
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: margin + 'px ' + window.innerWidth + 'px' });
      // A horizontal scrollport clips its distant children even with rootMargin.
      // Prepare the entire unchanged gallery as it approaches vertically.
      var galleries = Array.from(document.querySelectorAll('.strip, .strip__track, .sv-gallery__scroll'));
      var galleryObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll('[data-defer-bg]').forEach(reveal);
          entry.target.querySelectorAll('img[loading="lazy"]').forEach(function (image) { image.loading = 'eager'; });
          galleryObserver.unobserve(entry.target);
        });
      }, { rootMargin: margin + 'px 0px' });
      galleries.forEach(function (gallery) { galleryObserver.observe(gallery); });
      backgrounds.forEach(function (element) {
        var rect = element.getBoundingClientRect();
        if (rect.top <= innerHeight + margin && rect.bottom >= -margin && rect.right >= 0 && rect.left <= innerWidth) {
          reveal(element);
        } else {
          observer.observe(element);
        }
      });
    } else {
      backgrounds.forEach(reveal);
    }

    document.querySelectorAll('video[data-defer-video]').forEach(function (video) {
      var started = false;
      var visible = false;
      var scheduled = false;
      function enterFlowAllowsVideo() {
        var body = document.body;
        return !document.getElementById('keyGate') ||
          ((body.classList.contains('key-done') || body.classList.contains('no-key')) &&
           !body.classList.contains('identity-open') &&
           (body.classList.contains('intro-ready') || body.classList.contains('intro-done') || body.classList.contains('no-intro')));
      }
      function playVisibleVideo() {
        if (document.hidden || !visible || !enterFlowAllowsVideo()) {
          if (started) video.pause();
          return;
        }
        if (started) {
          var resumed = video.play();
          if (resumed) resumed.catch(function () {});
          return;
        }
        if (scheduled) return;
        scheduled = true;
        // Give the unchanged type and initial artwork priority over background motion.
        var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
        Promise.race([fontsReady, new Promise(function (resolve) { setTimeout(resolve, 1500); })]).then(function () {
          scheduled = false;
          if (document.hidden || !visible || !enterFlowAllowsVideo()) return;
          video.querySelectorAll('source[data-src]').forEach(function (source) {
            source.setAttribute('src', source.getAttribute('data-src'));
          });
          video.preload = 'metadata';
          started = true;
          video.load();
          var playing = video.play();
          if (playing) playing.catch(function () {});
        });
      }
      if ('IntersectionObserver' in window) {
        var videoObserver = new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          playVisibleVideo();
        });
        videoObserver.observe(video);
      } else {
        visible = true;
      }
      var entryObserver = new MutationObserver(playVisibleVideo);
      entryObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      document.addEventListener('visibilitychange', playVisibleVideo);
      playVisibleVideo();
    });
  } catch (error) {
    if (restoreAll) restoreAll();
  }
})();
