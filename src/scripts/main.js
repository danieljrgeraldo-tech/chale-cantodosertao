(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = finePointer && !reduceMotion;

  var win = window;
  var doc = document;
  var body = doc.body;
  var html = doc.documentElement;

  var smoothWrap = $('#smoothWrap');
  var vh = win.innerHeight;

  /* ============================================================
     SMOOTH SCROLL
     ============================================================ */
  var smooth = {
    enabled: canAnimate,
    current: 0,
    target: 0,
    raf: null,

    init: function () {
      this.current = this.target = win.scrollY;
      if (!this.enabled) return;
      body.classList.add('has-smooth');
      this.resize();
      win.addEventListener('scroll', this.onScroll, { passive: true });
      win.addEventListener('resize', this.onResize);
      this.raf = requestAnimationFrame(this.loop.bind(this));
    },

    onScroll: function () { smooth.target = win.scrollY; },
    onResize: function () { smooth.resize(); },

    resize: function () {
      var h = smoothWrap.scrollHeight;
      body.style.height = h + 'px';
      vh = win.innerHeight;
    },

    loop: function () {
      this.current = lerp(this.current, this.target, 0.085);
      if (Math.abs(this.target - this.current) < 0.1) this.current = this.target;
      smoothWrap.style.transform = 'translate3d(0, ' + (-this.current).toFixed(2) + 'px, 0)';
      render();
      this.raf = requestAnimationFrame(this.loop.bind(this));
    }
  };

  function getY() { return smooth.enabled ? smooth.current : win.scrollY; }

  function offsetTop(el) {
    var top = 0;
    while (el && el !== smoothWrap && el !== body) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  /* ============================================================
     PRELOADER
     ============================================================ */
  var preloader = $('#preloader');
  var preBar = $('#preloaderBar');
  var preCount = $('#preloaderCount');

  function runPreloader() {
    var start = null;
    var dur = reduceMotion ? 60 : 1500;
    var target = 100;

    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(eased * target);
      preBar.style.width = val + '%';
      preCount.textContent = String(val).padStart(2, '0');
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        finishPreloader();
      }
    }
    requestAnimationFrame(step);
  }

  function finishPreloader() {
    preloader.classList.add('preloader--done');
    body.classList.add('loaded');
    var title = $('.hero__title');
    if (title) title.classList.add('is-in');
    setTimeout(function () {
      preloader.classList.add('preloader--gone');
    }, 1300);
  }

  /* ============================================================
     CURSOR
     ============================================================ */
  var cursorEl = $('#cursor');
  var cursorDot = $('.cursor__dot', cursorEl);
  var cursorRing = $('.cursor__ring', cursorEl);
  var mx = -100, my = -100, rx = -100, ry = -100;

  if (canAnimate && cursorEl) {
    win.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
    });
    win.addEventListener('mousedown', function () { cursorEl.classList.add('is-down'); });
    win.addEventListener('mouseup', function () { cursorEl.classList.remove('is-down'); });

    doc.addEventListener('mouseover', function (e) {
      var t = e.target.closest('[data-cursor], a, button, .amenity, .g-item');
      if (!t) { cursorEl.classList.remove('is-hover'); return; }
      var kind = t.getAttribute && t.getAttribute('data-cursor');
      cursorEl.classList.toggle('is-gallery', kind === 'gallery');
      cursorEl.classList.add('is-hover');
    });
    doc.addEventListener('mouseout', function (e) {
      var t = e.target.closest('[data-cursor], a, button, .amenity, .g-item');
      if (!t) return;
      cursorEl.classList.remove('is-hover', 'is-gallery');
    });

    (function cursorLoop() {
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      cursorDot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      cursorRing.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(cursorLoop);
    })();
  }

  /* ============================================================
     MASTER RENDER (scroll-driven)
     ============================================================ */
  var hero = $('.hero');
  var heroLayers = $$('[data-hero]');
  var heroContent = $('.hero__content');
  var parallaxEls = $$('[data-parallax]');
  var progressBar = $('#progress span');
  var nav = $('#nav');
  var toTop = $('#toTop');

  var expScroll = $('#expScroll');
  var expPin = $('#expPin');
  var expTrack = $('#expTrack');
  var expProgress = $('#expProgress');

  var lastY = 0;
  var navLastDir = 0;

  function render() {
    var y = getY();

    if (progressBar) {
      var docH = Math.max(body.scrollHeight, html.scrollHeight);
      progressBar.style.width = (clamp(y / (docH - vh) * 100, 0, 100)).toFixed(2) + '%';
    }

    if (hero) {
      var hs = 1 + Math.min(y, 800) * 0.00012;
      var heroMedia = $('.hero__media');
      if (heroMedia) heroMedia.style.transform = 'scale(' + hs + ')';
      heroLayers.forEach(function (layer) {
        var speed = parseFloat(layer.getAttribute('data-hero')) || 0.15;
        layer.style.transform = 'translate3d(0,' + (y * speed).toFixed(2) + 'px,0)';
      });
      if (heroContent) {
        var fade = clamp(1 - y / 480, 0, 1);
        heroContent.style.opacity = fade.toFixed(3);
        heroContent.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(2) + 'px,0)';
      }
    }

    if (parallaxEls.length) {
      var vc = y + vh * 0.55;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        var base = el.getAttribute('data-parallax-base') || '';
        var center = offsetTop(el) + el.offsetHeight / 2;
        var dist = center - vc;
        el.style.transform = 'translate3d(0,' + (-dist * speed).toFixed(2) + 'px,0)' + (base ? ' ' + base : '');
      });
    }

    if (expScroll && expTrack && win.innerWidth > 960) {
      var top = offsetTop(expScroll);
      var range = expScroll.offsetHeight - vh;
      var p = range > 0 ? clamp((y - top) / range, 0, 1) : 0;
      expPin.style.transform = 'translate3d(0,' + (p * range).toFixed(2) + 'px,0)';
      var maxX = Math.max(0, expTrack.scrollWidth - win.innerWidth);
      expTrack.style.transform = 'translate3d(' + (-p * maxX).toFixed(2) + 'px,0,0)';
      if (expProgress) expProgress.style.width = (p * 100).toFixed(2) + '%';
    } else if (expPin && expTrack) {
      expPin.style.transform = '';
      expTrack.style.transform = '';
    }

    if (nav) {
      nav.classList.toggle('is-solid', y > 60);
      nav.classList.toggle('is-hidden', y > 300 && y > lastY + 4);
      if (y < lastY - 4 || y < 60) nav.classList.remove('is-hidden');
      lastY = y;
    }

    if (toTop) toTop.classList.toggle('is-visible', y > 700);

    setActiveNav(y);
  }

  /* ============================================================
     NAV
     ============================================================ */
  var sections = $$('section[id]');
  var navLinks = $$('.nav__link');

  function setActiveNav(y) {
    var probe = y + vh * 0.4;
    var currentId = null;
    sections.forEach(function (sec) {
      if (offsetTop(sec) <= probe) currentId = sec.id;
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      link.classList.toggle('is-active', href === '#' + currentId);
    });
  }

  /* ============================================================
     MENU
     ============================================================ */
  var burger = $('#burger');
  var menu = $('#menu');

  function toggleMenu(force) {
    var open = typeof force === 'boolean' ? force : !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    html.classList.toggle('lock', open);
  }

  burger.addEventListener('click', function () { toggleMenu(); });

  $$('.menu__link', menu).forEach(function (link) {
    link.addEventListener('click', function () { toggleMenu(false); });
  });

  /* ============================================================
     ANCHOR SCROLL
     ============================================================ */
  function scrollToTarget(target) {
    var top = 0;
    if (target && target.id !== 'inicio') top = offsetTop(target);
    win.scrollTo({ top: top, behavior: 'auto' });
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = doc.getElementById(id);
    if (!target) return;
    e.preventDefault();
    toggleMenu(false);
    scrollToTarget(target);
  });

  /* ============================================================
     REVEAL (IntersectionObserver)
     ============================================================ */
  function initReveals() {
    var els = $$('.reveal, [data-reveal], .section-title, .line').filter(function (el) {
      return !el.closest('.hero');
    });
    if (!('IntersectionObserver' in win) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     COUNTERS
     ============================================================ */
  function initCounters() {
    var counters = $$('[data-count]');
    if (!counters.length) return;
    if (reduceMotion) {
      counters.forEach(function (c) { c.textContent = c.getAttribute('data-count') + (c.getAttribute('data-suffix') || ''); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        animateCount(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  }

  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null;
    var dur = 1700;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ============================================================
     TILT
     ============================================================ */
  function initTilt() {
    if (!canAnimate) return;
    $$('[data-tilt]').forEach(function (el) {
      var base = el.getAttribute('data-tilt-base') || '';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = base + ' perspective(900px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = base;
      });
    });
  }

  /* ============================================================
     MAGNETIC
     ============================================================ */
  function initMagnetic() {
    if (!canAnimate) return;
    $$('[data-magnetic]').forEach(function (el) {
      var strength = 0.28;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * strength;
        var dy = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ============================================================
     REVIEWS CAROUSEL
     ============================================================ */
  var revViewport = $('#revViewport');
  var revTrack = $('#revTrack');
  var revPrev = $('#revPrev');
  var revNext = $('#revNext');
  var revIndex = $('#revIndex');
  var revCards = revTrack ? $$('.review', revTrack) : [];
  var revIndexPos = 0;
  var revStep = 0;

  function revMeasure() {
    if (!revTrack || !revCards.length) return;
    var card = revCards[0];
    var gap = 22;
    var r = card.getBoundingClientRect();
    revStep = r.width + gap;
  }

  function revGo(i) {
    revIndexPos = clamp(i, 0, revCards.length - 1);
    revTrack.style.transform = 'translate3d(' + (-revIndexPos * revStep).toFixed(2) + 'px,0,0)';
    if (revIndex) revIndex.textContent = String(revIndexPos + 1).padStart(2, '0');
  }

  if (revTrack && revCards.length) {
    if (revPrev) revPrev.addEventListener('click', function () { revGo(revIndexPos - 1); });
    if (revNext) revNext.addEventListener('click', function () { revGo(revIndexPos + 1); });

    var isDown = false, startX = 0, deltaX = 0, baseX = 0, dragging = false;
    revViewport.addEventListener('pointerdown', function (e) {
      isDown = true;
      startX = e.clientX;
      baseX = revIndexPos * revStep;
      revTrack.classList.add('is-dragging');
      revViewport.classList.add('is-dragging');
    });
    win.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      deltaX = e.clientX - startX;
      dragging = Math.abs(deltaX) > 6;
      if (dragging) revTrack.style.transform = 'translate3d(' + (-(baseX - deltaX)).toFixed(2) + 'px,0,0)';
    });
    win.addEventListener('pointerup', function () {
      if (!isDown) return;
      isDown = false;
      revTrack.classList.remove('is-dragging');
      revViewport.classList.remove('is-dragging');
      var snapped = Math.round((baseX - deltaX) / revStep);
      revGo(snapped);
      deltaX = 0;
    });
  }

  /* ============================================================
     LIGHTBOX
     ============================================================ */
  var lightbox = $('#lightbox');
  var lightboxImg = $('#lightboxImg');
  var lightboxCaption = $('#lightboxCaption');
  var lightboxCount = $('#lightboxCount');
  var gItems = $$('.g-item');
  var lbIndex = 0;

  function lbOpen(i) {
    if (!gItems.length) return;
    lbIndex = (i + gItems.length) % gItems.length;
    var item = gItems[lbIndex];
    lightboxImg.src = item.getAttribute('href');
    lightboxImg.alt = item.querySelector('img').alt || '';
    lightboxCaption.textContent = item.getAttribute('data-caption') || '';
    lightboxCount.textContent = String(lbIndex + 1).padStart(2, '0') + ' / ' + String(gItems.length).padStart(2, '0');
    preloadLb(lbIndex + 1);
    preloadLb(lbIndex - 1);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    html.classList.add('lock');
  }

  function lbClose() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    html.classList.remove('lock');
  }

  function preloadLb(i) {
    if (!gItems.length) return;
    var item = gItems[(i + gItems.length) % gItems.length];
    var img = new Image();
    img.src = item.getAttribute('href');
  }

  gItems.forEach(function (item, i) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      lbOpen(i);
    });
  });

  $('#lightboxClose').addEventListener('click', lbClose);
  $('#lightboxPrev').addEventListener('click', function (e) { e.stopPropagation(); lbOpen(lbIndex - 1); });
  $('#lightboxNext').addEventListener('click', function (e) { e.stopPropagation(); lbOpen(lbIndex + 1); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) lbClose(); });

  win.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') lbOpen(lbIndex - 1);
    if (e.key === 'ArrowRight') lbOpen(lbIndex + 1);
  });

  /* ============================================================
     FAQ
     ============================================================ */
  $$('.faq__item').forEach(function (item) {
    var btn = $('.faq__q', item);
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      $$('.faq__item.is-open').forEach(function (el) {
        el.classList.remove('is-open');
        $('.faq__q', el).setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ============================================================
     BOOKING FORM
     ============================================================ */
  var bookingForm = $('#bookingForm');
  if (bookingForm) {
    var today = new Date();
    var todayStr = today.toISOString().split('T')[0];
    var checkinInput = $('#checkin');
    var checkoutInput = $('#checkout');
    checkinInput.min = todayStr;
    checkinInput.value = todayStr;
    var tomorrow = new Date(today.getTime() + 86400000);
    checkoutInput.min = tomorrow.toISOString().split('T')[0];
    checkoutInput.value = tomorrow.toISOString().split('T')[0];

    checkinInput.addEventListener('change', function () {
      if (checkoutInput.value <= checkinInput.value) {
        var d = new Date(checkinInput.value);
        d.setDate(d.getDate() + 1);
        checkoutInput.value = d.toISOString().split('T')[0];
      }
      checkoutInput.min = checkinInput.value;
    });

    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ci = checkinInput.value;
      var co = checkoutInput.value;
      var ga = $('#guests').value;
      if (!ci || !co) return;
      if (co <= ci) {
        checkoutInput.focus();
        return;
      }
      var url = 'https://www.booking.com/hotel/br/chale-canto-do-sertao.pt-br.html'
        + '?checkin=' + ci + '&checkout=' + co + '&group_adults=' + ga;
      win.open(url, '_blank', 'noopener');
    });
  }

  /* ============================================================
     MISC
     ============================================================ */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function onResize() {
    vh = win.innerHeight;
    if (smooth.enabled) smooth.resize();
    revMeasure();
    revGo(revIndexPos);
    if (expScroll && expTrack && win.innerWidth > 960) {
      var top = offsetTop(expScroll);
      var range = expScroll.offsetHeight - vh;
      var p = clamp((getY() - top) / (range || 1), 0, 1);
      expTrack.style.transform = 'translate3d(' + (-p * Math.max(0, expTrack.scrollWidth - win.innerWidth)).toFixed(2) + 'px,0,0)';
    }
  }

  win.addEventListener('resize', onResize);
  win.addEventListener('load', function () {
    if (smooth.enabled) smooth.resize();
    revMeasure();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (smooth.enabled) smooth.resize();
    });
  }
  if (win.ResizeObserver && smoothWrap) {
    new ResizeObserver(function () {
      if (smooth.enabled) smooth.resize();
    }).observe(smoothWrap);
  }

  smooth.init();
  if (!smooth.enabled) {
    win.addEventListener('scroll', render, { passive: true });
    render();
  }
  initReveals();
  initCounters();
  initTilt();
  initMagnetic();
  revMeasure();
  revGo(0);
  runPreloader();
})();
