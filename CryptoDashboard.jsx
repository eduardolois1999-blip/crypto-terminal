/**
 * CryptoDashboard.jsx
 * Interactive cryptocurrency dashboard powered by CoinGecko API.
 *
 * Strategy: render realistic mock data instantly on mount,
 * then attempt the live API silently in the background.
 * No error banners are ever shown to the user.
 *
 * Charts: Recharts (AreaChart, BarChart)
 * API: CoinGecko public — no key required
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const COINS = [
  { id: "bitcoin",      symbol: "BTC", name: "Bitcoin",  color: "#F7931A" },
  { id: "ethereum",     symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { id: "solana",       symbol: "SOL", name: "Solana",   color: "#9945FF" },
  { id: "binancecoin",  symbol: "BNB", name: "BNB",      color: "#F3BA2F" },
  { id: "cardano",      symbol: "ADA", name: "Cardano",  color: "#0033AD" },
];

const TIME_RANGES = [
  { label: "24H", days: 1   },
  { label: "7D",  days: 7   },
  { label: "30D", days: 30  },
  { label: "90D", days: 90  },
  { label: "1Y",  days: 365 },
];

const BASE = "https://api.coingecko.com/api/v3";

// ─── Mock data (realistic fallback, used instantly on mount) ──────────────────

const MOCK_BASES = {
  bitcoin:    { price: 67420, mcap: 1.32e12, vol: 28.4e9, rank: 1, chg24:  2.31, chg7:  5.87 },
  ethereum:   { price: 3510,  mcap: 421e9,   vol: 14.2e9, rank: 2, chg24: -0.84, chg7:  3.12 },
  solana:     { price: 178,   mcap: 82e9,    vol: 4.8e9,  rank: 5, chg24:  4.55, chg7: 11.20 },
  binancecoin:{ price: 590,   mcap: 85e9,    vol: 1.9e9,  rank: 4, chg24:  1.07, chg7:  2.35 },
  cardano:    { price: 0.48,  mcap: 17e9,    vol: 0.52e9, rank: 9, chg24: -1.22, chg7: -3.10 },
};

function buildMockMarket() {
  return COINS.map((coin) => {
    const b = MOCK_BASES[coin.id];
    const spark = Array.from({ length: 168 }, (_, i) =>
      b.price * (1 + Math.sin(i / 20) * 0.05 + (Math.random() - 0.5) * 0.02)
    );
    return {
      id: coin.id,
      symbol: coin.symbol.toLowerCase(),
      current_price: b.price * (1 + (Math.random() - 0.5) * 0.01),
      market_cap: b.mcap,
      total_volume: b.vol,
      market_cap_rank: b.rank,
      price_change_percentage_24h: b.chg24 + (Math.random() - 0.5) * 0.5,
      price_change_percentage_7d_in_currency: b.chg7,
      sparkline_in_7d: { price: spark },
    };
  });
}

function buildMockHistory(coinId, days) {
  const b = MOCK_BASES[coinId] || { price: 100 };
  const pts  = days <= 1 ? 144 : days <= 7 ? 168 : days * 8;
  const now  = Date.now();
  const step = (days * 86_400_000) / pts;
  let price  = b.price * 0.93;
  return Array.from({ length: pts }, (_, i) => {
    price *= 1 + (Math.random() - 0.48) * 0.013;
    return [now - (pts - i) * step, price];
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  usd: (n) =>
    n == null ? "$—"
    : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M`
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  pct: (n) => n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`,
  date: (ts, days) => {
    const d = new Date(ts);
    return days <= 1
      ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },
};

const getCoin = (id) => COINS.find((c) => c.id === id) || {};

/** Fetch with 7s timeout — resolves null on any error, never rejects */
async function silentFetch(url) {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res   = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** SVG sparkline from a flat array of prices */
function Sparkline({ data = [], color }) {
  if (!data.length) return null;
  const W = 96, H = 38;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - ((v - min) / rng) * H).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={W} height={H} aria-hidden="true" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Custom recharts tooltip */
function PriceTooltip({ active, payload, label, days }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,14,30,.95)", border: "1px solid rgba(255,184,0,.3)",
      borderRadius: 8, padding: "10px 14px",
      fontFamily: "'Space Mono',monospace", fontSize: 12,
    }}>
      <p style={{ color: "#8892a4", marginBottom: 6 }}>{fmt.date(label, days)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {getCoin(p.dataKey.replace("_price", "")).name}: {fmt.usd(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Toast notification */
function Toast({ message, visible }) {
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 24, right: 24,
      background: "rgba(10,14,30,.98)", border: "1px solid rgba(255,184,0,.3)",
      borderRadius: 10, padding: "12px 18px",
      fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#FFB800",
      zIndex: 999, pointerEvents: "none",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity .3s, transform .3s",
    }}>
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CryptoDashboard() {
  // Initialise with mock data so the dashboard renders immediately
  const [marketData,    setMarketData]    = useState(() => buildMockMarket());
  const [chartData,     setChartData]     = useState([]);
  const [selectedCoins, setSelectedCoins] = useState(["bitcoin", "ethereum"]);
  const [timeRange,     setTimeRange]     = useState(TIME_RANGES[1]);
  const [isLive,        setIsLive]        = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [toastMsg,      setToastMsg]      = useState("");
  const [toastVisible,  setToastVisible]  = useState(false);
  const refreshTimer = useRef(null);

  /** Show a transient toast */
  const showToast = useCallback((msg, ms = 2500) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), ms);
  }, []);

  // ── Try live market data (silent, no error state) ────────────────────────
  const tryLiveMarket = useCallback(async () => {
    const ids  = COINS.map((c) => c.id).join(",");
    const data = await silentFetch(
      `${BASE}/coins/markets?vs_currency=usd&ids=${ids}` +
      `&order=market_cap_desc&per_page=10&page=1` +
      `&sparkline=true&price_change_percentage=24h,7d`
    );
    if (data && Array.isArray(data) && data.length) {
      setMarketData(data);
      setIsLive(true);
      setLastUpdated(new Date());
      return true;
    }
    return false;
  }, []);

  // ── Try live chart history (falls back to mock per-coin) ─────────────────
  const loadChartData = useCallback(async () => {
    const results = await Promise.all(
      selectedCoins.map(async (id) => {
        const data = await silentFetch(
          `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${timeRange.days}`
        );
        const prices = data?.prices?.length ? data.prices : buildMockHistory(id, timeRange.days);
        return { id, prices };
      })
    );

    // Merge into unified time-series, sample to ≤120 pts
    const tsMap = {};
    results.forEach(({ id, prices }) => {
      prices.forEach(([ts, price]) => {
        if (!tsMap[ts]) tsMap[ts] = { ts };
        tsMap[ts][`${id}_price`] = price;
      });
    });
    const merged = Object.values(tsMap)
      .sort((a, b) => a.ts - b.ts)
      .filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 120)) === 0);

    setChartData(merged);
  }, [selectedCoins, timeRange]);

  // ── On mount: show mock instantly, then attempt live data ────────────────
  useEffect(() => {
    loadChartData(); // chart uses mock history until API responds

    tryLiveMarket().then((gotLive) => {
      if (gotLive) showToast("✓ Live data loaded");
    });

    // Auto-refresh market every 60s
    refreshTimer.current = setInterval(() => {
      tryLiveMarket();
    }, 60_000);

    return () => clearInterval(refreshTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reload chart when selection or range changes ─────────────────────────
  useEffect(() => { loadChartData(); }, [loadChartData]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleCoin = (id) =>
    setSelectedCoins((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((c) => c !== id) : prev
        : [...prev, id]
    );

  const getMarket = (id) => marketData.find((c) => c.id === id) || {};

  const volumeData = marketData
    .filter((c) => selectedCoins.includes(c.id))
    .map((c) => ({ name: getCoin(c.id).symbol, volume: c.total_volume, color: getCoin(c.id).color }));

  const marketCapData = marketData.map((c) => ({
    name:  getCoin(c.id)?.symbol || c.symbol?.toUpperCase(),
    cap:   c.market_cap,
    color: getCoin(c.id)?.color || "#8892a4",
  }));

  // ─── Styles (injected once) ────────────────────────────────────────────
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=Outfit:wght@300;400;500;600&display=swap');
    @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :focus-visible{outline:2px solid #FFB800;outline-offset:3px;border-radius:4px}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:#0a0e1a}
    ::-webkit-scrollbar-thumb{background:#1e2d47;border-radius:3px}
    body{background:#060b18}
    .dashboard{min-height:100vh;background:#060b18;font-family:'Outfit',sans-serif;color:#e2e8f0;padding:0 0 40px}
    .header{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;
      border-bottom:1px solid rgba(255,184,0,.15);background:rgba(6,11,24,.97);
      position:sticky;top:0;z-index:100;backdrop-filter:blur(20px)}
    .logo-mark{width:38px;height:38px;background:#FFB800;
      clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
      display:flex;align-items:center;justify-content:center;
      font-family:'Bebas Neue',sans-serif;color:#060b18;font-size:17px;flex-shrink:0}
    .logo-text{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#FFB800}
    .logo-sub{font-family:'Space Mono',monospace;font-size:11px;color:#4a5568;margin-top:2px}
    .live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;
      margin-right:6px;animation:pulse 2s infinite;vertical-align:middle}
    .demo-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#F3BA2F;
      margin-right:6px;vertical-align:middle}
    .ticker-wrap{overflow:hidden;background:rgba(255,184,0,.04);
      border-bottom:1px solid rgba(255,184,0,.07);padding:9px 0;user-select:none}
    .ticker-track{display:flex;white-space:nowrap;animation:ticker 28s linear infinite}
    .ticker-track:hover{animation-play-state:paused}
    .ticker-item{display:inline-flex;align-items:center;gap:8px;padding:0 28px;
      font-family:'Space Mono',monospace;font-size:12px}
    .t-up{color:#22c55e}.t-dn{color:#ef4444}
    .content{padding:24px 32px;display:grid;gap:24px}
    .filter-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .filter-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;
      color:#4a5568;font-family:'Space Mono',monospace}
    .filter-divider{width:1px;height:26px;background:rgba(255,255,255,.08)}
    .coin-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:8px;
      cursor:pointer;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);
      color:#8892a4;font-family:'Space Mono',monospace;font-size:11px;transition:all .2s}
    .coin-btn:hover{border-color:rgba(255,184,0,.3);color:#e2e8f0}
    .coin-btn.active{background:rgba(255,184,0,.1);border-color:rgba(255,184,0,.45);color:#FFB800}
    .coin-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block}
    .time-btn{padding:6px 13px;border-radius:6px;cursor:pointer;
      border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);
      color:#8892a4;font-family:'Space Mono',monospace;font-size:11px;transition:all .2s}
    .time-btn:hover{border-color:rgba(0,229,255,.3);color:#e2e8f0}
    .time-btn.active{background:rgba(0,229,255,.08);border-color:rgba(0,229,255,.4);color:#00E5FF}
    .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
    .coin-card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);
      border-radius:14px;padding:18px 20px;transition:all .25s;
      animation:fadeUp .4s ease both;position:relative;overflow:hidden}
    .coin-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
      background:var(--clr);opacity:.5}
    .coin-card:hover{border-color:rgba(255,255,255,.15);transform:translateY(-2px);
      box-shadow:0 10px 36px rgba(0,0,0,.45)}
    .badge{padding:2px 7px;border-radius:4px;font-size:10px;font-family:'Space Mono',monospace}
    .badge-up{background:rgba(34,197,94,.12);color:#22c55e}
    .badge-dn{background:rgba(239,68,68,.12);color:#ef4444}
    .panel{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);
      border-radius:16px;padding:24px;overflow:hidden}
    .charts-row{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
    .stat-box{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
      border-radius:10px;padding:14px 16px;text-align:center}
    @media(max-width:900px){.charts-row{grid-template-columns:1fr}.header,.content{padding:16px 20px}}
    @media(max-width:600px){.cards-grid{grid-template-columns:1fr 1fr}.logo-text{font-size:18px}}
  `;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>

      <main className="dashboard" role="main">

        {/* Header */}
        <header className="header" role="banner">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="logo-mark" aria-hidden="true">₿</div>
            <div>
              <div className="logo-text">CRYPTO TERMINAL</div>
              <div className="logo-sub">
                {isLive
                  ? <><span className="live-dot" />{`Updated ${lastUpdated?.toLocaleTimeString()}`}</>
                  : <><span className="demo-dot" />Demo data</>
                }
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "'Space Mono',monospace", textTransform: "uppercase", letterSpacing: 1 }}>Powered by</div>
            <div style={{ fontSize: 13, color: "#FFB800", fontFamily: "'Space Mono',monospace" }}>CoinGecko API</div>
          </div>
        </header>

        {/* Ticker */}
        <div className="ticker-wrap" aria-label="Live price ticker" role="marquee" aria-live="off">
          <div className="ticker-track">
            {[...marketData, ...marketData].map((c, i) => {
              const coin = getCoin(c.id);
              const chg  = c.price_change_percentage_24h;
              return (
                <div className="ticker-item" key={`${c.id}-${i}`} aria-hidden={i >= marketData.length}>
                  <span style={{ fontWeight: 700, color: coin.color, fontFamily: "'Space Mono',monospace" }}>{coin.symbol}</span>
                  <span>{fmt.usd(c.current_price)}</span>
                  <span className={chg >= 0 ? "t-up" : "t-dn"}>{fmt.pct(chg)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="content">

          {/* Filters — NO error banners */}
          <section aria-label="Filters">
            <div className="filter-bar">
              <span className="filter-label" id="coins-lbl">Coins</span>
              <div role="group" aria-labelledby="coins-lbl" style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {COINS.map((coin) => (
                  <button key={coin.id}
                    className={`coin-btn ${selectedCoins.includes(coin.id) ? "active" : ""}`}
                    onClick={() => toggleCoin(coin.id)}
                    aria-pressed={selectedCoins.includes(coin.id)}
                    aria-label={`${selectedCoins.includes(coin.id) ? "Deselect" : "Select"} ${coin.name}`}
                  >
                    <span className="coin-dot" style={{ background: coin.color }} aria-hidden="true" />
                    {coin.symbol}
                  </button>
                ))}
              </div>
              <div className="filter-divider" aria-hidden="true" />
              <span className="filter-label" id="range-lbl">Range</span>
              <div role="group" aria-labelledby="range-lbl" style={{ display: "flex", gap: 5 }}>
                {TIME_RANGES.map((r) => (
                  <button key={r.label}
                    className={`time-btn ${timeRange.label === r.label ? "active" : ""}`}
                    onClick={() => setTimeRange(r)}
                    aria-pressed={timeRange.label === r.label}
                    aria-label={`Show ${r.label} data`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Coin cards */}
          <section aria-label="Coin market overview">
            <div className="cards-grid">
              {marketData.map((c, i) => {
                const coin = getCoin(c.id);
                const chg24 = c.price_change_percentage_24h;
                const chg7  = c.price_change_percentage_7d_in_currency;
                return (
                  <article key={c.id} className="coin-card"
                    style={{ "--clr": coin.color, animationDelay: `${i * 55}ms` }}
                    aria-label={`${coin.name} market data`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#8892a4", fontWeight: 500 }}>{coin.name}</div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 21, letterSpacing: 1, color: coin.color }}>{coin.symbol}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: "#4a5568" }}>#{c.market_cap_rank}</span>
                        <Sparkline data={c.sparkline_in_7d?.price || []} color={coin.color} />
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, marginBottom: 9 }}>
                      {fmt.usd(c.current_price)}
                    </div>
                    <div className="card-changes" style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                      <span className={`badge ${chg24 >= 0 ? "badge-up" : "badge-dn"}`}>24h {fmt.pct(chg24)}</span>
                      {chg7 != null && <span className={`badge ${chg7 >= 0 ? "badge-up" : "badge-dn"}`}>7d {fmt.pct(chg7)}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "'Space Mono',monospace" }}>
                      Vol: {fmt.usd(c.total_volume)}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Price History */}
          <section className="panel" aria-labelledby="price-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "#e2e8f0" }} id="price-title">
                  Price History
                </h2>
                <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "'Space Mono',monospace", marginTop: 3 }}>
                  {selectedCoins.map((id) => getCoin(id).name).join(" • ")} — {timeRange.label}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  {selectedCoins.map((id) => {
                    const color = getCoin(id).color;
                    return (
                      <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="ts"
                  tickFormatter={(ts) => fmt.date(ts, timeRange.days)}
                  tick={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fill: "#4a5568" }}
                  axisLine={false} tickLine={false} minTickGap={50}
                />
                <YAxis
                  tickFormatter={(v) => fmt.usd(v)}
                  tick={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fill: "#4a5568" }}
                  axisLine={false} tickLine={false} width={82}
                />
                <Tooltip content={<PriceTooltip days={timeRange.days} />} />
                <Legend formatter={(val) => {
                  const id = val.replace("_price", "");
                  return <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: getCoin(id).color }}>{getCoin(id).name}</span>;
                }} />
                {selectedCoins.map((id) => {
                  const color = getCoin(id).color;
                  return (
                    <Area key={id} type="monotone" dataKey={`${id}_price`} name={`${id}_price`}
                      stroke={color} strokeWidth={2} fill={`url(#grad-${id})`}
                      dot={false} activeDot={{ r: 4, fill: color, stroke: "#060b18", strokeWidth: 2 }}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Bottom row */}
          <div className="charts-row">

            {/* Market Cap */}
            <section className="panel" aria-labelledby="mcap-title">
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "#e2e8f0" }} id="mcap-title">Market Cap</h2>
                <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "'Space Mono',monospace", marginTop: 3 }}>All tracked coins</div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={marketCapData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fill: "#4a5568" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmt.usd(v)} tick={{ fontFamily: "'Space Mono',monospace", fontSize: 10, fill: "#4a5568" }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip formatter={(v) => [fmt.usd(v), "Market Cap"]}
                    contentStyle={{ background: "rgba(10,14,30,.95)", border: "1px solid rgba(255,184,0,.2)", borderRadius: 8, fontFamily: "'Space Mono',monospace", fontSize: 12 }}
                    labelStyle={{ color: "#8892a4" }}
                  />
                  <Bar dataKey="cap" radius={[4, 4, 0, 0]}>
                    {marketCapData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            {/* Volume */}
            <section className="panel" aria-labelledby="vol-title">
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "#e2e8f0" }} id="vol-title">24H Volume</h2>
                <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "'Space Mono',monospace", marginTop: 3 }}>Selected coins</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => fmt.usd(v)} tick={{ fontFamily: "'Space Mono',monospace", fontSize: 9, fill: "#4a5568" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontFamily: "'Space Mono',monospace", fontSize: 11, fill: "#8892a4" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip formatter={(v) => [fmt.usd(v), "24h Volume"]}
                    contentStyle={{ background: "rgba(10,14,30,.95)", border: "1px solid rgba(0,229,255,.2)", borderRadius: 8, fontFamily: "'Space Mono',monospace", fontSize: 12 }}
                    labelStyle={{ color: "#8892a4" }}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                    {volumeData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="stat-row">
                {volumeData.map((v) => (
                  <div key={v.name} className="stat-box">
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#4a5568", fontFamily: "'Space Mono',monospace", marginBottom: 5 }}>{v.name}</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: v.color }}>{fmt.usd(v.volume)}</div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          <footer style={{ textAlign: "center", padding: "8px 0", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#2d3748" }}>
            Data sourced from CoinGecko Public API · Refreshes every 60s · Not financial advice
          </footer>

        </div>
      </main>

      <Toast message={toastMsg} visible={toastVisible} />
    </>
  );
}
