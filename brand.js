/* VOLD MOTOR — unified brand logo injector (transparent, no background).
   Injects the official logo (white wordmark + blue swoosh) and auto-picks the
   white version on dark surfaces or the dark-text version on light surfaces,
   re-evaluating on theme changes. */
(function () {
  var WHITE = '/logo-white.png'; // dark surfaces
  var DARK  = '/logo.png';       // light surfaces
  var SELS = '.logo,.vm-logo,.yt-sidebar-logo,.sidebar-logo,.sp-logo,.lg-logo,.tb-logo,.topbar-logo,.topbar-logo-word,.brand-logo,.logo-mark';
  var SIDEBAR_SELS = '.yt-sidebar-logo,.sidebar-logo';

  /* ── White-label: custom logo (data URL) stored per device ── */
  function customLogo() { try { return localStorage.getItem('vm_logo') || ''; } catch (e) { return ''; } }

  /* ── Theme customizer: 5 premium background tints ── */
  var THEMES = {
    slate:    { bg: '#eef2f7', bg2: '#e4e9f0' },
    zinc:     { bg: '#f4f4f5', bg2: '#e9e9eb' },
    neutral:  { bg: '#f5f5f4', bg2: '#eaeae8' },
    bluegray: { bg: '#e9eff5', bg2: '#dde7f1' },
    stone:    { bg: '#f5f3ef', bg2: '#ebe8e2' },
    default:  { bg: '#f9f9f9', bg2: '#f3f4f6' }
  };
  function applyTheme(key) {
    var t = THEMES[key] || THEMES['default'];
    var r = document.documentElement;
    r.style.setProperty('--bg', t.bg);
    r.style.setProperty('--bg2', t.bg2);
    r.setAttribute('data-vm-theme', key || 'default');
  }
  function bootTheme() {
    var k; try { k = localStorage.getItem('vm_theme'); } catch (e) {}
    applyTheme(k || 'default');
  }
  window.vmThemes = THEMES;
  window.vmApplyTheme = function (key) { try { localStorage.setItem('vm_theme', key); } catch (e) {} applyTheme(key); };
  window.vmSetLogo = function (dataUrl) {
    try { if (dataUrl) localStorage.setItem('vm_logo', dataUrl); else localStorage.removeItem('vm_logo'); } catch (e) {}
    paint();
  };

  function injectStyle() {
    if (document.getElementById('vm-brand-style')) return;
    var s = document.createElement('style');
    s.id = 'vm-brand-style';
    s.textContent =
      '.vm-logo-img{height:30px;width:auto;display:block;flex:none}' +
      '.yt-sidebar-logo .vm-logo-img,.sidebar-logo .vm-logo-img{height:27px}' +
      '.sp-logo .vm-logo-img{height:46px}.lg-logo .vm-logo-img{height:34px}' +
      '.vm-logo-custom{height:40px!important;max-width:160px;object-fit:contain;border-radius:8px}';
    document.head.appendChild(s);
  }

  function bgOf(el) {
    var n = el;
    while (n && n.nodeType === 1) {
      var c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') return c;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  }

  function lum(c) {
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 1;
    var p = m[1].split(',').map(parseFloat);
    if (p.length > 3 && p[3] === 0) return 1;
    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
  }

  function paint() {
    var custom = customLogo();
    document.querySelectorAll(SELS).forEach(function (el) {
      var isSidebar = el.matches && el.matches(SIDEBAR_SELS);
      var src = (isSidebar && custom) ? custom : (lum(bgOf(el)) < 0.5 ? WHITE : DARK);
      var cls = (isSidebar && custom) ? 'vm-logo-img vm-logo-custom' : 'vm-logo-img';
      el.dataset.vmInit = '1';
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.innerHTML = '<img class="' + cls + '" alt="الشعار" src="' + src + '">';
    });
  }

  function boot() {
    bootTheme();
    injectStyle();
    paint();
    try {
      var mo = new MutationObserver(function () { setTimeout(paint, 30); });
      var opt = { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] };
      mo.observe(document.documentElement, opt);
      mo.observe(document.body, opt);
    } catch (e) {}
  }

  window.vmRefreshLogo = paint;
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
