/**
 * VOLD MOTOR — Preloader v4 "Zoom Merge"
 * اسم الموقع يظهر حرفاً حرفاً ← يتكبّر ← يندمج مع الصفحة بسلاسة.
 * Usage: <script src="preloader.js"></script> ← first tag in <head>
 */
(function () {
  'use strict';

  /* مرة واحدة لكل جلسة */
  if (sessionStorage.getItem('_vp')) return;
  sessionStorage.setItem('_vp', '1');

  document.documentElement.style.overflow = 'hidden';

  /* Chillax font (محمّل مسبقاً لضمان ظهوره فوراً) */
  const F = document.createElement('link');
  F.rel = 'stylesheet';
  F.href = 'https://api.fontshare.com/v2/css?f[]=chillax@400,500,600,700&display=swap';
  document.head.appendChild(F);

  const S = document.createElement('style');
  S.textContent = `
  #_vp{position:fixed;inset:0;z-index:999999;background:#09090b;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    transition:opacity .55s ease}
  #_vp-name{display:flex;gap:.02em;direction:ltr;
    font-family:'Chillax',sans-serif;
    font-size:clamp(40px,9vw,108px);
    color:#fff;letter-spacing:.04em;line-height:1;
    transform-origin:center center;
    will-change:transform,opacity}
  .vp-ch{display:inline-block;opacity:0;transform:translateY(.45em) scale(.92);
    transition:opacity .45s ease,transform .55s cubic-bezier(.22,1,.36,1)}
  .vp-ch.sp{width:.4em}
  .vp-ch.blue{color:#2563eb}
  #_vp-tag{margin-top:22px;font-family:'Almarai',sans-serif;font-weight:700;
    font-size:clamp(12px,1.6vw,15px);color:rgba(255,255,255,.45);
    letter-spacing:.35em;opacity:0;transform:translateY(10px);
    transition:opacity .6s ease .1s,transform .6s ease .1s}
  #_vp-tag.in{opacity:1;transform:none}
  /* مرحلة الاندماج: الاسم يتكبر والخلفية تذوب */
  #_vp.merge #_vp-name{
    animation:vpZoom 1.05s cubic-bezier(.65,0,.35,1) forwards}
  #_vp.merge #_vp-tag{opacity:0;transition:opacity .3s ease}
  #_vp.merge{animation:vpFade .6s ease .55s forwards}
  @keyframes vpZoom{
    0%{transform:scale(1);opacity:1}
    100%{transform:scale(14);opacity:0}}
  @keyframes vpFade{to{opacity:0;visibility:hidden}}
  @media (prefers-reduced-motion:reduce){
    .vp-ch{transition:opacity .3s ease}
    #_vp.merge #_vp-name{animation:none;opacity:0;transition:opacity .4s}
    #_vp.merge{animation:vpFade .4s ease forwards}}
  `;
  document.head.appendChild(S);

  const el = document.createElement('div');
  el.id = '_vp';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div id="_vp-name"></div><div id="_vp-tag">نظام إدارة مراكز المركبات</div>`;

  function mount(){ document.body.insertBefore(el, document.body.firstChild); }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  /* بناء الأحرف */
  function build(){
    const row = document.getElementById('_vp-name');
    if (!row) return;
    const WORD = 'VOLD MOTOR';
    [...WORD].forEach((ch,i)=>{
      const s = document.createElement('span');
      s.className = 'vp-ch' + (ch===' ' ? ' sp' : '') + (i>=5 ? ' blue' : '');
      s.textContent = ch===' ' ? '\u00A0' : ch;
      row.appendChild(s);
      setTimeout(()=> {
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          s.style.opacity = '1';
          s.style.transform = 'none';
        }));
      }, 180 + i*60);
    });
    setTimeout(()=>{
      const t = document.getElementById('_vp-tag');
      if (t) t.classList.add('in');
    }, 950);
  }

  /* الاندماج مع الصفحة */
  function merge(){
    const panel = document.getElementById('_vp');
    if (!panel || panel.classList.contains('merge')) return;
    panel.classList.add('merge');
    setTimeout(()=>{
      document.documentElement.style.overflow = '';
      panel.remove();
      S.remove();
      document.dispatchEvent(new CustomEvent('voldPreloaderDone'));
    }, 1250);
  }

  function init(){
    build();
    /* يبدأ الاندماج بعد اكتمال ظهور الاسم */
    setTimeout(merge, 2100);
    /* اضغط للتخطي */
    el.addEventListener('click', merge);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
