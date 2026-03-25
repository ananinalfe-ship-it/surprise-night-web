(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav-links");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  nav.querySelectorAll("button[data-set-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

/* ========================================
   Video Modal Functions
   ======================================== */
function openVideoModal(videoUrl) {
  var modal = document.getElementById('videoModal');
  var iframe = document.getElementById('videoFrame');
  if (modal && iframe) {
    iframe.src = videoUrl;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeVideoModal() {
  var modal = document.getElementById('videoModal');
  var iframe = document.getElementById('videoFrame');
  if (modal && iframe) {
    modal.classList.remove('active');
    iframe.src = '';
    document.body.style.overflow = '';
  }
}

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeVideoModal();
    closeImageModal();
  }
});

/* ========================================
   Image Lightbox Functions
   ======================================== */
(function() {
  // Create lightbox elements if not exists
  if (!document.getElementById('imageModal')) {
    var imageModal = document.createElement('div');
    imageModal.id = 'imageModal';
    imageModal.className = 'image-modal';
    imageModal.onclick = closeImageModal;
    imageModal.innerHTML = `
      <div class="image-modal-content" onclick="event.stopPropagation()">
        <button class="image-close" onclick="closeImageModal()">×</button>
        <img id="lightboxImg" src="" alt="">
      </div>
    `;
    document.body.appendChild(imageModal);
  }
  
  // Add click handlers to gallery images
  document.querySelectorAll(
    '.gallery-item img, .gallery-strip__img, .shanhai-zoomable, .gallery-mosaic-item img, .gallery-duo-item img'
  ).forEach(function (img) {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function () {
      openImageModal(this.src);
    });
  });
})();

function openImageModal(imgSrc) {
  var modal = document.getElementById('imageModal');
  var img = document.getElementById('lightboxImg');
  if (modal && img) {
    img.src = imgSrc;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeImageModal() {
  var modal = document.getElementById('imageModal');
  var img = document.getElementById('lightboxImg');
  if (modal && img) {
    modal.classList.remove('active');
    img.src = '';
    document.body.style.overflow = '';
  }
}

(function initShanhaiHeroSlideshow() {
  function go() {
    var root = document.querySelector('.project-hero--shanhai .bg-slideshow');
    if (!root) return;
    var slides = root.querySelectorAll('.bg-slide');
    if (slides.length < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    var ms = parseInt(root.getAttribute('data-interval') || '7000', 10);
    var i = 0;
    window.setInterval(function () {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, ms);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
