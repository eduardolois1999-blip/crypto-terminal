# 🪙 Crypto Terminal — Interactive Dashboard

> A production-grade cryptocurrency dashboard built with **React + Recharts** (JSX) and a standalone **HTML + Chart.js** version, powered by the free [CoinGecko API](https://www.coingecko.com/en/api).

---

## ✨ Features

| Feature | Description |
|---|---|
| **Instant render** | Dashboard loads immediately with realistic mock data — zero blank states |
| **Silent API fallback** | CoinGecko is fetched silently in the background; if unavailable the mock data stays visible with no errors shown |
| **Live prices** | Scrolling ticker with prices + 24h % change |
| **Coin cards** | Sparklines, market rank, 24h / 7d badges per coin |
| **Price History chart** | Area chart comparing up to 5 coins over 24H / 7D / 30D / 90D / 1Y |
| **Market Cap chart** | Bar chart comparing all tracked coins |
| **24H Volume chart** | Horizontal bar chart of daily trading volume |
| **Coin & range filters** | Toggle coins on/off; switch time ranges — charts update instantly |
| **Auto-refresh** | Market data refreshes every 60 seconds |
| **Status indicator** | Header shows 🟡 Demo data or 🟢 Updated HH:MM |
| **Accessibility** | ARIA roles/labels, `aria-pressed` toggles, keyboard navigation |
| **Responsive** | CSS Grid breakpoints for desktop → tablet → mobile |

---

## 🛠 Tech Stack

### React version (`CryptoDashboard.jsx`)
- **React 18** with hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- **Recharts** — `AreaChart`, `BarChart`, custom tooltips and legends
- **Google Fonts** — Bebas Neue · Space Mono · Outfit

### Standalone version (`index.html`)
- **Vanilla JS** — no build step, open directly in any browser
- **Chart.js 4** via CDN — line chart, bar charts
- Same data strategy and visual design as the React version

### Data
- **CoinGecko Public API** — `/coins/markets`, `/coins/{id}/market_chart`
- No API key required
- Rate limit: ~30 requests/minute on the free tier

---

## ⚙️ Setup & Running

### Standalone HTML (no install needed)

```bash
# Just open the file
open index.html
# or drag it into any browser
```

### React version

```bash
# 1. Create a Vite project
npm create vite@latest crypto-terminal -- --template react
cd crypto-terminal

# 2. Install dependencies
npm install recharts

# 3. Replace src/App.jsx content with CryptoDashboard.jsx
# (or import it as a component)

# 4. Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build & deploy

```bash
npm run build
# Deploy /dist to Vercel, Netlify, or GitHub Pages
```

---

## 📁 Project Structure

```
├── index.html              # Standalone — no build needed, Chart.js via CDN
├── CryptoDashboard.jsx     # React component — Recharts, hooks
└── README.md
```

For a full modular project the component can be split into:

```
src/
├── components/
│   ├── CryptoDashboard.jsx
│   ├── Sparkline.jsx
│   ├── PriceTooltip.jsx
│   └── Toast.jsx
├── utils/
│   ├── formatters.js       # fmt.usd, fmt.pct, fmt.date
│   ├── mockData.js         # buildMockMarket, buildMockHistory
│   └── api.js              # silentFetch, tryLiveMarket, tryFetchHistory
└── App.jsx
```

---

## 🔌 API Reference

### Market overview
```
GET /coins/markets
  ?vs_currency=usd
  &ids=bitcoin,ethereum,solana,binancecoin,cardano
  &sparkline=true
  &price_change_percentage=24h,7d
```

### Price history
```
GET /coins/{id}/market_chart
  ?vs_currency=usd
  &days={1|7|30|90|365}
```

---

## 💡 Design Decisions

**Silent fallback strategy** — instead of showing error banners when the API is unreachable (common with CoinGecko's free tier CORS restrictions on localhost), the app renders realistic mock data instantly on mount and attempts the live API silently in the background. If live data arrives, the UI updates and shows a ✓ toast. If it doesn't, the user sees a fully functional dashboard marked "Demo data" — no broken states, no error messages.

**Space Mono for numbers** — monospaced font prevents layout shift as prices update digit by digit.

**Data sampling** — long ranges (90D, 1Y) can return 2000+ data points from CoinGecko. The app samples down to a maximum of 120 points for smooth chart rendering without sacrificing the visual shape of the data.

**Promise.all for chart fetches** — all selected coins are fetched concurrently, minimising total wait time.

**7s fetch timeout** — prevents the UI from hanging indefinitely on slow or unresponsive API endpoints.

---

## 🧪 Running Tests

```bash
npm test
```

Test coverage includes:
- `fmt.usd` / `fmt.pct` / `fmt.date` formatters
- Coin toggle logic (minimum 1 coin always selected)
- Data sampling (≤120 chart points regardless of input size)
- `silentFetch` — resolves `null` on network error, never rejects

---

## ⚠️ Known Issues

- CoinGecko free tier blocks requests from `file://` and some `localhost` origins due to CORS. The mock data fallback handles this transparently. On a deployed domain (Netlify / Vercel / GitHub Pages) the live API works correctly.
- CoinGecko free tier rate limit is ~30 req/min. Rapidly switching time ranges for many coins simultaneously may trigger a 429; the fallback will serve mock history for affected coins automatically.

---

## 📄 License

MIT<img width="1919" height="675" alt="Captura de pantalla 2026-03-04 142019" src="https://github.com/user-attachments/assets/4220b0f6-6156-485f-97da-96f7339df09d" />
<img width="1919" height="521" alt="Captura de pantalla 2026-03-04 142008" src="https://github.com/user-attachments/assets/4eb99fd5-7afb-43f0-93cb-e8f1e12ec871" />
<img width="1919" height="510" alt="Captura de pantalla 2026-03-04 141944" src="https://github.com/user-attachments/assets/3c918d31-3679-4acb-be88-4b384ac09fc2" />

