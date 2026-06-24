/**
 * mobile-init.js — VOLD MOTOR v4
 * YouTube‑style mobile UX: white bottom nav, drawer sidebar,
 * touch-optimized interactions, admin mobile cards
 */
(function () {
  'use strict';

  /* ── Global responsive layer: tables→cards, 44px touch targets, safe charts ── */
  var RESP_CSS = [
    '@media(max-width:767px){',
    '  table.resp-table thead{position:absolute;left:-9999px;top:-9999px}',
    '  table.resp-table,table.resp-table tbody,table.resp-table tr,table.resp-table td{display:block;width:100%;box-sizing:border-box}',
    '  table.resp-table tr{background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;padding:6px 14px;box-shadow:0 1px 2px rgba(16,24,40,.04)}',
    '  table.resp-table td{padding:9px 0;border:0;text-align:start;white-space:normal}',
    '  table.resp-table td:not(:last-child){border-bottom:1px dashed rgba(17,24,39,.07)}',
    '  table.resp-table td::before{content:attr(data-label);display:block;font-weight:700;color:#6b7280;font-size:.72rem;margin-bottom:4px}',
    '  table.resp-table td[data-label=""]::before,table.resp-table td:empty{display:none}',
    '  table.resp-table td:empty{padding:0}',
    '  button,.btn,.ent-btn,.act-btn,.icon-btn,.svc-del,.filter-btn,[role="button"],.bn-item,select,.type-btn{min-height:44px}',
    '  .act-btn,.icon-btn,.svc-del,.view-btn{min-width:44px}',
    '  .apexcharts-canvas,canvas,svg.apexcharts-svg{max-width:100%!important}',
    '}',
    '#areaChart,#typeDonut,#finDonut,.apexcharts-canvas{width:100%;max-width:100%}'
  ].join('');
  (function () {
    if (document.getElementById('vm-resp-style')) return;
    var s = document.createElement('style'); s.id = 'vm-resp-style'; s.textContent = RESP_CSS;
    (document.head || document.documentElement).appendChild(s);
  })();
  function vmRespTables() {
    document.querySelectorAll('table').forEach(function (t) {
      var ths = t.querySelectorAll('thead th'); if (!ths.length) return;
      var labels = Array.prototype.map.call(ths, function (th) { return th.textContent.trim(); });
      t.classList.add('resp-table');
      t.querySelectorAll('tbody tr').forEach(function (tr) {
        var tds = tr.children;
        for (var i = 0; i < tds.length; i++) tds[i].setAttribute('data-label', labels[i] || '');
      });
    });
  }
  var _respTimer;
  function vmRespSchedule() { clearTimeout(_respTimer); _respTimer = setTimeout(vmRespTables, 250); }
  window.vmRespTables = vmRespTables;

  /* ── SVG Icons ──────────────────────────────────────────────── */
  const ICONS = {
    home:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V21H3z"/><path d="M9 21V12h6v9"/></svg>`,
    pos:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h2M7 12h2M13 8h4M13 12h3"/></svg>`,
    cal:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/></svg>`,
    chart:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    gear:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    admin:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    stats:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    workers:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  };

  /* ── Nav configs by page type ────────────────────────────────── */
  const NAV_SHOP = [
    { href: 'dashboard.html',    icon: ICONS.home,    label: 'الرئيسية',  labelEn: 'Home'      },
    { href: 'appointments.html', icon: ICONS.cal,     label: 'حجوزات',    labelEn: 'Schedule'  },
    { href: 'reports.html',      icon: ICONS.chart,   label: 'تقارير',    labelEn: 'Reports'   },
    { href: 'settings.html',     icon: ICONS.gear,    label: 'إعدادات',   labelEn: 'Settings'  },
  ];

  const NAV_ADMIN = [
    { href: 'admin-vold.html',   icon: ICONS.stats,   label: 'الرئيسية',  labelEn: 'Dashboard' },
    { href: 'admin-vold.html?f=pending',  icon: ICONS.cal, label: 'انتظار', labelEn: 'Pending'  },
    { href: 'admin-vold.html?f=approved', icon: ICONS.admin, label: 'مفعّل', labelEn: 'Active'  },
    { href: 'admin-vold.html?f=rejected', icon: ICONS.gear, label: 'مرفوض', labelEn: 'Rejected' },
  ];

  const NAV_WORKER = [
    { href: 'workers.html',      icon: ICONS.workers, label: 'العمل',     labelEn: 'Work'      },
    { href: 'dashboard.html',    icon: ICONS.home,    label: 'الرئيسية',  labelEn: 'Home'      },
    { href: 'settings.html',     icon: ICONS.gear,    label: 'إعدادات',   labelEn: 'Settings'  },
  ];

  /* ── Detect page & nav type ──────────────────────────────────── */
  const page = (window.location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  const isAdmin  = page === 'admin-vold.html';
  const isWorker = page === 'workers.html';
  const NAV_ITEMS = isAdmin ? NAV_ADMIN : isWorker ? NAV_WORKER : NAV_SHOP;

  /* ── Only inject on mobile ───────────────────────────────────── */
  const isMobile = () => window.innerWidth <= 960;

  document.addEventListener('DOMContentLoaded', function () {

    /* ── 0. Responsive tables: label cells + watch dynamic re-renders ── */
    vmRespTables();
    try { new MutationObserver(vmRespSchedule).observe(document.body, { childList: true, subtree: true }); } catch (e) {}

    /* ── 1. Sidebar overlay backdrop ───────────────────────────── */
    const overlay = document.createElement('div');
    overlay.id = 'mob-overlay';
    overlay.className = 'mob-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);

    /* ── 2. Burger button — open / close sidebar ────────────────── */
    document.querySelectorAll('.burger-btn').forEach(function (btn) {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const sb = document.getElementById('sidebar');
        if (!sb) return;
        const isOpen = sb.classList.contains('open');
        if (isOpen) { closeSidebar(); } else { openSidebar(); }
      });
    });

    /* ── 3. Close sidebar when clicking a nav item ──────────────── */
    const sb = document.getElementById('sidebar');
    if (sb) {
      sb.querySelectorAll('a.nav-item').forEach(function (a) {
        a.addEventListener('click', function () {
          setTimeout(closeSidebar, 150);
        });
      });
    }

    /* ── 4. Enterprise shell: canonical sidebar + white-label + branch switcher ──
       (Mobile bottom-nav removed by design — we rely on the hamburger drawer.) */
    if (!isAdmin && !isWorker) { try { buildShell(); } catch (e) {} }

    /* ── 5. Responsive topbar greeting ──────────────────────────── */
    if (isMobile()) {
      const topbarTitle = document.querySelector('.topbar-title');
      if (topbarTitle) {
        const hr = new Date().getHours();
        const greet = hr < 12 ? 'صباح الخير 🌅' : hr < 17 ? 'مرحباً 👋' : 'مساء الخير 🌙';
        const greetEl = document.createElement('span');
        greetEl.className = 'topbar-greet';
        greetEl.textContent = greet;
        greetEl.style.cssText = 'font-size:.72rem;font-weight:700;color:#6b7280;margin-inline-start:8px;';
        topbarTitle.insertAdjacentElement('afterend', greetEl);
      }
    }

    /* ── 6. Admin table → mobile cards ──────────────────────────── */
    if (isAdmin && isMobile()) {
      setupAdminMobileCards();
    }

    /* ── 7. Scroll reveal animations ────────────────────────────── */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    }

    /* ── 8. iOS: fast click on bottom nav (no 300ms delay) ─────── */
    document.querySelectorAll('.bn-item').forEach(function (el) {
      el.addEventListener('touchstart', function(){}, {passive:true});
    });

    /* ── 9. Table horizontal scroll hint ────────────────────────── */
    if (isMobile()) {
      document.querySelectorAll('.tbl-scroll, .tbl-wrap').forEach(function (wrap) {
        if (wrap.scrollWidth > wrap.clientWidth) {
          const hint = document.createElement('div');
          hint.style.cssText = 'font-size:.7rem;color:#9ca3af;text-align:center;padding:4px 0 8px;';
          hint.textContent = '← اسحب للتنقل بين الأعمدة →';
          wrap.insertAdjacentElement('beforebegin', hint);
        }
      });
    }

  }); /* DOMContentLoaded */

  /* ── Sidebar helpers ─────────────────────────────────────────── */
  function openSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('mob-overlay');
    if (sb) sb.classList.add('open');
    if (ov) ov.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('mob-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
    document.body.style.overflow = '';
  }

  /* ── Admin mobile card renderer ──────────────────────────────── */
  function setupAdminMobileCards() {
    // MutationObserver watches for table renders then converts to cards
    const target = document.getElementById('table-body');
    if (!target) return;

    const obs = new MutationObserver(function () {
      convertTableToCards(target);
    });
    obs.observe(target, { childList: true, subtree: false });
  }

  function convertTableToCards(container) {
    // Only on mobile
    if (!isMobile()) return;
    const table = container.querySelector('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    if (!rows.length) return;

    // Build card list
    const wrap = document.createElement('div');
    wrap.className = 'mob-card-view';
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:16px;';

    rows.forEach(function (row) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 6) return;

      const shopName  = cells[0]?.querySelector('.td-name')?.textContent || '';
      const owner     = cells[0]?.querySelector('.td-sub')?.textContent  || '';
      const phone     = cells[1]?.querySelector('div:first-child')?.textContent || '';
      const email     = cells[1]?.querySelector('.td-sub')?.textContent  || '';
      const location  = cells[2]?.textContent?.trim() || '—';
      const services  = cells[3]?.innerHTML || '';
      const date      = cells[4]?.textContent?.trim() || '—';
      const status    = cells[5]?.innerHTML || '';
      const actions   = cells[6]?.innerHTML || '';

      const card = document.createElement('div');
      card.className = 'req-mob-card';
      card.innerHTML = `
        <div class="req-mob-card-top">
          <div>
            <div class="req-mob-card-name">${esc(shopName)}</div>
            <div class="req-mob-card-sub">${esc(owner)}</div>
          </div>
          <div>${status}</div>
        </div>
        <div class="req-mob-card-meta">
          <span style="font-size:.82rem;color:#374151;">📞 ${esc(phone)}</span>
          <span style="font-size:.82rem;color:#6b7280;">📍 ${esc(location)}</span>
          <span style="font-size:.78rem;color:#9ca3af;">📅 ${esc(date)}</span>
        </div>
        ${services ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${services}</div>` : ''}
        <div class="req-mob-card-actions">${actions}</div>
      `;

      wrap.appendChild(card);
    });

    // Replace table with cards
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
