'use client';

/**
 * VOLD MOTOR — Preloader v4 "Zoom Merge" (React port)
 * اسم الموقع يظهر حرفاً حرفاً ← يتكبّر ← يندمج مع الصفحة بسلاسة.
 * يظهر مرة واحدة لكل جلسة · اضغط للتخطّي.
 * Faithful port of the original legacy preloader.js.
 */
import { useEffect, useRef, useState } from 'react';

const WORD = 'VOLD MOTOR';

export default function Preloader() {
  const [active, setActive] = useState(false); // overlay mounted
  const [merge, setMerge] = useState(false); // zoom-merge phase
  const [shownCount, setShownCount] = useState(0); // letters revealed so far
  const [tagIn, setTagIn] = useState(false);
  const timers = useRef([]);

  // decide once on mount whether to play (once per session)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('_vp')) return;
    sessionStorage.setItem('_vp', '1');

    // preload Chillax font so letters render immediately
    const f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://api.fontshare.com/v2/css?f[]=chillax@400,500,600,700&display=swap';
    document.head.appendChild(f);

    document.documentElement.style.overflow = 'hidden';
    setActive(true);

    const add = (fn, ms) => timers.current.push(setTimeout(fn, ms));

    // reveal letters one-by-one (180ms + i*60ms)
    [...WORD].forEach((_, i) => add(() => setShownCount((c) => Math.max(c, i + 1)), 180 + i * 60));
    // tagline in
    add(() => setTagIn(true), 950);
    // begin zoom-merge after the name finishes
    add(() => setMerge(true), 2100);
    // unlock scroll + unmount after merge completes
    add(() => {
      document.documentElement.style.overflow = '';
      setActive(false);
      document.dispatchEvent(new CustomEvent('voldPreloaderDone'));
    }, 2100 + 1250);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      document.documentElement.style.overflow = '';
      f.remove();
    };
  }, []);

  function skip() {
    if (merge) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShownCount(WORD.length);
    setMerge(true);
    timers.current.push(
      setTimeout(() => {
        document.documentElement.style.overflow = '';
        setActive(false);
        document.dispatchEvent(new CustomEvent('voldPreloaderDone'));
      }, 1250)
    );
  }

  if (!active) return null;

  return (
    <div id="_vp" className={merge ? 'merge' : ''} aria-hidden="true" onClick={skip}>
      <div id="_vp-name">
        {[...WORD].map((ch, i) => (
          <span
            key={i}
            className={`vp-ch${ch === ' ' ? ' sp' : ''}${i >= 5 ? ' blue' : ''}${i < shownCount ? ' in' : ''}`}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </div>
      <div id="_vp-tag" className={tagIn ? 'in' : ''}>
        نظام إدارة مراكز المركبات
      </div>

      <style jsx global>{`
        #_vp {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #09090b;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: opacity 0.55s ease;
        }
        #_vp-name {
          display: flex;
          gap: 0.02em;
          direction: ltr;
          font-family: 'Chillax', sans-serif;
          font-size: clamp(40px, 9vw, 108px);
          color: #fff;
          letter-spacing: 0.04em;
          line-height: 1;
          transform-origin: center center;
          will-change: transform, opacity;
        }
        .vp-ch {
          display: inline-block;
          opacity: 0;
          transform: translateY(0.45em) scale(0.92);
          transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .vp-ch.in {
          opacity: 1;
          transform: none;
        }
        .vp-ch.sp {
          width: 0.4em;
        }
        .vp-ch.blue {
          color: #2563eb;
        }
        #_vp-tag {
          margin-top: 22px;
          font-family: var(--font-tajawal), 'Almarai', sans-serif;
          font-weight: 700;
          font-size: clamp(12px, 1.6vw, 15px);
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.35em;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
        }
        #_vp-tag.in {
          opacity: 1;
          transform: none;
        }
        #_vp.merge #_vp-name {
          animation: vpZoom 1.05s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        #_vp.merge #_vp-tag {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        #_vp.merge {
          animation: vpFade 0.6s ease 0.55s forwards;
        }
        @keyframes vpZoom {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(14);
            opacity: 0;
          }
        }
        @keyframes vpFade {
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .vp-ch {
            transition: opacity 0.3s ease;
          }
          #_vp.merge #_vp-name {
            animation: none;
            opacity: 0;
            transition: opacity 0.4s;
          }
          #_vp.merge {
            animation: vpFade 0.4s ease forwards;
          }
        }
      `}</style>
    </div>
  );
}
