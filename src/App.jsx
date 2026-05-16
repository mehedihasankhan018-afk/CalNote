import { useState, useRef, useMemo, useEffect, useCallback } from "react";

const BN = "০১২৩৪৫৬৭৮৯";
const toBn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
const toEn = (s) =>
  String(s)
    .replace(/[০-৯]/g, (d) => BN.indexOf(d))
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");

function safeCalc(expr) {
  const clean = toEn(expr).replace(/[^0-9+\-*/.() ]/g, "").trim();
  if (!clean) return null;
  try {
    const tokens = clean.match(/(\d+\.?\d*)|([+\-*/()])/g);
    if (!tokens) return null;
    let i = 0;
    const peek    = () => tokens[i];
    const consume = () => tokens[i++];
    const parseNum = () => {
      const t = consume();
      if (t === "(") { const v = parseAdd(); consume(); return v; }
      if (t === undefined) return 0;
      return parseFloat(t);
    };
    const parseMul = () => {
      let v = parseNum();
      while (peek() === "*" || peek() === "/") {
        const op = consume(), r = parseNum();
        v = op === "*" ? v * r : r !== 0 ? v / r : NaN;
      }
      return v;
    };
    const parseAdd = () => {
      let v = parseMul();
      while (peek() === "+" || peek() === "-") {
        const op = consume(), r = parseMul();
        v = op === "+" ? v + r : v - r;
      }
      return v;
    };
    const result = parseAdd();
    return isFinite(result) ? result : null;
  } catch { return null; }
}

function evalLine(raw) {
  const en = toEn(raw);
  if (/[+\-*\/]/.test(en)) return safeCalc(en);
  const m = en.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function calcTotal(arr) {
  let s = 0;
  arr.forEach((l) => { const v = evalLine(l); if (v !== null && !isNaN(v)) s += v; });
  return s;
}

function fmtNum(n) {
  if (n === null || isNaN(n)) return "";
  const sign = n < 0 ? "−" : "";
  const abs  = Math.abs(n);
  const str  = Number.isInteger(abs) ? String(abs) : abs.toFixed(4).replace(/\.?0+$/, "");
  return sign + toBn(str);
}

/* ── Safe localStorage wrapper ── */
const STORE_KEY = "calnote_v1";
function loadData() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveData(obj) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  } catch {}
}

/* ── Breathing logo ── */
function BreatheLogo() {
  const parts = [
    { ch: "ক্যা", delay: 0   },
    { ch: "ল",    delay: 0.4 },
    { ch: "নো",   delay: 0.8 },
    { ch: "ট",    delay: 1.2 },
  ];
  return (
    <span style={{ display: "flex", alignItems: "baseline" }}>
      {parts.map(({ ch, delay }) => (
        <span key={ch + delay} style={{
          display: "inline-block",
          fontFamily: "'Atma', sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "0.5px",
          color: "#c8c4bc",
          animationName: "wBreath",
          animationDuration: "6s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDelay: `${delay}s`,
          lineHeight: 1,
        }}>{ch}</span>
      ))}
    </span>
  );
}

export default function CalNote() {
  const saved = loadData();
  const [title, setTitle]   = useState(saved?.title ?? "আমার হিসাব");
  const [lines, setLines]   = useState(
    Array.isArray(saved?.lines) && saved.lines.length > 0 ? saved.lines : [""]
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [totalPulse, setTotalPulse] = useState(false);

  const refsArr    = useRef([]);
  const saveTimer  = useRef(null);
  const pulseTimer = useRef(null);
  const prevTotal  = useRef(0);

  const total       = useMemo(() => calcTotal(lines), [lines]);
  const lineResults = useMemo(() =>
    lines.map((l) => {
      const en = toEn(l);
      if (!/[+\-*\/]/.test(en)) return null;
      return evalLine(l);
    }), [lines]);

  /* online/offline */
  useEffect(() => {
    const goOn  = () => setIsOnline(true);
    const goOff = () => setIsOnline(false);
    window.addEventListener("online",  goOn);
    window.addEventListener("offline", goOff);
    return () => {
      window.removeEventListener("online",  goOn);
      window.removeEventListener("offline", goOff);
    };
  }, []);

  /* total pulse */
  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      setTotalPulse(true);
      clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setTotalPulse(false), 700);
    }
  }, [total]);

  useEffect(() => {
    refsArr.current = refsArr.current.slice(0, lines.length);
  }, [lines.length]);

  /* mobile vh fix */
  useEffect(() => {
    const setVh = () =>
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  /* PWA + meta setup */
  useEffect(() => {
    try {
      document.title = "CalNote";

      let vp = document.querySelector("meta[name=viewport]");
      if (!vp) { vp = document.createElement("meta"); vp.name = "viewport"; document.head.appendChild(vp); }
      vp.content = "width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover";

      let tc = document.querySelector("meta[name=theme-color]");
      if (!tc) { tc = document.createElement("meta"); tc.name = "theme-color"; document.head.appendChild(tc); }
      tc.content = "#0e0e0d";

      if (!document.querySelector("link[rel=manifest]")) {
        const l = document.createElement("link"); l.rel = "manifest"; l.href = "/manifest.json";
        document.head.appendChild(l);
      }

      [["apple-mobile-web-app-capable","yes"],
       ["apple-mobile-web-app-status-bar-style","black-translucent"],
       ["apple-mobile-web-app-title","CalNote"]].forEach(([n, c]) => {
        let m = document.querySelector(`meta[name="${n}"]`);
        if (!m) { m = document.createElement("meta"); m.name = n; document.head.appendChild(m); }
        m.content = c;
      });

      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch {}
  }, []);

  const triggerSave = useCallback((t, l) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveData({ title: t, lines: l }), 600);
  }, []);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleTitleChange = (e) => {
    const v = e.target.value; setTitle(v); triggerSave(v, lines);
  };

  const handleLineChange = (i, e) => {
    const nl = [...lines]; nl[i] = e.target.value;
    setLines(nl); autoResize(e.target); triggerSave(title, nl);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const el  = refsArr.current[i];
      const pos = el?.selectionStart ?? lines[i].length;
      const nl  = [...lines.slice(0, i), lines[i].slice(0, pos), lines[i].slice(pos), ...lines.slice(i + 1)];
      setLines(nl); triggerSave(title, nl);
      setTimeout(() => {
        const next = refsArr.current[i + 1];
        if (next) { next.focus(); next.setSelectionRange(0, 0); autoResize(next); }
      }, 0);
    }
    if (e.key === "Backspace") {
      const el  = refsArr.current[i];
      const pos = el?.selectionStart ?? 0;
      if (pos === 0 && i > 0) {
        e.preventDefault();
        const pLen = lines[i - 1].length;
        const nl   = [...lines.slice(0, i - 1), lines[i - 1] + lines[i], ...lines.slice(i + 1)];
        setLines(nl); triggerSave(title, nl);
        setTimeout(() => {
          const prev = refsArr.current[i - 1];
          if (prev) { prev.focus(); prev.setSelectionRange(pLen, pLen); autoResize(prev); }
        }, 0);
      }
    }
  };

  /* date */
  const now = new Date();
  const bnM = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
               "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  const bnD = ["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"];
  const dateFull = `${toBn(now.getDate())} ${bnM[now.getMonth()]}, ${toBn(now.getFullYear())}`;
  const dayName  = bnD[now.getDay()];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Atma:wght@300;400;500;600;700&display=swap');

        /* ── Hard reset ── */
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          margin: 0; padding: 0;
        }

        /*
         * Root dark fill — prevents ANY white edge on:
         *   • iOS overscroll / rubber-band bounce
         *   • Android status bar area
         *   • Landscape safe-area gutters
         */
        :root { color-scheme: dark; }

        html {
          background: #0e0e0d;
          /* iOS: fill behind status bar */
          min-height: -webkit-fill-available;
          min-height: 100%;
        }

        body {
          background: #0e0e0d;
          min-height: 100vh;
          min-height: -webkit-fill-available;
          min-height: calc(var(--vh, 1vh) * 100);
          overscroll-behavior: none;
          /* Push content below notch; background fills the notch itself */
          padding-top:    env(safe-area-inset-top,    0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          padding-left:   env(safe-area-inset-left,   0px);
          padding-right:  env(safe-area-inset-right,  0px);
        }

        /* Kill all native input styling & green/blue outlines */
        input, textarea, button, select {
          outline: none !important;
          -webkit-appearance: none;
          appearance: none;
          border: none;
        }
        input:focus, textarea:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        textarea:invalid          { box-shadow: none !important; }
        textarea:focus-visible    { outline: none !important; }

        /* Chrome autofill dark fix */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #1a1a19 inset !important;
          -webkit-text-fill-color: #ddd9d0 !important;
        }

        /* ── Animations ── */
        @keyframes wBreath {
          0%, 100% { font-weight:700; opacity:1;   }
          35%      { font-weight:300; opacity:0.4; }
          65%      { font-weight:700; opacity:1;   }
        }
        @keyframes totalPop {
          0%   { transform: scale(1);   }
          45%  { transform: scale(1.1); }
          100% { transform: scale(1);   }
        }

        /* ── Page shell ── */
        .cn-page {
          min-height: 100vh;
          min-height: calc(var(--vh, 1vh) * 100);
          background: #0e0e0d;
          display: flex;
          justify-content: center;
          font-family: 'Atma', sans-serif;
          overscroll-behavior: none;
          /*
           * Content padding accounts for safe areas PLUS visual breathing room.
           * The background already fills safe areas via body padding above.
           */
          padding-top:    calc(env(safe-area-inset-top,    0px) + 36px);
          padding-left:   calc(env(safe-area-inset-left,   0px) + 18px);
          padding-right:  calc(env(safe-area-inset-right,  0px) + 18px);
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
        }

        .cn-wrap {
          width: 100%; max-width: 420px;
          display: flex; flex-direction: column; gap: 18px;
        }

        /* ── Header ── */
        .cn-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
        }

        .cn-date-block {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 3px;
        }
        /* Atma + letter-spacing renders Bengali conjuncts well enough at small sizes */
        .cn-date-main {
          font-family: 'Atma', sans-serif;
          font-size: 12.5px; font-weight: 600;
          color: #6a6660;
          white-space: nowrap; line-height: 1.25;
          letter-spacing: 0.25px;
        }
        .cn-date-day {
          font-family: 'Atma', sans-serif;
          font-size: 11.5px; font-weight: 600;
          color: #7a7570; line-height: 1.25;
          letter-spacing: 0.25px;
        }

        /* ── Card ── */
        .cn-paper {
          background: #1a1a19;
          border-radius: 20px;
          border: 1px solid #272624;
          box-shadow:
            0 1px 2px  rgba(0,0,0,.55),
            0 6px 20px rgba(0,0,0,.55),
            0 24px 52px rgba(0,0,0,.45),
            inset 0 1px 0 rgba(255,255,255,.04);
          overflow: hidden;
        }

        /* ── Title row ── */
        .cn-title-row {
          padding: 18px 20px 14px;
          border-bottom: 1px solid #252422;
        }
        .cn-title-input {
          width: 100%; background: transparent;
          border: none !important; outline: none !important;
          font-family: 'Atma', sans-serif;
          font-size: 20px; font-weight: 600;
          color: #6a6660;
          line-height: 1.45;
          caret-color: #555;
        }
        .cn-title-input::placeholder { color: #323030; }

        /* ── Line rows ── */
        .cn-lines { padding: 4px 0 6px; }

        .cn-row {
          display: flex; align-items: flex-start;
          border-bottom: 1px solid #201f1e;
          transition: background .12s;
        }
        .cn-row:last-child   { border-bottom: none; }
        .cn-row:focus-within { background: #1f1f1e; }

        .cn-num {
          width: 42px; flex-shrink: 0; padding-top: 13px;
          display: flex; justify-content: center;
          font-family: 'Atma', sans-serif;
          font-size: 11px; font-weight: 600; color: #353331;
          user-select: none; pointer-events: none;
        }

        /* BIGGER text for body lines, better contrast */
        .cn-input {
          flex: 1; background: transparent;
          border: none !important; outline: none !important;
          box-shadow: none !important;
          -webkit-border-radius: 0;
          resize: none; overflow: hidden;
          font-family: 'Atma', sans-serif;
          font-size: 18px;          /* increased from 16px */
          font-weight: 400;
          line-height: 1.8;
          color: #ddd9d0;           /* high-contrast warm white */
          padding: 10px 8px 10px 0;
          min-height: 48px;
          caret-color: #666;
          word-break: break-word;
        }
        .cn-input::placeholder { color: #2b2a28; }
        .cn-input::-webkit-scrollbar { display: none; }

        /* ── Per-line result ── */
        .cn-line-result {
          align-self: center; margin-right: 14px;
          font-family: 'Atma', sans-serif;
          font-size: 13px; font-weight: 600; color: #52504d;
          white-space: nowrap;
          opacity: 0; transform: translateX(4px);
          transition: opacity .2s, transform .2s;
          pointer-events: none;
        }
        .cn-line-result.show { opacity: 1; transform: translateX(0); }

        /* ── Total bar ── */
        .cn-total-bar {
          border-top: 1px solid #252422;
          padding: 14px 20px 18px;
          display: flex; justify-content: flex-end; align-items: center;
        }
        .cn-total-value {
          font-family: 'Atma', sans-serif;
          font-size: 36px; font-weight: 700;
          color: #c8c4bc;
          line-height: 1; letter-spacing: -.5px;
          display: inline-block;
        }
        .cn-total-value.pulse {
          animation: totalPop .38s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .cn-total-value.negative { color: #bf6060; }

        /* ── Responsive ── */
        @media (max-width: 380px) {
          .cn-total-value { font-size: 30px; }
          .cn-input       { font-size: 17px; }
          .cn-title-input { font-size: 18px; }
        }
      `}</style>

      <div className="cn-page">
        <div className="cn-wrap">

          <header className="cn-header">
            <BreatheLogo />
            <div className="cn-date-block">
              <span className="cn-date-main">{dateFull}</span>
              <span className="cn-date-day">{dayName}</span>
            </div>
          </header>

          <div className="cn-paper">
            <div className="cn-title-row">
              <input
                className="cn-title-input"
                value={title}
                onChange={handleTitleChange}
                placeholder="হিসাবের নাম লিখুন"
              />
            </div>

            <div className="cn-lines">
              {lines.map((line, i) => (
                <div className="cn-row" key={i}>
                  <span className="cn-num">{toBn(i + 1)}</span>
                  <textarea
                    ref={(el) => { refsArr.current[i] = el; }}
                    className="cn-input"
                    value={line}
                    rows={1}
                    spellCheck={false}
                    required={false}
                    onChange={(e) => handleLineChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => autoResize(e.target)}
                  />
                  <span className={`cn-line-result${lineResults[i] !== null ? " show" : ""}`}>
                    {lineResults[i] !== null ? `= ${fmtNum(lineResults[i])}` : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="cn-total-bar">
              <span className={`cn-total-value${totalPulse ? " pulse" : ""}${total < 0 ? " negative" : ""}`}>
                {fmtNum(total)}
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
