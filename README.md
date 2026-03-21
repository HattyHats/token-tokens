🪙 Token-Tokens

A live cryptocurrency charting & education platform — built by HattyHats
Check out my main website to find my other projects: www.earnwithhatty.com

📖 What Is Token-Tokens?
Token-Tokens is a free, single-file web application that lets you track real-time cryptocurrency prices, read professional-grade interactive charts, set price alerts, draw on charts like a trader, and learn everything you need to know about reading crypto charts — all in one place, with no installation required.
It was built as part of the HattyHats ecosystem to give everyone — from complete beginners to seasoned traders — access to the same powerful chart tools that professionals use, wrapped in a clean, beginner-friendly interface.

✨ Features
📊 Live Price Tracking

Real-time prices for 18,000+ tokens via the CoinGecko API
Live global market ticker bar (total market cap, BTC dominance, ETH dominance, top 20 coins)
Watchlist — add any token and track it with live price updates every 90 seconds
Price flash animations (green/red) when prices update
Market cap, 24h volume, and all-time high displayed per token

🔍 Token Search & Browser

Type-ahead search — search any coin by name or symbol, results show live prices and 24h change instantly
Token Browser modal — browse all 18,000+ coins with filters:

Categories: Layer 1, Layer 2, DeFi, Meme, Gaming, AI, Stablecoins, RWA, NFT
Sort by: Market Cap, Volume, Trending, Top Gainers, Top Losers
Paginated grid with real prices, market cap, and 24h % change on every card


Trending coins — live list of the top 7 trending tokens from CoinGecko

📈 Interactive Chart

Real OHLC candlestick data from CoinGecko (actual open, high, low, close per period)
Timeframes: 1 Day, 7 Days, 30 Days, 90 Days, 1 Year, 5 Years, and MAX (full price history back to 2013 for Bitcoin)
Chart types: Candlestick and Line chart
Mini sparkline charts for 1D, 7D, 30D, and 1Y at a glance
Zoom: Scroll wheel to zoom in/out on any part of the chart
Pan: Click and drag to move through price history
Touch support: Pinch to zoom and swipe to pan on mobile
OHLC bar: Shows Open, High, Low, Close, and Volume for any hovered candle
Hover tooltip with full candle data (date, O/H/L/C, volume)

🧮 Technical Indicators
Access from the right-side panel (hover to expand on desktop):
IndicatorWhat It ShowsMA(20)20-period Moving Average — trend directionEMA(50)50-period Exponential MA — faster trend signalsBollinger BandsVolatility bands — overbought/oversold zonesVWAPVolume Weighted Avg Price — institutional benchmarkRSI(14)Relative Strength Index — momentum (shown in sub-chart)MACDMoving Average Convergence/Divergence — momentum shifts (shown in sub-chart)
Hover any indicator button to see a plain-English explanation of what it means and what signals to look for.
✏️ Drawing Tools
Draw directly on the chart like a professional trader:

Trend Line — connect two points to show direction
Horizontal Line — mark key support/resistance price levels
Ray — like a trend line but extends infinitely to the right
Rectangle Zone — highlight price consolidation zones
Fibonacci Retracement — auto-draw all key Fibonacci levels between two points
Text Note — add labeled annotations anywhere on the chart
5 colors — Cyan, Green, Red, Yellow, Purple
Undo last drawing or Clear All drawings
All drawings are saved locally and restored on your next visit

🔔 Price Alerts

Set alerts for any token going above or below any price
Audible ding sound when an alert fires
Browser push notification (if permission granted) — alerts work even in the background
Alerts marked as "✓ TRIGGERED" in the panel once hit
Saved locally so they persist across sessions

⏳ Time Machine
Enter any date back to 2010 and instantly see what price that token was at — including the % change from then to today. The chart scrolls to that exact date with a glowing marker.
😱 Fear & Greed Index
A live canvas-drawn semicircle gauge showing today's Crypto Fear & Greed Index (0–100) from alternative.me, with:

Color-coded zones (red = Extreme Fear → green = Extreme Greed)
Animated needle pointing to the exact score
Yesterday's score comparison with change indicator

🌊 Pattern Recognition
Automatically detects and labels key chart patterns:

Golden Cross & Death Cross
Double Top & Double Bottom
More patterns recognized as they form

📚 Learn Section
A comprehensive, plain-English guide to reading crypto charts, covering:

Chart basics (axes, timeframes, line vs candlestick)
Candlestick anatomy with visual diagrams
Identifying trends (uptrend, downtrend, sideways)
Support & Resistance
Volume analysis
All 6 indicators explained with signals
Candlestick patterns (Doji, Engulfing, Hammer, Shooting Star, and more)
Fibonacci retracement levels
A 10-point live analysis checklist you can check off while watching charts

⚙️ Settings
A polished popup modal with:

Live stats (watchlist count, active alerts, drawings count, local storage used)
Light / Dark mode toggle
Export all your data as JSON
Clear drawings, clear alerts, or reset everything


🚀 Getting Started
Option 1: Use It Directly
Just open index.html in any modern web browser. No server, no installation, no dependencies.
bash# Simply open the file
open index.html
# or double-click it in your file explorer
Option 2: Host It (Recommended)
Deploy to any static hosting service for the best experience:
Netlify (free)

Drag the token-tokens/ folder to netlify.com/drop
Done — your live URL is ready in seconds

GitHub Pages (free)

Push the folder to a GitHub repository
Go to Settings → Pages → select your branch
Your site is live at https://yourusername.github.io/repo-name

Vercel (free)
bashnpm i -g vercel
vercel
Option 3: Local Server
bash# Python
python -m http.server 8080

# Node.js
npx serve .
Then visit http://localhost:8080

📁 File Structure
token-tokens/
├── index.html      ← The entire app (single file, self-contained)
├── chart.png       ← Splash screen background image
└── README.md       ← This file
The entire application — all HTML, CSS, JavaScript, chart rendering, indicators, drawing tools, and UI — lives in a single index.html file. There is no build step, no framework, no node_modules.

🔌 Data Sources
DataSourceCostPrices, OHLC, search, trendingCoinGecko APIFree (public endpoint)Chart historyCoinGecko /coins/{id}/market_chart + /ohlcFreeHistorical prices (Time Machine)CryptoCompareFreeFear & Greed Indexalternative.meFreeMini sparklinesCryptoCompareFree
All data is fetched directly in the browser — no backend server is required.
The app includes a smart request queue that rate-limits API calls to stay within CoinGecko's free tier (30 calls/minute), with caching and automatic retry on rate limit errors.

📱 Mobile Support
Token-Tokens is fully responsive:

Watchlist becomes a horizontal scroll strip on small screens
Chart is touch-enabled (pinch to zoom, swipe to pan)
Indicators and draw tools adapt to a compact bottom panel on mobile
Modal browser opens as a full-screen sheet on mobile
The ticker bar hides on mobile to save space


💾 Local Storage
All your personal data is saved only in your browser using localStorage. Nothing is ever sent to any server.
What gets saved:

Your watchlist (which tokens you're tracking)
Your active price alerts
Your chart drawings (lines, zones, Fibonacci, notes)
Your preferred timeframe and chart type
Your theme preference (dark/light)

You can export all saved data as JSON or clear everything from the Settings panel (⚙ button in the header).

🖥️ Browser Compatibility
BrowserSupportChrome / Edge 90+✅ Full supportFirefox 88+✅ Full supportSafari 14+✅ Full supportMobile Chrome✅ Full supportMobile Safari✅ Full supportIE 11❌ Not supported
Requires: Canvas API, Fetch API, CSS Custom Properties, ES2020.

🔗 HattyHats Ecosystem
Token-Tokens is part of a larger collection of free tools and resources built by HattyHats:
ProjectLinkDescriptionLearn With Hattyearnwithhatty.comCrypto tutorials & guidesHatty's Toolsearn-with-hatty-tools.netlify.appWeb tools collectionHatty's Mediahattys-media.netlify.appVideos & contentPrivacy Gadgetsprivacy-gadgets-hub.netlify.appPrivacy tools & gearHatty's Universehatty-universe.netlify.appThe full ecosystemHatty's Newshattys-news.netlify.appLatest crypto newsOpen Focushattyhats.github.io/Open-FocusProductivity toolOrbitNodeorbit-node.netlify.appNode managementCaseBoardcase-board.netlify.appCase management board

⚠️ Disclaimer
Token-Tokens is an educational tool only. Nothing on this platform constitutes financial advice. Cryptocurrency markets are highly volatile — always do your own research (DYOR) before making any investment decisions.

📄 License
This project is free to use for personal and educational purposes.
Built with ❤️ by HattyHats — earnwithhatty.com

If you find Token-Tokens useful, share it with a friend who's learning crypto!
