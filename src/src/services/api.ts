const CC_BASE = "https://min-api.cryptocompare.com/data/v2";
const CC_TOP = "https://min-api.cryptocompare.com/data";
const CG_BASE = "https://api.coingecko.com/api/v3";

export const CC_SYM_MAP: Record<string, string> = {
  'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL', 'binancecoin': 'BNB',
  'ripple': 'XRP', 'dogecoin': 'DOGE', 'cardano': 'ADA', 'polkadot': 'DOT',
  'avalanche-2': 'AVAX', 'chainlink': 'LINK', 'polygon': 'MATIC', 'uniswap': 'UNI',
  'litecoin': 'LTC', 'stellar': 'XLM', 'cosmos': 'ATOM', 'monero': 'XMR',
  'tron': 'TRX', 'ethereum-classic': 'ETC', 'near': 'NEAR', 'algorand': 'ALGO',
  'fantom': 'FTM', 'hedera-hashgraph': 'HBAR', 'vechain': 'VET', 'filecoin': 'FIL',
  'aave': 'AAVE', 'maker': 'MKR', 'compound-governance-token': 'COMP',
  'the-sandbox': 'SAND', 'decentraland': 'MANA', 'axie-infinity': 'AXS',
  'shiba-inu': 'SHIB', 'pepe': 'PEPE', 'floki': 'FLOKI',
  'bitcoin-cash': 'BCH', 'eos': 'EOS', 'dash': 'DASH', 'zcash': 'ZEC',
  'the-open-network': 'TON', 'sui': 'SUI', 'aptos': 'APT',
  'arbitrum': 'ARB', 'optimism': 'OP', 'injective-protocol': 'INJ',
  'sei-network': 'SEI', 'celestia': 'TIA', 'worldcoin-wld': 'WLD',
  'render-token': 'RNDR', 'fetch-ai': 'FET', 'singularitynet': 'AGIX',
  'ocean-protocol': 'OCEAN', 'gala': 'GALA', 'immutable-x': 'IMX',
  'flow': 'FLOW', 'chiliz': 'CHZ', 'enjincoin': 'ENJ', 'blur': 'BLUR',
  'lido-dao': 'LDO', 'curve-dao-token': 'CRV', 'synthetix-network-token': 'SNX',
  'the-graph': 'GRT', 'basic-attention-token': 'BAT', '0x': 'ZRX',
  'decred': 'DCR', 'qtum': 'QTUM', 'zilliqa': 'ZIL', 'icon': 'ICX',
  'ontology': 'ONT', 'nano': 'XNO', 'wax': 'WAXP', 'band-protocol': 'BAND',
  'kyber-network-crystal': 'KNC', 'loopring': 'LRC', 'storj': 'STORJ',
  'ankr': 'ANKR', 'celer-network': 'CELR', 'api3': 'API3',
  'kaspa': 'KAS', 'thorchain': 'RUNE', 'bittensor': 'TAO', 'stacks': 'STX',
  'mantle': 'MNT', 'jupiter-exchange-solana': 'JUP', 'pyth-network': 'PYTH',
  'bonk': 'BONK', 'dogwifhat': 'WIF', 'book-of-meme': 'BOME',
  'dai': 'DAI', 'wrapped-bitcoin': 'WBTC',
  'matic-network': 'MATIC', 'polygon-ecosystem-token': 'POL',
};

export const CC_TF_CONFIG = {
  '1': { ep: 'histominute', agg: 5, lim: 288 },
  '7': { ep: 'histohour', agg: 1, lim: 168 },
  '30': { ep: 'histohour', agg: 4, lim: 180 },
  '90': { ep: 'histoday', agg: 1, lim: 90 },
  '365': { ep: 'histoday', agg: 1, lim: 365 },
  '1825': { ep: 'histoday', agg: 1, lim: 1825 },
  'max': { ep: 'histoday', agg: 1, lim: 2000 },
};

export async function fetchChartData(symbol: string, timeframe: string) {
  const cfg = CC_TF_CONFIG[timeframe as keyof typeof CC_TF_CONFIG] || CC_TF_CONFIG['30'];
  const url = `${CC_BASE}/${cfg.ep}?fsym=${symbol}&tsym=USD&limit=${cfg.lim}&aggregate=${cfg.agg}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.Response === 'Error') throw new Error(json.Message);
  return json.Data.Data.map((c: any) => ({
    t: c.time * 1000,
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volumefrom
  })).filter((c: any) => c.c > 0);
}

export async function fetchCoinPrices(symbols: string[]) {
  if (!symbols.length) return {};
  const uniqueSyms = Array.from(new Set(symbols.map(s => s.toUpperCase())));
  const syms = uniqueSyms.join(',');
  const url = `${CC_TOP}/pricemultifull?fsyms=${syms}&tsyms=USD`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.Response === 'Error') {
      console.warn("CryptoCompare API Error:", json.Message);
    }
    return json.RAW || {};
  } catch (e) {
    console.error("fetchCoinPrices network error:", e);
    return {};
  }
}

export async function fetchTrending() {
  const url = `${CC_TOP}/top/mktcapfull?limit=10&tsym=USD`;
  const res = await fetch(url);
  const json = await res.json();
  return json.Data || [];
}

export async function fetchFearGreed() {
  const res = await fetch('https://api.alternative.me/fng/?limit=2');
  const json = await res.json();
  return json.data;
}

export async function fetchNews(categories: string = "") {
  // Try CryptoCompare first
  try {
    let url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=50";
    if (categories) url += `&categories=${encodeURIComponent(categories)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.Response !== "Error" && Array.isArray(json.Data)) {
        return json.Data;
      }
    }
  } catch (e) {
    // Ignore and move to fallback
  }

  // Fallback: Fetch RSS feeds via CORS proxy
  const feeds = [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
    { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
    { name: "Decrypt", url: "https://decrypt.co/feed" }
  ];

  let allNews: any[] = [];

  for (const feed of feeds) {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;
      
      const json = await res.json();
      const xmlText = json.contents;
      if (!xmlText) continue;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      const items = Array.from(doc.querySelectorAll("item")).slice(0, 20);
      
      const mapped = items.map((item, idx) => {
        const title = item.querySelector("title")?.textContent || "Untitled";
        const link = item.querySelector("link")?.textContent || "#";
        const description = item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
        
        let imageurl = `https://picsum.photos/seed/${feed.name}-${idx}/400/225`;
        const mediaContent = item.getElementsByTagName("media:content")[0];
        if (mediaContent) {
          imageurl = mediaContent.getAttribute("url") || imageurl;
        } else {
          const imgMatch = description.match(/src="([^"]+)"/);
          if (imgMatch) imageurl = imgMatch[1];
        }
        
        return {
          id: `${feed.name}-${idx}-${Math.random()}`,
          published_on: Math.floor(new Date(pubDate).getTime() / 1000),
          imageurl,
          title,
          url: link,
          body: description.replace(/<[^>]+>/g, '').substring(0, 180) + "...",
          categories: "Crypto|News",
          source_info: { name: feed.name }
        };
      });
      allNews = [...allNews, ...mapped];
    } catch (e) {
      console.warn(`Fallback for ${feed.name} failed:`, e);
    }
  }

  // Sort by date
  allNews.sort((a, b) => b.published_on - a.published_on);

  // If category is specified, filter the combined results
  if (categories) {
    const search = categories.toLowerCase();
    return allNews.filter(item => 
      item.title.toLowerCase().includes(search) || 
      item.body.toLowerCase().includes(search)
    );
  }

  return allNews;
}
