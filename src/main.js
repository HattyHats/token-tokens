/* ══════════════════ SPLASH — 3D FLYING CHARTS & AUTO ENTER ══════════════════ */
(()=>{
  const c = document.getElementById('splash-canvas');
  if(!c) return;
  const ctx = c.getContext('2d');
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize(); addEventListener('resize', resize);

  const charts = [];
  const NUM_CHARTS = 45;
  const FOV = 350;
  const COLORS = ['#00d4ff', '#00ff88', '#ff3366', '#9664ff', '#ffc800'];

  class ChartObject {
    constructor() {
      this.reset(true);
    }
    reset(randomZ = false) {
      this.x = (Math.random() - 0.5) * 3000;
      this.y = (Math.random() - 0.5) * 2000;
      this.z = randomZ ? Math.random() * 2500 + 100 : 2500;
      this.vz = 2.5 + Math.random() * 5; // speed
      this.type = Math.random() > 0.5 ? 'candle' : 'line';
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.points = [];
      
      const numPoints = 12 + Math.floor(Math.random() * 20);
      let p = 0;
      for (let i = 0; i < numPoints; i++) {
        const o = p;
        const ch = (Math.random() - 0.48) * 60;
        const cl = o + ch;
        this.points.push({
          o, c: cl,
          h: Math.max(o, cl) + Math.random() * 30,
          l: Math.min(o, cl) - Math.random() * 30
        });
        p = cl;
      }
    }
    update() {
      this.z -= this.vz;
      if (this.z <= 0) {
        this.reset();
      }
    }
    draw() {
      const scale = FOV / (FOV + this.z);
      const px = this.x * scale + c.width / 2;
      const py = this.y * scale + c.height / 2;
      
      // Don't draw if completely off screen
      if (px < -300 || px > c.width + 300 || py < -300 || py > c.height + 300) return;

      const cw = 18 * scale; // candle/point width
      
      ctx.save();
      ctx.translate(px, py);
      
      ctx.globalAlpha = Math.min(1, Math.max(0, 1 - (this.z / 2500)));
      ctx.shadowBlur = 12 * scale;
      ctx.shadowColor = this.color;
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
      
      if (this.type === 'line') {
        ctx.beginPath();
        ctx.lineWidth = Math.max(1, 3 * scale);
        ctx.lineJoin = 'round';
        this.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(i * cw, -pt.c * scale);
          else ctx.lineTo(i * cw, -pt.c * scale);
        });
        ctx.stroke();
      } else {
        ctx.lineWidth = Math.max(1, 2 * scale);
        this.points.forEach((pt, i) => {
          const up = pt.c >= pt.o;
          const cc = up ? '#00ff88' : '#ff3366';
          ctx.strokeStyle = cc;
          ctx.fillStyle = cc;
          ctx.shadowColor = cc;
          
          const cx = i * cw;
          ctx.beginPath();
          ctx.moveTo(cx, -pt.h * scale);
          ctx.lineTo(cx, -pt.l * scale);
          ctx.stroke();
          
          const bodyH = Math.max(1, Math.abs(pt.c - pt.o) * scale);
          const bodyY = -Math.max(pt.o, pt.c) * scale;
          ctx.fillRect(cx - cw * 0.35, bodyY, cw * 0.7, bodyH);
        });
      }
      ctx.restore();
    }
  }

  for (let i = 0; i < NUM_CHARTS; i++) {
    charts.push(new ChartObject());
  }

  let animationId;
  function animate() {
    ctx.clearRect(0, 0, c.width, c.height);
    
    // Sort by z index descending to draw furthest first
    charts.sort((a, b) => b.z - a.z);
    
    charts.forEach(chart => {
      chart.update();
      chart.draw();
    });
    
    animationId = requestAnimationFrame(animate);
  }
  animate();

  /* ── Auto-enter sequence ──
     Timeline:
       0.5s  — "Welcome To:" fades in
       1.2s  — "Token-Tokens" fades in
       2.0s  — "Created by HattyHats" fades in
       3.0s  — spinner fades in
       4.2s  — splash fades out → app loads
  ── */
  setTimeout(() => {
    cancelAnimationFrame(animationId);
    document.getElementById('splash').style.animation = 'splOut .7s ease forwards';
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      const app = document.getElementById('app');
      app.style.display = 'flex';
      app.style.flexDirection = 'column';
      initApp();
    }, 700);
  }, 4200);
})();

/* ══════════════════ API & REQUEST QUEUE ══════════════════ */
// Rate-limited queue: max 8 requests per 10 seconds (well under CG free limit of 30/min)
const Q={
  queue:[],running:0,maxConcurrent:2,
  perWindow:8,windowMs:12000,
  timestamps:[],
  add(fn){return new Promise((res,rej)=>{this.queue.push({fn,res,rej});this.run();})},
  canRun(){
    const now=Date.now();this.timestamps=this.timestamps.filter(t=>now-t<this.windowMs);
    return this.timestamps.length<this.perWindow&&this.running<this.maxConcurrent;
  },
  async run(){
    if(!this.queue.length||!this.canRun())return;
    const{fn,res,rej}=this.queue.shift();
    this.running++;this.timestamps.push(Date.now());
    try{const r=await fn();res(r);}catch(e){rej(e);}
    finally{this.running--;setTimeout(()=>this.run(),200);}
    if(this.queue.length&&this.canRun())setTimeout(()=>this.run(),300);
  }
};

// Cache: store results keyed by url, expire after TTL
const CACHE={
  store:{},
  set(k,v,ttl=60000){this.store[k]={v,exp:Date.now()+ttl};},
  get(k){const e=this.store[k];if(!e||Date.now()>e.exp){delete this.store[k];return null;}return e.v;},
  del(k){delete this.store[k];}
};

const API_KEY='';
const BASE='https://api.coingecko.com/api/v3';

function getUrl(path){
  // Always append key as query param if we have one
  const sep=path.includes('?')?'&':'?';
  return API_KEY?`${BASE}${path}${sep}x_cg_demo_api_key=${encodeURIComponent(API_KEY)}`:`${BASE}${path}`;
}

// Direct fetch — bypasses the queue, for time-sensitive single requests
async function apiFetchDirect(path,ttl=60000,retries=3){
  const url=getUrl(path);
  const cached=CACHE.get(url);
  if(cached)return cached;
  let lastErr;
  for(let attempt=0;attempt<=retries;attempt++){
    try{
      const r=await fetch(url,{headers:{'Accept':'application/json'}});
      if(r.status===429){await sleep(attempt===0?3000:8000);continue;}
      if(r.status===404)throw new Error('404');
      if(!r.ok)throw new Error(r.status);
      const data=await r.json();
      if(ttl>0)CACHE.set(url,data,ttl);
      setDot('ok');return data;
    }catch(e){lastErr=e;if(e.message==='404')throw e;if(attempt<retries)await sleep(1500*(attempt+1));}
  }
  setDot('err');throw lastErr;
}

// Queued fetch — rate-limited, for non-urgent bulk loads
async function apiFetch(path,ttl=60000,retries=2){
  const url=getUrl(path);
  const cached=CACHE.get(url);
  if(cached)return cached;
  return Q.add(async()=>{
    let lastErr;
    for(let attempt=0;attempt<=retries;attempt++){
      try{
        const r=await fetch(url,{headers:{'Accept':'application/json'}});
        if(r.status===429){setDot('rl');await sleep(attempt===0?5000:12000);continue;}
        if(!r.ok)throw new Error(r.status);
        const data=await r.json();
        CACHE.set(url,data,ttl);
        setDot('ok');return data;
      }catch(e){lastErr=e;if(attempt<retries)await sleep(2000*(attempt+1));}
    }
    setDot('err');throw lastErr;
  });
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function setDot(s){
  const e=document.getElementById('apiDot');
  if(s==='ok'){e.className='api-dot ok';e.innerHTML='◈ LIVE';}
  else if(s==='err'){e.className='api-dot err';e.innerHTML='⚠ ERR';}
  else if(s==='rl'){e.className='api-dot rl';e.innerHTML='⏳ Rate limit…';}
  else{e.className='api-dot wait';e.innerHTML='<div class="spin" style="width:9px;height:9px;border-width:1.5px;"></div>&nbsp;…';}
}

/* ══════════════════ STATE ══════════════════ */
const ST={
  coin:{id:'bitcoin',name:'Bitcoin',symbol:'BTC',image:'',price:0,change:0,mcap:0,vol:0,ath:0},
  wl:[
    {id:'bitcoin',name:'Bitcoin',symbol:'BTC'},
    {id:'ethereum',name:'Ethereum',symbol:'ETH'},
    {id:'solana',name:'Solana',symbol:'SOL'},
    {id:'binancecoin',name:'BNB',symbol:'BNB'},
    {id:'ripple',name:'XRP',symbol:'XRP'},
    {id:'dogecoin',name:'Dogecoin',symbol:'DOGE'},
  ],
  tf:'30',ct:'candle',
  inds:new Set(),candles:[],
  showPatterns:false,
  zoom:{s:0,r:80},drag:{on:false,x:0,s:0},
  mb:{page:1,per:50,cat:'',sort:'market_cap_desc',q:'',data:[]},
  sbt:null,mbt:null,
};

// ── Drawing Tools State ──────────────────────────────────────────────────────
const DRW = {
  tool:   null,        // 'line'|'hline'|'ray'|'rect'|null
  color:  '#00d4ff',   // active draw color
  drawings: [],        // completed drawings [{type,color,...price/candle coords}]
  pending: null,       // drawing in progress {type,color,p1:{cx,price},p2:{cx,price}|null}
};

// Convert canvas pixel X → candle index (within visible range)
function pxToCandleIdx(mx, canvasW) {
  const vis = ST.candles.slice(Math.max(0,ST.zoom.s), Math.min(ST.candles.length,ST.zoom.s+ST.zoom.r));
  if(!vis.length) return null;
  const cw = (canvasW - 8 - 82) / vis.length;
  const i  = Math.max(0, Math.min(vis.length-1, Math.floor((mx-4)/cw)));
  return { visIdx:i, globalIdx:ST.zoom.s+i, candle:vis[i] };
}

// Convert canvas pixel Y → price
function pxToPrice(my, canvasH) {
  const vis = ST.candles.slice(Math.max(0,ST.zoom.s), Math.min(ST.candles.length,ST.zoom.s+ST.zoom.r));
  if(!vis.length) return null;
  const allPx = vis.flatMap(c=>[c.h,c.l]);
  const rawMn = Math.min(...allPx), rawMx = Math.max(...allPx);
  const rp = (rawMx-rawMn)*0.06||rawMn*0.02||1;
  const minP = rawMn-rp, maxP = rawMx+rp, pRange = maxP-minP;
  const PAD_T=18, PAD_B=22, cH=canvasH-PAD_T-PAD_B;
  const price = maxP - ((my-PAD_T)/cH)*pRange;
  return price;
}

// Convert price → canvas pixel Y (inverse)
function priceToY(price, canvasH) {
  const vis = ST.candles.slice(Math.max(0,ST.zoom.s), Math.min(ST.candles.length,ST.zoom.s+ST.zoom.r));
  if(!vis.length) return 0;
  const allPx = vis.flatMap(c=>[c.h,c.l]);
  const rawMn = Math.min(...allPx), rawMx = Math.max(...allPx);
  const rp = (rawMx-rawMn)*0.06||rawMn*0.02||1;
  const minP = rawMn-rp, maxP = rawMx+rp, pRange = maxP-minP;
  const PAD_T=18, PAD_B=22, cH=canvasH-PAD_T-PAD_B;
  return PAD_T + (1-(price-minP)/pRange)*cH;
}

// Convert global candle index → canvas pixel X
function candleToX(globalIdx, canvasW) {
  const visIdx = globalIdx - ST.zoom.s;
  const r      = ST.zoom.r;
  const cw     = (canvasW - 8 - 82) / r;
  return 4 + (visIdx+0.5)*cw;
}

function setDrawTool(tool) {
  DRW.tool    = tool;
  DRW.pending = null;
  // Update cursor
  const zone = document.getElementById('chartZone');
  zone.className = 'chart-zone' + (tool ? ' drawing-'+tool : '');
  // Clear all draw tool buttons (right panel + mobile draw panel)
  ['dtLine','dtHLine','dtRay','dtRect','dtFib','dtNote','dtPointer'].forEach(id=>{
    document.getElementById(id)?.classList.remove('on');
    // also sync right panel rp-dtool buttons that share the same id
  });
  document.querySelectorAll('.rp-dtool').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.dtool').forEach(b=>b.classList.remove('on'));
  if(tool){
    const capTool = 'dt'+tool.charAt(0).toUpperCase()+tool.slice(1);
    document.getElementById(capTool)?.classList.add('on');
  } else {
    document.getElementById('dtPointer')?.classList.add('on');
  }
  updateDrawCount();
}

function setDrawColor(color, btnId) {
  DRW.color = color;
  // Sync all color swatches — both .draw-color (mobile) and .rp-color (right panel)
  document.querySelectorAll('.draw-color,.rp-color').forEach(b=>b.classList.remove('on'));
  document.getElementById(btnId)?.classList.add('on');
  saveState();
}

function undoDraw() {
  DRW.drawings.pop();
  DRW.pending = null;
  updateDrawCount();
  renderChart();
  saveState();
}

function clearDrawings() {
  DRW.drawings = [];
  DRW.pending  = null;
  updateDrawCount();
  renderChart();
  saveState();
}

function updateDrawCount() {
  const el = document.getElementById('drawCount');
  if(el) el.textContent = DRW.drawings.length ? DRW.drawings.length+' drawings' : '';
}


/* ══════════════════ PRICES ══════════════════ */
// CryptoCompare pricemultifull: prices, 24h change, mcap, volume — CORS-safe
async function loadPrices(){
  try{
    const ids = ST.wl.map(c => c.id).join(',');
    const url  = `${CG}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    const res  = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error(res.status);
    const data = await res.json();
    const prev = {};
    ST.wl.forEach(c => prev[c.id] = c.price || 0);
    ST.wl.forEach(c => {
      const d = data[c.id];
      if(!d) return;
      c.price  = d.usd || 0;
      c.change = d.usd_24h_change || 0;
      c.mcap   = d.usd_market_cap || 0;
      c.vol    = d.usd_24h_vol || 0;
      if(c.id === ST.coin.id){ Object.assign(ST.coin, c); updateHdr(c); }
    });
    setDot('ok');
    renderWL(prev);
  }catch(e){
    console.warn('loadPrices failed:', e);
    setDot('err');
  }
}

// Fetch price + basic info for a single symbol from CryptoCompare
async function fetchCCPrice(sym){
  const url = `${CC_TOP}/pricemultifull?fsyms=${sym}&tsyms=USD`;
  const res = await fetch(url, {headers:{'Accept':'application/json'}});
  if(!res.ok) throw new Error(res.status);
  const json = await res.json();
  const data = json.RAW?.[sym]?.USD;
  if(!data) throw new Error('no_data');
  return {
    price : data.PRICE            || 0,
    change: data.CHANGEPCT24HOUR  || 0,
    mcap  : data.MKTCAP           || 0,
    vol   : data.VOLUME24HOURTO   || 0,
    image : data.IMAGEURL ? 'https://www.cryptocompare.com'+data.IMAGEURL : '',
  };
}

/* ══════════════════ CHART DATA ══════════════════ */
// ── CryptoCompare API ──────────────────────────────────────────────────────
// • Full CORS support for browser fetch requests (no proxy needed)
// • Free tier: no key required for public endpoints, full history back to 2013
// • Up to 2000 candles per request, unlimited history via pagination
// • Covers 5000+ coins
const CC     = 'https://min-api.cryptocompare.com/data/v2';
const CC_TOP = 'https://min-api.cryptocompare.com/data';
// CoinGecko is kept only for search/trending (still has CORS on those endpoints)
const CG     = 'https://api.coingecko.com/api/v3';

// Map CoinGecko coin ID → CryptoCompare symbol
const CC_SYM = {
  'bitcoin':'BTC','ethereum':'ETH','solana':'SOL','binancecoin':'BNB',
  'ripple':'XRP','dogecoin':'DOGE','cardano':'ADA','polkadot':'DOT',
  'avalanche-2':'AVAX','chainlink':'LINK','polygon':'MATIC','uniswap':'UNI',
  'litecoin':'LTC','stellar':'XLM','cosmos':'ATOM','monero':'XMR',
  'tron':'TRX','ethereum-classic':'ETC','near':'NEAR','algorand':'ALGO',
  'fantom':'FTM','hedera-hashgraph':'HBAR','vechain':'VET','filecoin':'FIL',
  'aave':'AAVE','maker':'MKR','compound-governance-token':'COMP',
  'the-sandbox':'SAND','decentraland':'MANA','axie-infinity':'AXS',
  'shiba-inu':'SHIB','pepe':'PEPE','floki':'FLOKI',
  'bitcoin-cash':'BCH','eos':'EOS','dash':'DASH','zcash':'ZEC',
  'the-open-network':'TON','sui':'SUI','aptos':'APT',
  'arbitrum':'ARB','optimism':'OP','injective-protocol':'INJ',
  'sei-network':'SEI','celestia':'TIA','worldcoin-wld':'WLD',
  'render-token':'RNDR','fetch-ai':'FET','singularitynet':'AGIX',
  'ocean-protocol':'OCEAN','gala':'GALA','immutable-x':'IMX',
  'flow':'FLOW','chiliz':'CHZ','enjincoin':'ENJ','blur':'BLUR',
  'lido-dao':'LDO','curve-dao-token':'CRV','synthetix-network-token':'SNX',
  'the-graph':'GRT','basic-attention-token':'BAT','0x':'ZRX',
  'decred':'DCR','qtum':'QTUM','zilliqa':'ZIL','icon':'ICX',
  'ontology':'ONT','nano':'XNO','wax':'WAXP','band-protocol':'BAND',
  'kyber-network-crystal':'KNC','loopring':'LRC','storj':'STORJ',
  'ankr':'ANKR','celer-network':'CELR','api3':'API3',
};

// TF → CryptoCompare endpoint + candle count
// histominute: up to 7 days, 2000 limit
// histohour:   up to 3 months, 2000 limit  
// histoday:    unlimited history, 2000 limit per call
const CG_TF = {
  '1': '1', '7': '7', '30': '30', '90': '90', '365': '365', '1825': 'max', 'max': 'max'
};
const CG_TF_EXACT = {
  '1': '1', '7': '7', '30': '30', '365': '365'
};

async function fetchCCChart(sym, tf) {
  const cfg = CC_TF[tf] || CC_TF['30'];
  const allCandles = [];
  let toTs = '';         // empty = latest
  const totalNeeded = cfg.lim;
  const perPage = 2000;  // CC max per request
  let fetched = 0;

  while(fetched < totalNeeded) {
    const batchLim = Math.min(perPage, totalNeeded - fetched);
    const tsParam  = toTs ? `&toTs=${toTs}` : '';
    const url = `${CC}/${cfg.ep}?fsym=${sym}&tsym=USD&limit=${batchLim}&aggregate=${cfg.agg}${tsParam}`;
    const res = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error('cc_http_' + res.status);
    const json = await res.json();
    if(json.Response === 'Error' || !json.Data?.Data?.length) break;

    const batch = json.Data.Data;
    // Prepend (older data goes in front)
    allCandles.unshift(...batch.map(c => ({
      t: c.time * 1000,   // CC uses seconds, we need ms
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volumefrom
    })));

    fetched += batch.length;
    // If we got less than requested, we've hit the beginning of history
    if(batch.length < batchLim) break;
    // Move window back for next page
    toTs = json.Data.TimeFrom - 1;
    // Only do multiple pages for 5y and max
    if(tf !== '1825' && tf !== 'max') break;
  }

  // Remove any zero-price candles (before coin existed)
  return allCandles.filter(c => c.c > 0 && c.o > 0);
}

async function fetchCGChart(id, tf) {
  const days = CG_TF[tf] || '30';
  const url = `${CG}/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url, {headers:{'Accept':'application/json'}});
  if(!res.ok) throw new Error('cg_http_' + res.status);
  const data = await res.json();
  
  return data.map(c => ({
    t: c[0],
    o: c[1],
    h: c[2],
    l: c[3],
    c: c[4],
    v: 0
  })).filter(c => c.c > 0 && c.o > 0);
}

async function loadChart(id, days) {
  document.getElementById('cLoad').style.display = 'flex';
  ST.candles = [];
  try {
    const sym = CC_SYM[id] || id.toUpperCase().split('-')[0];
    const candles = await fetchCGChart(id, days);

    if (!candles.length) throw new Error('no_data');

    ST.candles = candles;
    setDot('ok');
    // Load mini charts for all timeframes (non-blocking)
    loadMiniCharts(id);
    // Sync active mini chart highlight
    const tfMap2={'1':'mc1d','7':'mc1w','30':'mc1m','365':'mc1y'};
    document.querySelectorAll('.mc-item').forEach(b=>b.classList.remove('active'));
    if(tfMap2[days]) document.getElementById(tfMap2[days])?.classList.add('active');

    // Show last 120 candles; user can drag/scroll back to see older data
    const view = Math.min(120, ST.candles.length);
    ST.zoom = { s: Math.max(0, ST.candles.length - view), r: view };
    renderChart();
  } catch(err) {
    console.warn('loadChart failed:', err.message || err);
    setDot('err');
    synthCandles();
    renderChart();
  }
  document.getElementById('cLoad').style.display = 'none';
}

function synthCandles(){
  let p=ST.coin.price||1000;ST.candles=[];const now=Date.now();
  for(let i=90;i>=0;i--){
    const o=p,v=p*.01,cl=o+(Math.random()-.49)*p*.009+(Math.random()-.5)*v;
    ST.candles.push({t:now-i*86400000,o,h:Math.max(o,cl)+Math.random()*v*.5,l:Math.min(o,cl)-Math.random()*v*.5,c:cl,v:1e6+Math.random()*9e6});
    p=cl;
  }
  ST.zoom={s:10,r:80};
}

/* ══════════════════ SEARCH ══════════════════ */
// Setup search input listeners properly
function setupSearch(){
  const inp=document.getElementById('sbIn');
  const xBtn=document.getElementById('sbXBtn');
  inp.addEventListener('input',()=>{
    const q=inp.value.trim();
    clearTimeout(ST.sbt);
    const dd=document.getElementById('sbDrop');
    if(q.length<2){dd.classList.remove('show');return;}
    dd.innerHTML='<div class="sd-msg"><div class="spin" style="display:inline-block;width:14px;height:14px;border-width:1.5px;vertical-align:middle;margin-right:6px;"></div>Searching…</div>';
    dd.classList.add('show');
    ST.sbt=setTimeout(()=>doSearch(q),400);
  });
  xBtn.addEventListener('click',clearSearch);
  document.addEventListener('click',e=>{if(!e.target.closest('.sb-top'))clearSearch();});
}

async function doSearch(q){
  const dd = document.getElementById('sbDrop');
  try{
    // Search CC coinlist for matching names/symbols
    const url  = `${CC_TOP}/all/coinlist?summary=true`;
    const res  = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error(res.status);
    const json = await res.json();
    const qlo  = q.toLowerCase();
    const all  = Object.values(json.Data || {});
    // Find coins where symbol or name contains query — prefer exact symbol matches first
    const matched = all
      .filter(c => c.Symbol?.toLowerCase().includes(qlo) || c.CoinName?.toLowerCase().includes(qlo))
      .sort((a,b2) => {
        const as = a.Symbol?.toLowerCase() === qlo ? -2 : a.Symbol?.toLowerCase().startsWith(qlo) ? -1 : 0;
        const bs = b2.Symbol?.toLowerCase() === qlo ? -2 : b2.Symbol?.toLowerCase().startsWith(qlo) ? -1 : 0;
        return as - bs;
      })
      .slice(0, 15);

    if(!matched.length){ dd.innerHTML='<div class="sd-msg">No results for "'+q+'"</div>'; return; }

    // Fetch live prices for matched coins
    const syms = matched.map(c=>c.Symbol).join(',');
    const pr   = await fetch(`${CC_TOP}/pricemultifull?fsyms=${syms}&tsyms=USD`, {headers:{'Accept':'application/json'}});
    const raw  = pr.ok ? (await pr.json()).RAW || {} : {};
    const inWL = new Set(ST.wl.map(c => CC_SYM[c.id] || c.symbol.toUpperCase()));

    dd.innerHTML = `<div class="sd-hdr"><span>${matched.length} results</span><span>Click to view chart</span></div>` +
      matched.map(c => {
        const sym  = c.Symbol;
        const d    = raw[sym]?.USD || {};
        const inW  = inWL.has(sym);
        const col  = rc(sym);
        const img  = c.ImageUrl
          ? `<img class="sd-img" src="https://www.cryptocompare.com${c.ImageUrl}" alt="" onerror="this.outerHTML='<div class=sd-fb style=background:${col}22;color:${col};>${sym.substring(0,3)}</div>'">`
          : `<div class="sd-fb" style="background:${col}22;color:${col};">${sym.substring(0,3)}</div>`;
        const price  = d.PRICE;
        const change = d.CHANGEPCT24HOUR;
        const coinId = sym.toLowerCase();
        return `<div class="sd-r">
          <div style="display:flex;align-items:center;gap:9px;flex:1;min-width:0;cursor:pointer;"
               onclick="selectCoin('${coinId}','${esc(c.CoinName||sym)}','${sym}','${c.ImageUrl?'https://www.cryptocompare.com'+c.ImageUrl:''}')">
            ${img}
            <div class="sd-info">
              <div class="sd-name">${c.CoinName||sym}</div>
              <div class="sd-sym">${sym}</div>
            </div>
            <div class="sd-right">
              ${price  ? `<span class="sd-price">$${fP(price)}</span>` : ''}
              ${change != null ? `<span class="sd-chg ${change>=0?'pos':'neg'}">${change>=0?'+':''}${change.toFixed(2)}%</span>` : ''}
            </div>
          </div>
          <button class="sd-add${inW?' done':''}"
                  onclick="sbAddWL('${coinId}','${esc(c.CoinName||sym)}','${sym}','${c.ImageUrl?'https://www.cryptocompare.com'+c.ImageUrl:''}',this)">
            ${inW?'✓ Added':'+ WL'}
          </button>
        </div>`;
      }).join('');
  }catch(e){
    console.warn('doSearch failed:', e);
    dd.innerHTML = '<div class="sd-msg">Search failed — please try again</div>';
  }
}
function clearSearch(){
  document.getElementById('sbIn').value='';
  document.getElementById('sbDrop').classList.remove('show');
}

async function sbAddWL(id,name,sym,img,btn){
  btn.textContent='…';btn.disabled=true;
  await addToWL(id,name,sym,img);
  btn.textContent='✓ Added';btn.className='sd-add done';btn.disabled=false;
}

/* ══════════════════ COIN SELECT & WATCHLIST ══════════════════ */
async function selectCoin(id, name, sym, img){
  clearSearch();
  const tmRes = document.getElementById('tmResult');
  if(tmRes){ tmRes.classList.remove('show'); tmRes.innerHTML=''; }

  const ccSym = CC_SYM[id] || (sym||id).toUpperCase().split('-')[0];
  let coin = {id, name, symbol: ccSym, image: img||'', price:0, change:0, mcap:0, vol:0, ath:0};
  try{
    const p = await fetchCGPrice(id);
    Object.assign(coin, p);
    if(!coin.image && img) coin.image = img;
  }catch(e){ console.warn('selectCoin price fetch failed:', e); }

  Object.assign(ST.coin, coin);
  updateHdr(ST.coin);
  updateAlertCoinName();
  renderWL({});
  await loadChart(id, ST.tf);
  saveState();
}

async function addToWL(id, name, sym, img){
  if(ST.wl.find(c=>c.id===id)){ await selectCoin(id,name,sym,img); return; }
  const ccSym = CC_SYM[id] || (sym||id).toUpperCase().split('-')[0];
  ST.wl.push({id, name, symbol:ccSym, image:img||'', price:0, change:0, mcap:0, vol:0});
  renderWL({});
  saveState();
  // Fetch live price for the new coin and update
  try{
    const p = await fetchCGPrice(id);
    const i = ST.wl.findIndex(c=>c.id===id);
    if(i>-1) Object.assign(ST.wl[i], p, {symbol:ccSym, image: p.image||img||''});
    renderWL({});
  }catch(e){}
}

function removeFromWL(id,e){
  e.stopPropagation();if(ST.wl.length<=1)return;
  ST.wl=ST.wl.filter(c=>c.id!==id);
  saveState();
  if(ST.coin.id===id)selectCoinByIdx(0);else renderWL({});
}

function renderWL(prev){
  const el=document.getElementById('wlList');
  el.innerHTML=ST.wl.map((c,i)=>{
    const on=c.id===ST.coin.id?' on':'',col=rc(c.symbol||'');
    const sign=c.change>=0?'+':'',cls=c.change>=0?'pos':'neg';
    const fl=prev&&prev[c.id]&&c.price>0?(c.price>prev[c.id]?' fg':c.price<prev[c.id]?' fr':''):'';
    const img=c.image?`<img class="cc-img" src="${c.image}" alt="" onerror="this.outerHTML='<div class=cc-fb style=background:${col}22;color:${col};>${(c.symbol||'?').substring(0,3)}</div>'">`:`<div class="cc-fb" style="background:${col}22;color:${col};">${(c.symbol||'?').substring(0,3)}</div>`;
    return`<div class="cc${on}${fl}" onclick="selectCoinByIdx(${i})">${img}
      <div class="cc-info"><div class="cc-name">${c.name}</div><div class="cc-sym">${c.symbol||''}/USD</div></div>
      <div class="cc-r"><div class="cc-price">${c.price?'$'+fP(c.price):'—'}</div><div class="cc-chg ${cls}">${c.price?sign+c.change.toFixed(2)+'%':'—'}</div></div>
      <button class="cc-rm" onclick="removeFromWL('${c.id}',event)">✕</button>
      <button class="cc-info-btn"
        data-id="${c.id}" data-name="${esc(c.name)}" data-sym="${c.symbol||''}" data-img="${esc(c.image||'')}"
        onmouseenter="cipHover(this)" onmouseleave="hideCoinInfo()"
        onclick="event.stopPropagation()">ℹ info</button>
    </div>`;
  }).join('');
}

async function selectCoinByIdx(i){const c=ST.wl[i];await selectCoin(c.id,c.name,c.symbol,c.image||'');}
async function refreshWL(){CACHE.store={};await loadPrices();}

function updateHdr(c){
  const img=document.getElementById('chImg');
  if(c.image){img.src=c.image;img.style.display='block';}else img.style.display='none';
  document.getElementById('chSub').textContent=(c.symbol||'—')+'/USD';
  document.getElementById('chTitle').textContent=c.name||'—';
  if(c.price)document.getElementById('chPrice').textContent='$'+fP(c.price);
  if(c.change!=null){const b=document.getElementById('chBadge'),s=c.change>=0?'+':'';b.textContent=s+c.change.toFixed(2)+'%';b.className='ch-badge '+(c.change>=0?'pos':'neg');}
  if(c.mcap)document.getElementById('chMcap').textContent='MCap: $'+fL(c.mcap);
  if(c.vol)document.getElementById('chVol').textContent='Vol: $'+fL(c.vol);
  if(c.ath)document.getElementById('chATH').textContent='ATH: $'+fP(c.ath);
}

/* ══════════════════ TRENDING ══════════════════ */
async function loadTrending(){
  try{
    // Use CC top gainers over 24h as "trending"
    const url = `${CC_TOP}/top/mktcapfull?limit=7&tsym=USD`;
    const res = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error(res.status);
    const json = await res.json();
    const items = (json.Data||[]).slice(0,7);
    document.getElementById('trList').innerHTML = items.map((item,i) => {
      const info = item.CoinInfo || {};
      const raw  = item.RAW?.USD  || {};
      const sym  = info.Name || '';
      const img  = info.ImageUrl ? 'https://www.cryptocompare.com'+info.ImageUrl : '';
      const ch   = raw.CHANGEPCT24HOUR;
      const id   = sym.toLowerCase();
      return `<div class="tr-r" onclick="selectCoin('${id}','${esc(info.FullName||sym)}','${sym}','${img}')">
        <span class="tr-n">${i+1}</span>
        <img class="tr-img" src="${img}" alt="" onerror="this.style.display='none'">
        <span class="tr-name">${info.FullName||sym}</span>
        <span class="tr-sym">${sym}</span>
        ${ch!=null?`<span class="tr-f ${ch>=0?'pos':'neg'}">${ch>=0?'▲':'▼'}${Math.abs(ch).toFixed(1)}%</span>`:''}
      </div>`;
    }).join('');
  }catch(e){
    document.getElementById('trList').innerHTML='<div style="padding:10px;text-align:center;color:var(--text3);font-size:.75rem;">Unavailable</div>';
  }
}

/* ══════════════════ GLOBAL TICKER ══════════════════ */
async function loadTicker(){
  try{
    const url = `${CC_TOP}/top/mktcapfull?limit=20&tsym=USD`;
    const res = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!res.ok) throw new Error(res.status);
    const json = await res.json();
    const items = json.Data || [];
    const html2 = items.map(item => {
      const info = item.CoinInfo || {};
      const raw  = item.RAW?.USD  || {};
      const sym  = info.Name || '';
      const img  = info.ImageUrl ? 'https://www.cryptocompare.com'+info.ImageUrl : '';
      const pr   = raw.PRICE;
      const ch   = raw.CHANGEPCT24HOUR;
      return `<div class="ti">
        ${img?`<img src="${img}" style="width:12px;height:12px;border-radius:50%;flex-shrink:0;" onerror="this.remove()"> `:''}
        <b>${sym}</b> ${pr?'$'+fP(pr):'—'}
        ${ch!=null?`<span class="${ch>=0?'pos':'neg'}">${ch>=0?'+':''}${ch.toFixed(2)}%</span>`:''}
      </div>`;
    }).join('');
    document.getElementById('tickerTrack').innerHTML = html2 + html2;
  }catch(e){}
}

// Category → top CC symbols to show
// ─── TOKEN BROWSER: CoinGecko-powered ──────────────────────────────────────
// Maps our sort button values → CoinGecko /coins/markets "order" param
const CG_SORT_MAP = {
  'market_cap_desc':       'market_cap_desc',
  'market_cap_asc':        'market_cap_asc',
  'volume_desc':           'volume_desc',
  'gecko_desc':            'gecko_desc',
  'price_change_desc_24h': 'price_change_desc_24h',
  'price_change_asc_24h':  'price_change_asc_24h',
};

// CoinGecko category slugs
const CG_CATS = {
  '':                             '',
  'layer-1':                      'layer-1',
  'layer-2':                      'layer-2',
  'decentralized-finance-defi':   'decentralized-finance-defi',
  'meme-token':                   'meme-token',
  'gaming':                       'gaming',
  'artificial-intelligence':      'artificial-intelligence',
  'stablecoins':                  'stablecoins',
  'real-world-assets-rwa':        'real-world-assets-rwa',
  'non-fungible-tokens-nft':      'non-fungible-tokens-nft',
};

function openModal(){
  document.getElementById('modalBg').classList.remove('hide');
  document.getElementById('mSrch').value='';
  ST.mb.q=''; ST.mb.page=1;
  fetchModal();
}
function closeModal(){ document.getElementById('modalBg').classList.add('hide'); }
function mBgClick(e){ if(e.target===document.getElementById('modalBg'))closeModal(); }

function setMCat(btn,cat){
  document.querySelectorAll('.mc').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  ST.mb.cat=cat; ST.mb.page=1;
  // Reset search when switching categories
  document.getElementById('mSrch').value='';
  ST.mb.q='';
  fetchModal();
}

function setMSort(btn,sort){
  document.querySelectorAll('.msb').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  ST.mb.sort=sort; ST.mb.page=1;
  fetchModal();
}

function setupModalSearch(){
  document.getElementById('mSrch').addEventListener('input',function(){
    ST.mb.q=this.value.trim(); ST.mb.page=1;
    clearTimeout(ST.mbt); ST.mbt=setTimeout(fetchModal,380);
  });
}

let _fetchModalAbort = null;
async function fetchModal(){
  // Cancel any previous in-flight request
  if (_fetchModalAbort) { _fetchModalAbort.abort(); }
  _fetchModalAbort = new AbortController();
  const sig = _fetchModalAbort.signal;

  const tg = document.getElementById('tGrid');
  tg.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text3);font-family:'Share Tech Mono',monospace;"><div class="spin" style="margin:0 auto 12px;"></div>Loading tokens…</div>`;
  document.getElementById('mPg').innerHTML = '';
  const b = ST.mb;

  try {
    let data = [];

    if (b.q.length >= 2) {
      // ── SEARCH: /search for IDs, then /coins/markets for prices ──────────
      const sr = await cgFetch(`/search?query=${encodeURIComponent(b.q)}`, 30000, sig);
      const allCoins = sr.coins || [];
      b.total = allCoins.length;
      const pageCoins = allCoins.slice((b.page - 1) * b.per, b.page * b.per);
      if (!pageCoins.length) {
        tg.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text3);">No results found for "${b.q}"</div>`;
        return;
      }
      const ids = pageCoins.map(c => c.id).join(',');
      let priceMap = {};
      try {
        const pd = await cgFetch(`/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`, 45000, sig);
        pd.forEach(d => priceMap[d.id] = d);
      } catch(e) {}
      data = pageCoins.map(c => {
        const p = priceMap[c.id];
        return {
          id:     c.id,
          name:   c.name,
          symbol: (c.symbol || '').toUpperCase(),
          price:  p ? p.current_price : null,
          change: p ? p.price_change_percentage_24h : null,
          mcap:   p ? p.market_cap : null,
          vol:    p ? p.total_volume : null,
          image:  (p && p.image) ? p.image : (c.thumb || ''),
          rank:   p ? p.market_cap_rank : (c.market_cap_rank || null),
        };
      });

    } else {
      // ── BROWSE: /coins/markets with category + sort ───────────────────────
      const cat  = CG_CATS[b.cat] || '';
      const catParam = cat ? `&category=${encodeURIComponent(cat)}` : '';
      // Gainers/Losers aren't available on free tier as server-side sort.
      // Fetch top 250 by mcap and sort client-side.
      const needsClientSort = (b.sort === 'price_change_desc_24h' || b.sort === 'price_change_asc_24h');
      const serverSort  = needsClientSort ? 'market_cap_desc' : (CG_SORT_MAP[b.sort] || 'market_cap_desc');
      const fetchPer    = needsClientSort ? 250 : b.per;
      const fetchPage   = needsClientSort ? 1   : b.page;
      const url = `/coins/markets?vs_currency=usd${catParam}&order=${serverSort}&per_page=${fetchPer}&page=${fetchPage}&sparkline=false&price_change_percentage=24h`;
      let raw = await cgFetch(url, needsClientSort ? 600000 : 600000, sig);

      const mapCoin = d => ({
        id:     d.id,
        name:   d.name,
        symbol: (d.symbol || '').toUpperCase(),
        price:  d.current_price     != null ? d.current_price     : null,
        change: d.price_change_percentage_24h != null ? d.price_change_percentage_24h : null,
        mcap:   d.market_cap        != null ? d.market_cap        : null,
        vol:    d.total_volume      != null ? d.total_volume      : null,
        image:  d.image  || '',
        rank:   d.market_cap_rank   || null,
        high24: d.high_24h          || null,
        low24:  d.low_24h           || null,
      });

      if (needsClientSort) {
        const asc = (b.sort === 'price_change_asc_24h');
        raw.sort((a, z) => {
          const av = (a.price_change_percentage_24h != null) ? a.price_change_percentage_24h : (asc ? Infinity : -Infinity);
          const zv = (z.price_change_percentage_24h != null) ? z.price_change_percentage_24h : (asc ? Infinity : -Infinity);
          return asc ? av - zv : zv - av;
        });
        b.total = raw.length;
        raw = raw.slice((b.page - 1) * b.per, b.page * b.per);
      } else {
        b.total = cat ? Math.max(raw.length, b.per * b.page) : 18000;
      }
      data = raw.map(mapCoin);
    }

    b.data = data;
    document.getElementById('mCnt').textContent = b.q ? `${b.total} results` : `Page ${b.page}`;
    renderModal();
    renderMPg();

  } catch(err) {
    if (err && err.name === 'AbortError') return; // cancelled by newer request, ignore
    console.error('fetchModal error:', err);
    tg.innerHTML = `<div style="grid-column:1/-1;padding:32px 20px;text-align:center;color:var(--text3);font-family:'Share Tech Mono',monospace;line-height:2;">
      <div style="font-size:1.5rem;margin-bottom:8px;">⚠</div>
      <div style="color:var(--text);margin-bottom:8px;">Could not load token data</div>
      <div style="font-size:.75rem;margin-bottom:16px;">${err.message === 'Rate limited (429)' ? '⏳ CoinGecko rate limit hit. Wait 30 seconds and try again.' : 'Error: '+(err.message||'Network error')}</div>
      <button onclick="fetchModal()" style="background:rgba(0,212,255,.1);border:1px solid var(--accent);color:var(--accent);font-family:'Share Tech Mono',monospace;font-size:.78rem;padding:8px 20px;border-radius:5px;cursor:pointer;margin-top:4px;">↻ Try Again</button>
    </div>`;
  }
}

// cgFetch: direct fetch for modal/popup — bypasses queue, has own cache + retry
// Separate from the background apiFetch queue so UI feels instant
let _cgAbort = null; // cancel previous in-flight modal request

async function cgFetch(path, ttl=60000, signal=null) {
  const url = getUrl(path);
  const hit = CACHE.get(url);
  if (hit) return hit;

  const delays = [0, 5000, 12000]; // immediate, then backoff on rate limit
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Show waiting message in modal
      const tg = document.getElementById('tGrid');
      if (tg && tg.innerHTML.includes('spin')) {
        tg.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text3);font-family:'Share Tech Mono',monospace;">
          <div class="spin" style="margin:0 auto 12px;"></div>
          Rate limited — retrying in ${delays[attempt]/1000}s…
        </div>`;
      }
      await sleep(delays[attempt]);
    }
    try {
      const opts = { headers: { 'Accept': 'application/json' } };
      if (signal) opts.signal = signal;
      const r = await fetch(url, opts);
      if (r.status === 429) {
        lastErr = new Error('Rate limited (429)');
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (ttl > 0) CACHE.set(url, data, ttl);
      setDot('ok');
      return data;
    } catch(e) {
      if (e.name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  setDot('err');
  throw lastErr || new Error('Request failed');
}

function renderModal(){
  const inWL=new Set(ST.wl.map(c=>c.id));
  document.getElementById('tGrid').innerHTML=ST.mb.data.map(c=>{
    const inW=inWL.has(c.id);
    const col=rc(c.symbol||'');
    const img=c.image
      ?`<img class="tc-img" src="${c.image}" alt="" onerror="this.outerHTML='<div class=tc-fb style=background:${col}22;color:${col};>${(c.symbol||'?').substring(0,3)}</div>'">`
      :`<div class="tc-fb" style="background:${col}22;color:${col};">${(c.symbol||'?').substring(0,3)}</div>`;
    const ch=c.change;
    const chStr=ch!=null?`<span class="tc-ch ${ch>=0?'pos':'neg'}">${ch>=0?'+':''}${ch.toFixed(2)}%</span>`:'';
    return`<div class="tc${inW?' wl':''}">
      <div class="tc-t">${img}
        <div style="flex:1;min-width:0;">
          <div class="tc-nm">${c.name}</div>
          <div class="tc-sy">${c.symbol}</div>
          ${c.rank?`<div class="tc-rk">#${c.rank}</div>`:''}
        </div>
        ${chStr}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:4px;">
        <div>
          <div class="tc-pr">${c.price!=null?'$'+fP(c.price):'—'}</div>
          ${c.mcap?`<div class="tc-mc">MCap: $${fL(c.mcap)}</div>`:''}
        </div>
        ${c.high24?`<div style="font-family:'Share Tech Mono',monospace;font-size:.6rem;color:var(--text3);text-align:right;">H: $${fP(c.high24)}<br>L: $${fP(c.low24)}</div>`:''}
      </div>
      <div class="tc-btns">
        <button class="tc-view" onclick="selectCoin('${c.id}','${esc(c.name)}','${c.symbol}','${c.image||''}');closeModal()">📊 Chart</button>
        <button class="tc-add${inW?' done':''}" id="tadd_${c.id}" onclick="mAdd('${c.id}','${esc(c.name)}','${c.symbol}','${c.image||''}')">${inW?'✓ Watch':'+ Watch'}</button>
      </div>
    </div>`;
  }).join('');
}

async function mAdd(id,name,sym,img){
  const btn=document.getElementById('tadd_'+id);
  if(btn){btn.textContent='…';btn.disabled=true;}
  await addToWL(id,name,sym,img);
  if(btn){btn.textContent='✓ Watch';btn.className='tc-add done';btn.disabled=false;}
  const card=btn?.closest('.tc');
  if(card)card.classList.add('wl');
}

function renderMPg(){
  const b=ST.mb,tp=b.q?Math.ceil(b.total/b.per):20;
  if(tp<=1){document.getElementById('mPg').innerHTML='';return;}
  let h=`<button class="pb" onclick="mPage(${b.page-1})" ${b.page<=1?'disabled':''}>‹ Prev</button>`;
  const st=Math.max(1,b.page-2),en=Math.min(tp,b.page+2);
  if(st>1)h+=`<button class="pb" onclick="mPage(1)">1</button>${st>2?'<span class="pi">…</span>':''}`;
  for(let i=st;i<=en;i++)h+=`<button class="pb${i===b.page?' on':''}" onclick="mPage(${i})">${i}</button>`;
  if(en<tp)h+=`${en<tp-1?'<span class="pi">…</span>':''}<button class="pb" onclick="mPage(${tp})">${tp}</button>`;
  h+=`<button class="pb" onclick="mPage(${b.page+1})" ${b.page>=tp?'disabled':''}>Next ›</button><span class="pi">${b.page} / ${tp}</span>`;
  document.getElementById('mPg').innerHTML=h;
}
function mPage(p){if(p<1)return;ST.mb.page=p;fetchModal();document.querySelector('.m-body').scrollTop=0;}


/* ══════════════════ CHART RENDERING ══════════════════ */
function renderChart(){
  const zone = document.getElementById('chartZone');
  const W    = zone.clientWidth || 800;
  const showRSI  = ST.inds.has('rsi');
  const showMACD = ST.inds.has('macd');

  // Sub-panel heights
  const subH  = 60;
  const rsiH  = showRSI  ? 90 : 0;
  const macdH = showMACD ? 90 : 0;
  const totalH = zone.clientHeight || 460;
  const pH = Math.max(140,
    totalH - subH - 16
            - (showRSI  ? rsiH  + 18 : 0)
            - (showMACD ? macdH + 18 : 0));

  // Canvas setup
  const pc    = document.getElementById('priceCanvas');
  const vc    = document.getElementById('volCanvas');
  const rsiC  = document.getElementById('rsiCanvas');
  const macdC = document.getElementById('macdCanvas');
  pc.width=W; pc.height=pH;
  vc.width=W; vc.height=subH; vc.style.display='block';
  document.getElementById('volLbl').style.display='block';
  rsiC.style.display  = showRSI  ? 'block' : 'none';
  macdC.style.display = showMACD ? 'block' : 'none';
  document.getElementById('rsiLbl').style.display  = showRSI  ? 'block' : 'none';
  document.getElementById('macdLbl').style.display = showMACD ? 'block' : 'none';
  if(showRSI) { rsiC.width=W;  rsiC.height=rsiH; }
  if(showMACD){ macdC.width=W; macdC.height=macdH; }

  if(!ST.candles.length) return;
  const {s,r} = ST.zoom;
  const vis = ST.candles.slice(Math.max(0,s), Math.min(ST.candles.length,s+r));
  if(!vis.length) return;

  // Layout constants
  const PAD_T=18, PAD_B=22, PAD_L=8, PAD_R=82;
  const cW = W - PAD_L - PAD_R;
  const cH = pH - PAD_T - PAD_B;
  const cw = cW / vis.length;
  const toX = i => PAD_L + (i+0.5)*cw;

  // Price range with 6% breathing room
  const allPx = vis.flatMap(c=>[c.h,c.l]);
  const rawMn = Math.min(...allPx), rawMx = Math.max(...allPx);
  const rp    = (rawMx-rawMn)*0.06 || rawMn*0.02 || 1;
  const minP  = rawMn-rp, maxP = rawMx+rp, pRange = maxP-minP;
  const toY   = v => PAD_T + (1-(v-minP)/pRange)*cH;

  const ctx = pc.getContext('2d');
  ctx.clearRect(0,0,W,pH);

  // ── Horizontal grid + price labels ──
  for(let g=0;g<=5;g++){
    const y = PAD_T + (g/5)*cH;
    const p = maxP - (g/5)*pRange;
    ctx.strokeStyle='rgba(26,45,74,.2)'; ctx.lineWidth=1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(PAD_L,y); ctx.lineTo(W-PAD_R,y); ctx.stroke();
    ctx.fillStyle='rgba(122,156,192,.55)';
    ctx.font='9px Share Tech Mono'; ctx.textAlign='left';
    ctx.fillText('$'+fP(p), W-PAD_R+5, y+3.5);
  }
  // Vertical grid
  const vgStep = Math.max(1,Math.floor(vis.length/6));
  ctx.strokeStyle='rgba(26,45,74,.09)'; ctx.lineWidth=.5;
  for(let i=0;i<vis.length;i+=vgStep){
    ctx.beginPath(); ctx.moveTo(toX(i),PAD_T); ctx.lineTo(toX(i),PAD_T+cH); ctx.stroke();
  }

  // ── Bollinger Bands ──
  if(ST.inds.has('bb')){
    const P=20,M=2, upPts=[],loPts=[],midPts=[];
    for(let i=0; i<vis.length; i++){
      const gi = ST.zoom.s + i;
      let sl = [];
      for(let j=P-1; j>=0; j--){
         let idx = gi - j;
         sl.push(idx >= 0 ? ST.candles[idx] : ST.candles[0]);
      }
      const avg=sl.reduce((s,v)=>s+v.c,0)/P;
      const std=Math.sqrt(sl.reduce((s,v)=>s+(v.c-avg)**2,0)/P);
      upPts.push([toX(i),toY(avg+M*std)]);
      loPts.push([toX(i),toY(avg-M*std)]);
      midPts.push([toX(i),toY(avg)]);
    }
    if(upPts.length){
      ctx.beginPath();
      upPts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      [...loPts].reverse().forEach(([x,y])=>ctx.lineTo(x,y));
      ctx.closePath(); ctx.fillStyle='rgba(100,200,255,.05)'; ctx.fill();
    }
    for(const pts of [upPts,loPts]){
      ctx.beginPath(); ctx.strokeStyle='rgba(100,200,255,.45)'; ctx.lineWidth=1; ctx.setLineDash([]);
      pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
    }
    ctx.beginPath(); ctx.strokeStyle='rgba(100,200,255,.2)'; ctx.lineWidth=.8; ctx.setLineDash([4,4]);
    midPts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
    ctx.setLineDash([]);
    if(upPts.length){ const[,y]=upPts[upPts.length-1]; ctx.fillStyle='rgba(100,200,255,.7)'; ctx.font='8px Share Tech Mono'; ctx.textAlign='left'; ctx.fillText('BB+',W-PAD_R+5,y+3); }
  }

  // ── MA(20) ──
  if(ST.inds.has('ma')){
    const pts=[];
    const P = 20;
    for(let i=0; i<vis.length; i++){
      const gi = ST.zoom.s + i;
      let sum = 0;
      for (let j = 0; j < P; j++) {
        const idx = gi - j;
        sum += idx >= 0 ? ST.candles[idx].c : ST.candles[0].c;
      }
      pts.push([toX(i), toY(sum / P)]);
    }
    if(pts.length){
      ctx.beginPath(); ctx.strokeStyle='rgba(255,200,0,.88)'; ctx.lineWidth=1.8; ctx.setLineDash([]);
      pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
      const[,ly]=pts[pts.length-1]; ctx.fillStyle='rgba(255,200,0,.9)'; ctx.font='bold 8px Share Tech Mono'; ctx.textAlign='left'; ctx.fillText('MA20',W-PAD_R+5,ly+3);
    }
  }

  // ── EMA(50) ──
  if(ST.inds.has('ema')){
    let ema=ST.candles[0]?.c||0; const k=2/51, pts=[];
    for(let gi=0; gi<ST.candles.length; gi++){
      ema = ST.candles[gi].c * k + ema * (1 - k);
      const vi = gi - ST.zoom.s;
      if (vi >= 0 && vi < vis.length) pts.push([toX(vi), toY(ema)]);
    }
    ctx.beginPath(); ctx.strokeStyle='rgba(255,100,200,.88)'; ctx.lineWidth=1.8; ctx.setLineDash([]);
    pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
    const[,ly]=pts[pts.length-1]; ctx.fillStyle='rgba(255,100,200,.9)'; ctx.font='bold 8px Share Tech Mono'; ctx.textAlign='left'; ctx.fillText('EMA50',W-PAD_R+5,ly+12);
  }

  // ── VWAP ──
  if(ST.inds.has('vwap')){
    let cv=0,cp=0; const pts=[];
    for(let gi=0; gi<ST.candles.length; gi++){
      const v=ST.candles[gi].v||1, tp=(ST.candles[gi].h+ST.candles[gi].l+ST.candles[gi].c)/3;
      cp+=tp*v; cv+=v;
      const vi = gi - ST.zoom.s;
      if (vi >= 0 && vi < vis.length) pts.push([toX(vi), toY(cp/cv)]);
    }
    ctx.beginPath(); ctx.strokeStyle='rgba(0,255,136,.78)'; ctx.lineWidth=1.8; ctx.setLineDash([7,4]);
    pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
    ctx.setLineDash([]);
    const[,ly]=pts[pts.length-1]; ctx.fillStyle='rgba(0,255,136,.9)'; ctx.font='bold 8px Share Tech Mono'; ctx.textAlign='left'; ctx.fillText('VWAP',W-PAD_R+5,ly+21);
  }

  // ── Price chart (Line or Candles) ──
  const goingUp = vis[vis.length-1].c >= vis[0].o;
  if(ST.ct==='line'){
    // Smooth filled area line — green if up, red if down
    const lineRGB = goingUp ? '0,255,136' : '255,51,102';
    // Fill
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(vis[0].c));
    for(let i=1;i<vis.length;i++) ctx.lineTo(toX(i),toY(vis[i].c));
    ctx.lineTo(toX(vis.length-1), PAD_T+cH);
    ctx.lineTo(toX(0),            PAD_T+cH);
    ctx.closePath();
    const gFill = ctx.createLinearGradient(0,PAD_T,0,PAD_T+cH);
    gFill.addColorStop(0,   `rgba(${lineRGB},.20)`);
    gFill.addColorStop(0.7, `rgba(${lineRGB},.04)`);
    gFill.addColorStop(1,   `rgba(${lineRGB},0)`);
    ctx.fillStyle=gFill; ctx.fill();
    // Line
    ctx.beginPath();
    for(let i=0;i<vis.length;i++) i===0?ctx.moveTo(toX(i),toY(vis[i].c)):ctx.lineTo(toX(i),toY(vis[i].c));
    ctx.strokeStyle=`rgba(${lineRGB},1)`; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.setLineDash([]);
    ctx.stroke();
  } else {
    // Candlestick — adaptive sizing
    const bW = Math.max(1, Math.min(cw*0.72, 14));
    const wW = Math.max(.5, Math.min(1.5, cw*0.18));
    for(let i=0;i<vis.length;i++){
      const c=vis[i], x=toX(i), up=c.c>=c.o;
      ctx.strokeStyle = up?'#00ff88':'#ff3366'; ctx.lineWidth=wW; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x,toY(c.h)); ctx.lineTo(x,toY(c.l)); ctx.stroke();
      const bodyTop = toY(Math.max(c.o,c.c));
      const bodyH   = Math.max(1.5, Math.abs(toY(c.o)-toY(c.c)));
      ctx.fillStyle = up?'rgba(0,255,136,.88)':'rgba(255,51,102,.88)';
      ctx.fillRect(x-bW/2, bodyTop, bW, bodyH);
    }
  }

  // ── Live price dashed line + tag ──
  const lc2 = vis[vis.length-1];
  const liveY = toY(lc2.c);
  ctx.setLineDash([5,4]); ctx.strokeStyle='rgba(0,212,255,.32)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(PAD_L,liveY); ctx.lineTo(W-PAD_R,liveY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,212,255,.95)';
  if(ctx.roundRect) ctx.roundRect(W-PAD_R+1,liveY-9,PAD_R-2,18,3);
  else ctx.rect(W-PAD_R+1,liveY-9,PAD_R-2,18);
  ctx.fill();
  ctx.fillStyle='#050810'; ctx.font='bold 9px Share Tech Mono'; ctx.textAlign='center';
  ctx.fillText('$'+fP(lc2.c), W-PAD_R+1+(PAD_R-2)/2, liveY+4);

  // ── User Drawings ──────────────────────────────────────────────────
  ctx.save();
  const allDrawings = DRW.pending ? [...DRW.drawings, DRW.pending] : DRW.drawings;
  for(const d of allDrawings){
    const alpha = d === DRW.pending ? 0.65 : 0.85;
    ctx.globalAlpha = alpha;
    ctx.setLineDash([]);
    ctx.strokeStyle = d.color || '#00d4ff';
    ctx.fillStyle   = d.color || '#00d4ff';
    ctx.lineWidth   = 1.8;

    if(d.type === 'hline' && d.p1 != null){
      // Horizontal line at a fixed price level
      const y = priceToY(d.p1.price, pH);
      ctx.strokeStyle = d.color;
      ctx.beginPath(); ctx.moveTo(PAD_L,y); ctx.lineTo(W-PAD_R,y); ctx.stroke();
      // Price label
      ctx.font='bold 9px Share Tech Mono'; ctx.textAlign='right'; ctx.fillStyle=d.color;
      ctx.fillText('$'+fP(d.p1.price), W-PAD_R-3, y-3);
      // Dot on left
      ctx.beginPath(); ctx.arc(PAD_L+6,y,3,0,Math.PI*2); ctx.fill();

    } else if((d.type === 'line' || d.type === 'ray') && d.p1 != null && d.p2 != null){
      const x1 = candleToX(d.p1.gi, W);
      const y1 = priceToY(d.p1.price, pH);
      const x2 = candleToX(d.p2.gi, W);
      const y2 = priceToY(d.p2.price, pH);
      ctx.beginPath();
      if(d.type === 'ray'){
        // Extend line to right edge of canvas
        const dx = x2-x1, dy = y2-y1;
        const t  = dx !== 0 ? (W-PAD_R-x1)/dx : 0;
        ctx.moveTo(x1,y1);
        ctx.lineTo(x1+dx*t, y1+dy*t);
      } else {
        ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      }
      ctx.stroke();
      // End-point dots
      ctx.beginPath(); ctx.arc(x1,y1,3.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2,y2,3.5,0,Math.PI*2); ctx.fill();
      // Price labels at both ends
      ctx.font='bold 9px Share Tech Mono'; ctx.textAlign='left'; ctx.fillStyle=d.color;
      ctx.fillText('$'+fP(d.p1.price), x1+6, y1-4);
      if(d.type==='line') ctx.fillText('$'+fP(d.p2.price), x2+6, y2-4);
      // Show % change between points
      if(d.p1.price && d.p2.price){
        const pct = ((d.p2.price-d.p1.price)/d.p1.price*100).toFixed(2);
        const mid = {x:(x1+x2)/2, y:(y1+y2)/2};
        ctx.font='bold 9px Share Tech Mono';
        ctx.fillStyle='rgba(0,0,0,.7)';
        ctx.fillRect(mid.x-22, mid.y-12, 44, 14);
        ctx.fillStyle=d.color;
        ctx.textAlign='center';
        ctx.fillText((pct>=0?'+':'')+pct+'%', mid.x, mid.y-1);
      }

    } else if(d.type === 'rect' && d.p1 != null && d.p2 != null){
      const x1 = candleToX(d.p1.gi, W);
      const y1 = priceToY(d.p1.price, pH);
      const x2 = candleToX(d.p2.gi, W);
      const y2 = priceToY(d.p2.price, pH);
      const rx  = Math.min(x1,x2), ry  = Math.min(y1,y2);
      const rw2 = Math.abs(x2-x1),  rh2 = Math.abs(y2-y1);
      // Filled zone
      const zoneColor = d.color;
      const r2=parseInt(zoneColor.slice(1,3),16),g2=parseInt(zoneColor.slice(3,5),16),b2=parseInt(zoneColor.slice(5,7),16);
      ctx.fillStyle=`rgba(${r2},${g2},${b2},0.08)`;
      ctx.fillRect(rx,ry,rw2,rh2);
      ctx.strokeRect(rx,ry,rw2,rh2);
      // Price labels top/bottom
      const hiP = d.p1.price > d.p2.price ? d.p1.price : d.p2.price;
      const loP = d.p1.price < d.p2.price ? d.p1.price : d.p2.price;
      ctx.font='bold 9px Share Tech Mono'; ctx.textAlign='left'; ctx.fillStyle=d.color;
      ctx.fillText('$'+fP(hiP), rx+4, ry+11);
      ctx.fillText('$'+fP(loP), rx+4, ry+rh2-3);
      // % range
      const rangePct = Math.abs((hiP-loP)/loP*100).toFixed(2);
      ctx.textAlign='center';
      ctx.fillText(rangePct+'% range', rx+rw2/2, ry+rh2/2+4);

    } else if(d.type === 'fib' && d.p1 != null && d.p2 != null){
      renderFibDrawing(ctx, d, vis, toX, priceToY, W, PAD_L, PAD_R, pH);

    } else if(d.type === 'note' && d.p1 != null && d.text){
      const nx  = candleToX(d.p1.gi, W);
      const ny  = priceToY(d.p1.price, pH);
      ctx.save();
      ctx.font = 'bold 9px Share Tech Mono';
      const tw  = ctx.measureText(d.text).width;
      const bw  = tw + 14, bh = 16;
      const bx  = Math.min(Math.max(nx-bw/2, PAD_L), W-PAD_R-bw);
      const hxN = (d.color||'#00d4ff').replace('#','');
      const rN=parseInt(hxN.slice(0,2),16),gN=parseInt(hxN.slice(2,4),16),bN2=parseInt(hxN.slice(4,6),16);
      ctx.fillStyle=`rgba(${rN},${gN},${bN2},.18)`;
      if(ctx.roundRect) ctx.roundRect(bx,ny-bh-4,bw,bh,3); else ctx.rect(bx,ny-bh-4,bw,bh);
      ctx.fill();
      ctx.strokeStyle=`rgba(${rN},${gN},${bN2},.85)`;
      ctx.lineWidth=1; ctx.setLineDash([]);
      if(ctx.roundRect) ctx.roundRect(bx,ny-bh-4,bw,bh,3); else ctx.rect(bx,ny-bh-4,bw,bh);
      ctx.stroke();
      ctx.fillStyle=d.color||'#00d4ff'; ctx.textAlign='center';
      ctx.fillText(d.text, bx+bw/2, ny-8);
      ctx.strokeStyle=`rgba(${rN},${gN},${bN2},.5)`;
      ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(bx+bw/2,ny-4); ctx.lineTo(bx+bw/2,ny); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=`rgba(${rN},${gN},${bN2},.9)`;
      ctx.beginPath(); ctx.arc(bx+bw/2,ny,3,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha=1; ctx.setLineDash([]);
  ctx.restore();

  // ── Pattern Recognition labels ──
  renderPatterns(ctx, vis, toX, toY, pH, PAD_L, PAD_R, W);

  // ── End Drawings ──────────────────────────────────────────────────────────

  // ── Time axis — year-aware labels ──
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const spanMs2  = vis.length>1?vis[vis.length-1].t-vis[0].t:0;
  const spanDays2= spanMs2/86400000;
  const tStep    = Math.max(1,Math.floor(vis.length/7));
  ctx.fillStyle='rgba(122,156,192,.5)'; ctx.font='9px Share Tech Mono'; ctx.textAlign='center';
  ctx.setLineDash([]);
  for(let i=0;i<vis.length;i+=tStep){
    const t=new Date(vis[i].t); let lbl;
    if(spanDays2>365*2)      lbl=MON[t.getUTCMonth()]+' '+t.getUTCFullYear();
    else if(spanDays2>60)    lbl=MON[t.getUTCMonth()]+' '+t.getUTCDate()+' '+t.getUTCFullYear();
    else if(spanDays2>2)     lbl=(t.getUTCMonth()+1)+'/'+t.getUTCDate()+'/'+(String(t.getUTCFullYear()).slice(2));
    else                     lbl=String(t.getUTCHours()).padStart(2,'0')+':'+String(t.getUTCMinutes()).padStart(2,'0');
    ctx.fillText(lbl, toX(i), pH-5);
  }

  // ── Volume sub-chart ──
  const vctx = vc.getContext('2d');
  vctx.clearRect(0,0,W,subH);
  const maxVol = Math.max(...vis.map(c=>c.v||0),1);
  const vbW    = Math.max(1,Math.min(cw*0.72,14));
  for(let i=0;i<vis.length;i++){
    const c=vis[i], x=toX(i), vh=((c.v||0)/maxVol)*(subH-12);
    vctx.fillStyle=c.c>=c.o?'rgba(0,255,136,.35)':'rgba(255,51,102,.35)';
    vctx.fillRect(x-vbW/2, subH-10-vh, vbW, vh);
  }
  vctx.fillStyle='rgba(122,156,192,.4)'; vctx.font='8px Share Tech Mono'; vctx.textAlign='left';
  vctx.fillText('VOL  Max:$'+fL(maxVol), 6, 10);

  // ── RSI sub-chart ──
  if(showRSI){
    const rctx  = rsiC.getContext('2d');
    rctx.clearRect(0,0,W,rsiH);
    const rVals = calcRSI(ST.candles,14);
    const rv    = rVals.slice(Math.max(0,s), Math.min(rVals.length,s+r));
    const iH    = rsiH-14;
    const toRY  = v => 4+(1-(v/100))*iH;
    // Background zones
    rctx.fillStyle='rgba(255,51,102,.07)'; rctx.fillRect(0,toRY(70),W,toRY(100)-toRY(70));
    rctx.fillStyle='rgba(0,255,136,.07)';  rctx.fillRect(0,toRY(30),W,toRY(0)-toRY(30));
    // Level lines
    for(const lv of [30,50,70]){
      rctx.strokeStyle=lv===50?'rgba(122,156,192,.18)':'rgba(122,156,192,.35)';
      rctx.lineWidth=.8; rctx.setLineDash(lv===50?[4,4]:[]);
      rctx.beginPath(); rctx.moveTo(0,toRY(lv)); rctx.lineTo(W,toRY(lv)); rctx.stroke();
      rctx.setLineDash([]);
      rctx.fillStyle='rgba(122,156,192,.5)'; rctx.font='8px Share Tech Mono'; rctx.textAlign='left';
      rctx.fillText(lv,3,toRY(lv)-2);
    }
    // RSI line
    if(rv.length>1){
      rctx.lineWidth=1.8; rctx.setLineDash([]);
      for(let i=1;i<rv.length;i++){
        if(rv[i]==null) continue;
        rctx.beginPath(); rctx.moveTo(toX(i-1),toRY(rv[i-1]??50)); rctx.lineTo(toX(i),toRY(rv[i]));
        rctx.strokeStyle=rv[i]>70?'rgba(255,51,102,.9)':rv[i]<30?'rgba(0,255,136,.9)':'rgba(255,150,0,.85)';
        rctx.stroke();
      }
      const cur=rv[rv.length-1];
      if(cur!=null){
        const by=toRY(cur);
        const bc=cur>70?'rgba(255,51,102,.9)':cur<30?'rgba(0,255,136,.9)':'rgba(255,150,0,.9)';
        rctx.fillStyle=bc;
        if(rctx.roundRect) rctx.roundRect(W-PAD_R+1,by-8,PAD_R-2,16,3); else rctx.rect(W-PAD_R+1,by-8,PAD_R-2,16);
        rctx.fill();
        rctx.fillStyle='#050810'; rctx.font='bold 9px Share Tech Mono'; rctx.textAlign='center';
        rctx.fillText(cur.toFixed(1), W-PAD_R+1+(PAD_R-2)/2, by+4);
      }
    }
  }

  // ── MACD sub-chart ──
  if(showMACD){
    const mctx = macdC.getContext('2d');
    mctx.clearRect(0,0,W,macdH);
    const {ml,sig,hist} = calcMACD(ST.candles,12,26,9);
    const mV = ml.slice(Math.max(0,s),Math.min(ml.length,s+r));
    const sV = sig.slice(Math.max(0,s),Math.min(sig.length,s+r));
    const hV = hist.slice(Math.max(0,s),Math.min(hist.length,s+r));
    const all= [...mV,...sV,...hV].filter(v=>v!=null&&isFinite(v));
    if(!all.length) return;
    const mMn=Math.min(...all), mMx=Math.max(...all), mRng=mMx-mMn||1;
    const mIH=macdH-12;
    const toMY=v=>4+(1-((v-mMn)/mRng))*mIH;
    // Zero line
    mctx.strokeStyle='rgba(122,156,192,.28)'; mctx.lineWidth=.8; mctx.setLineDash([]);
    mctx.beginPath(); mctx.moveTo(0,toMY(0)); mctx.lineTo(W,toMY(0)); mctx.stroke();
    // Histogram
    const hbW=Math.max(1,Math.min(cw*0.65,12));
    for(let i=0;i<hV.length;i++){
      if(hV[i]==null)continue;
      const x=toX(i),zy=toMY(0),hy=toMY(hV[i]),bh=Math.abs(zy-hy);
      mctx.fillStyle=hV[i]>=0?'rgba(0,255,136,.42)':'rgba(255,51,102,.42)';
      mctx.fillRect(x-hbW/2,Math.min(zy,hy),hbW,bh);
    }
    // MACD line
    mctx.beginPath(); mctx.strokeStyle='rgba(150,100,255,.9)'; mctx.lineWidth=1.6; mctx.setLineDash([]);
    let s0=false; for(let i=0;i<mV.length;i++){if(mV[i]==null)continue; s0?mctx.lineTo(toX(i),toMY(mV[i])):mctx.moveTo(toX(i),toMY(mV[i])); s0=true;} mctx.stroke();
    // Signal line
    mctx.beginPath(); mctx.strokeStyle='rgba(255,150,0,.9)'; mctx.lineWidth=1.4; mctx.setLineDash([]);
    s0=false; for(let i=0;i<sV.length;i++){if(sV[i]==null)continue; s0?mctx.lineTo(toX(i),toMY(sV[i])):mctx.moveTo(toX(i),toMY(sV[i])); s0=true;} mctx.stroke();
    // Labels
    mctx.fillStyle='rgba(150,100,255,.8)'; mctx.font='8px Share Tech Mono'; mctx.textAlign='left'; mctx.fillText('MACD',5,11);
    mctx.fillStyle='rgba(255,150,0,.8)'; mctx.fillText('Signal',38,11);
  }
}

/* ══════════════════ INDICATOR MATH ══════════════════ */
function calcRSI(candles,p){
  const cl=candles.map(c=>c.c),res=new Array(cl.length).fill(null);
  if(cl.length<p+1)return res;
  let ag=0,al=0;
  for(let i=1;i<=p;i++){const d=cl[i]-cl[i-1];if(d>0)ag+=d;else al-=d;}
  ag/=p;al/=p;
  res[p]=al===0?100:100-(100/(1+ag/al));
  for(let i=p+1;i<cl.length;i++){const d=cl[i]-cl[i-1],g=d>0?d:0,l=d<0?-d:0;ag=(ag*(p-1)+g)/p;al=(al*(p-1)+l)/p;res[i]=al===0?100:100-(100/(1+ag/al));}
  return res;
}

function calcEMA(data,p){
  const k=2/(p+1),res=new Array(data.length).fill(null);
  const first=data.findIndex(v=>v!=null);if(first<0||first+p>data.length)return res;
  let e=data.slice(first,first+p).reduce((a,b)=>a+(b||0),0)/p;res[first+p-1]=e;
  for(let i=first+p;i<data.length;i++){if(data[i]==null)continue;e=data[i]*k+e*(1-k);res[i]=e;}
  return res;
}

function calcMACD(candles,fast,slow,sig){
  const cl=candles.map(c=>c.c);
  const eF=calcEMA(cl,fast),eS=calcEMA(cl,slow);
  const ml=cl.map((_,i)=>eF[i]!=null&&eS[i]!=null?eF[i]-eS[i]:null);
  const clean=ml.filter(v=>v!=null);
  const sigArr=calcEMA(clean,sig);
  const sigFull=new Array(cl.length).fill(null);
  let si=0;for(let i=0;i<ml.length;i++){if(ml[i]!=null){sigFull[i]=sigArr[si]??null;si++;}}
  const hist=ml.map((v,i)=>v!=null&&sigFull[i]!=null?v-sigFull[i]:null);
  return{ml,sig:sigFull,hist};
}


/* ══════════════════ FEAR & GREED ══════════════════════ */
async function loadFearGreed(){
  try{
    const res = await fetch('https://api.alternative.me/fng/?limit=2&format=json&t='+Date.now());
    if(!res.ok) throw new Error(res.status);
    const json = await res.json();
    const cur  = json.data[0];
    const prev = json.data[1];
    const score = parseInt(cur.value);
    const label = cur.value_classification;
    const date  = new Date(parseInt(cur.timestamp)*1000);
    const dateStr = date.toLocaleDateString('en-US',{month:'short',day:'numeric'});

    // Color based on score
    const col = score<=25?'#ff3366':score<=45?'#ff9600':score<=55?'#ffc800':score<=75?'#a8e063':'#00ff88';

    // Update text elements
    const scoreEl=document.getElementById('fgScore');
    const labelEl=document.getElementById('fgLabel');
    const updEl  =document.getElementById('fgUpdated');
    const prevEl =document.getElementById('fgPrev');
    if(scoreEl){scoreEl.textContent=score;scoreEl.style.color=col;}
    if(labelEl){labelEl.textContent=label;labelEl.style.color=col;}
    if(updEl)   updEl.textContent='Updated '+dateStr;
    if(prevEl&&prev){
      const ps=parseInt(prev.value),diff=score-ps;
      prevEl.textContent='Yesterday: '+ps+' '+(diff>=0?'▲':'▼')+Math.abs(diff);
      prevEl.style.color=diff>=0?'#00ff88':'#ff3366';
    }

    // Draw canvas gauge
    drawFGGauge(score, col);

  }catch(e){
    console.warn('Fear & Greed load failed:',e);
    const labelEl=document.getElementById('fgLabel');
    if(labelEl) labelEl.textContent='Unavailable';
    drawFGGauge(50,'#ffc800'); // show neutral as fallback
  }
}

function drawFGGauge(score, needleCol){
  const canvas = document.getElementById('fgCanvas');
  if(!canvas) return;
  const dpr = window.devicePixelRatio||1;
  const W=160, H=90;
  canvas.width  = W*dpr;
  canvas.height = H*dpr;
  canvas.style.width  = W+'px';
  canvas.style.height = H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,W,H);

  const cx=W/2, cy=H-14, R=62, arcW=10;
  // Arc spans from 180° to 0° (left to right) = π to 0 in radians
  const startAngle = Math.PI;
  const endAngle   = 0;

  // ── Draw colored zone segments ──
  const zones=[
    {from:0,   to:25,  col:'#ff3366'},   // Extreme Fear
    {from:25,  to:47,  col:'#ff9600'},   // Fear
    {from:47,  to:53,  col:'#ffc800'},   // Neutral
    {from:53,  to:75,  col:'#a8e063'},   // Greed
    {from:75,  to:100, col:'#00ff88'},   // Extreme Greed
  ];
  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, 0, false);
  ctx.strokeStyle='rgba(255,255,255,.07)';
  ctx.lineWidth=arcW;
  ctx.lineCap='round';
  ctx.stroke();

  // Colored segments
  zones.forEach(z=>{
    const a1 = Math.PI + (z.from/100)*Math.PI;
    const a2 = Math.PI + (z.to  /100)*Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a1, a2, false);
    ctx.strokeStyle=z.col;
    ctx.lineWidth=arcW;
    ctx.lineCap='butt';
    ctx.stroke();
  });

  // ── Zone tick marks ──
  [0,25,50,75,100].forEach(v=>{
    const ang = Math.PI + (v/100)*Math.PI;
    const ix  = cx + (R-arcW/2)*Math.cos(ang);
    const iy  = cy + (R-arcW/2)*Math.sin(ang);
    const ox  = cx + (R+arcW/2+2)*Math.cos(ang);
    const oy  = cy + (R+arcW/2+2)*Math.sin(ang);
    ctx.beginPath(); ctx.moveTo(ix,iy); ctx.lineTo(ox,oy);
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1.5; ctx.lineCap='round'; ctx.stroke();
    // Labels
    const lx = cx + (R+arcW/2+10)*Math.cos(ang);
    const ly = cy + (R+arcW/2+10)*Math.sin(ang);
    ctx.fillStyle='rgba(122,156,192,.6)'; ctx.font=`bold ${v===50?8:7}px Share Tech Mono`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(v, lx, ly);
  });

  // ── Filled arc up to score ──
  const fillEnd = Math.PI + (score/100)*Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, fillEnd, false);
  ctx.strokeStyle = needleCol;
  ctx.lineWidth = arcW-2;
  ctx.lineCap='round';
  ctx.globalAlpha=0.0; // invisible — zones already show this; just for reference
  ctx.stroke();
  ctx.globalAlpha=1;

  // ── Needle ──
  const needleAngle = Math.PI + (score/100)*Math.PI;
  const needleLen   = R-6;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  // Needle shadow/glow
  ctx.shadowColor = needleCol;
  ctx.shadowBlur  = 8;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
  ctx.strokeStyle = '#fff'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.stroke();
  ctx.shadowBlur  = 0;

  // Needle base dot
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2);
  ctx.fillStyle='#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2);
  ctx.fillStyle=needleCol; ctx.fill();

  // ── Score text in gauge ──
  ctx.fillStyle=needleCol; ctx.font='bold 11px Orbitron, Share Tech Mono';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(score, cx, cy-22);
}

/* ══════════════════ MINI CHARTS ════════════════════════ */
async function loadMiniCharts(coinId){
  const tfs = ['1','7','30','365'];
  for(const tf of tfs){
    try{
      await new Promise(r => setTimeout(r, 2000)); // Stagger more to strictly avoid CoinGecko rate limits
      const exactDays = CG_TF_EXACT[tf];
      const url = `${CG}/coins/${coinId}/ohlc?vs_currency=usd&days=${exactDays}`;
      const res = await fetch(url, {headers:{'Accept':'application/json'}});
      if(!res.ok) throw new Error('cc_http_'+res.status);
      const json = await res.json();
      const data = json.map(c => ({t:c[0], o:c[1], h:c[2], l:c[3], c:c[4], v:0})).filter(c => c.c > 0 && c.o > 0);
      if(data.length<2) continue;
      drawMiniChart(tf, data);
    }catch(e){ 
      console.error('Mini chart error for tf', tf, e); 
      // Fallback to existing candles if rate limited
      if (ST.candles && ST.candles.length > 2) drawMiniChart(tf, ST.candles);
    }
  }
}

function drawMiniChart(tf, data){
  const canvasId = `mc${tf}dCanvas`;
  const pctId    = `mc${tf}dPct`;
  const canvas   = document.getElementById(canvasId);
  const pctEl    = document.getElementById(pctId);
  if(!canvas) return;

  const W = canvas.offsetWidth || 120;
  const H = 36;
  canvas.width  = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  canvas.style.width  = W+'px';
  canvas.style.height = H+'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(0,0,W,H);

  const prices = data.map(d=>d.c !== undefined ? d.c : d.close);
  const mn = Math.min(...prices), mx = Math.max(...prices);
  const range = mx-mn||1;
  const toY   = v => 2 + (1-(v-mn)/range)*(H-4);
  const toX   = i => (i/(prices.length-1))*(W-1);

  const up = prices[prices.length-1] >= prices[0];
  const col= up ? '#00ff88' : '#ff3366';

  // Fill
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,   up?'rgba(0,255,136,.25)':'rgba(255,51,102,.25)');
  grad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(prices[0]));
  for(let i=1;i<prices.length;i++) ctx.lineTo(toX(i),toY(prices[i]));
  ctx.lineTo(toX(prices.length-1),H);
  ctx.lineTo(0,H); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();

  // Line
  ctx.beginPath();
  for(let i=0;i<prices.length;i++) i?ctx.lineTo(toX(i),toY(prices[i])):ctx.moveTo(toX(i),toY(prices[i]));
  ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();

  // % change label
  if(pctEl){
    const pct = ((prices[prices.length-1]-prices[0])/prices[0]*100).toFixed(1);
    pctEl.textContent = (pct>=0?'+':'')+pct+'%';
    pctEl.style.color = up?'#00ff88':'#ff3366';
  }
}

function setTFFromMini(el, tf){
  // Highlight active mini chart
  document.querySelectorAll('.mc-item').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  // Also update main TF buttons
  document.querySelectorAll('.tf').forEach(b=>b.classList.remove('on'));
  // Map tf to button text
  const tfMap={'1':'1d','7':'7d','30':'30d','90':'90d','365':'1y','1825':'5y','max':'MAX'};
  document.querySelectorAll('.tf').forEach(b=>{ if(b.textContent===tfMap[tf]) b.classList.add('on'); });
  ST.tf=tf;
  loadChart(ST.coin.id, tf).then(()=>{ saveState(); });
}

/* ══════════════════ PATTERN RECOGNITION ════════════════ */
const SHOW_DOUBLE_TOP = false;    // hide double top markers on chart
const SHOW_DOUBLE_BOTTOM = false; // hide double bottom markers on chart
function detectPatterns(candles){
  const patterns = [];
  if(candles.length < 20) return patterns;
  const n = candles.length;

  // ── Golden Cross / Death Cross (MA20 crosses MA50) ──
  if(n >= 52){
    const ma20 = [], ma50 = [];
    for(let i=19;i<n;i++) ma20.push({i, v:candles.slice(i-19,i+1).reduce((s,c)=>s+c.c,0)/20});
    for(let i=49;i<n;i++) ma50.push({i, v:candles.slice(i-49,i+1).reduce((s,c)=>s+c.c,0)/50});
    const ma50map = {};
    ma50.forEach(m=>ma50map[m.i]=m.v);
    for(let j=1;j<ma20.length;j++){
      const prev20=ma20[j-1].v, cur20=ma20[j].v;
      const idx=ma20[j].i;
      const prev50=ma50map[idx-1], cur50=ma50map[idx];
      if(!prev50||!cur50) continue;
      if(prev20<=prev50 && cur20>cur50){
        patterns.push({type:'Golden Cross',idx,color:'#ffc800',pos:'above',emoji:'✨',
          desc:'MA20 crossed above MA50 — bullish momentum signal'});
      } else if(prev20>=prev50 && cur20<cur50){
        patterns.push({type:'Death Cross',idx,color:'#ff3366',pos:'below',emoji:'💀',
          desc:'MA20 crossed below MA50 — bearish momentum signal'});
      }
    }
  }

  if(SHOW_DOUBLE_TOP){
    // ── Double Top ──
    const localMaxes = [];
    for(let i=3;i<n-3;i++){
      if(candles[i].h > candles[i-1].h && candles[i].h > candles[i-2].h &&
         candles[i].h > candles[i+1].h && candles[i].h > candles[i+2].h){
        localMaxes.push({i, h:candles[i].h});
      }
    }
    for(let a=0;a<localMaxes.length-1;a++){
      for(let b=a+1;b<localMaxes.length;b++){
        const gap = localMaxes[b].i - localMaxes[a].i;
        if(gap < 5 || gap > 60) continue;
        const diff = Math.abs(localMaxes[a].h - localMaxes[b].h)/localMaxes[a].h;
        if(diff < 0.025){ // within 2.5%
          patterns.push({type:'Double Top',idx:localMaxes[b].i,color:'#ff3366',pos:'above',emoji:'⛰⛰',
            desc:'Two similar highs — potential reversal signal'});
          break;
        }
      }
    }
  }

  if(SHOW_DOUBLE_BOTTOM){
    // ── Double Bottom ──
    const localMins = [];
    for(let i=3;i<n-3;i++){
      if(candles[i].l < candles[i-1].l && candles[i].l < candles[i-2].l &&
         candles[i].l < candles[i+1].l && candles[i].l < candles[i+2].l){
        localMins.push({i, l:candles[i].l});
      }
    }
    for(let a=0;a<localMins.length-1;a++){
      for(let b=a+1;b<localMins.length;b++){
        const gap = localMins[b].i - localMins[a].i;
        if(gap < 5 || gap > 60) continue;
        const diff = Math.abs(localMins[a].l - localMins[b].l)/localMins[a].l;
        if(diff < 0.025){
          patterns.push({type:'Double Bottom',idx:localMins[b].i,color:'#00ff88',pos:'below',emoji:'🏔🏔',
            desc:'Two similar lows — potential reversal higher'});
          break;
        }
      }
    }
  }

  // Return only the most recent 6 to avoid clutter
  return patterns.slice(-6);
}

function renderPatterns(ctx, vis, toX, toY, pH, PAD_L, PAD_R, W){
  if(!ST.showPatterns) return;
  // vis is the visible candle slice; we need global indices mapped to vis positions
  const patterns = detectPatterns(ST.candles);
  const s = ST.zoom.s;
  const r = ST.zoom.r;

  for(const p of patterns){
    const visIdx = p.idx - s;
    if(visIdx < 0 || visIdx >= r) continue;
    const x  = toX(visIdx);
    const c  = vis[visIdx];
    const y  = p.pos==='above' ? toY(c.h)-18 : toY(c.l)+8;

    // Badge pill
    ctx.save();
    const label = p.emoji+' '+p.type;
    ctx.font = 'bold 9px Share Tech Mono';
    const tw = ctx.measureText(label).width;
    const bw = tw+12, bh=14;
    const bx = Math.min(Math.max(x-bw/2, PAD_L), W-PAD_R-bw);

    // Parse hex color to rgba
    const hx=p.color.replace('#','');
    const r2=parseInt(hx.slice(0,2),16),g2=parseInt(hx.slice(2,4),16),b2=parseInt(hx.slice(4,6),16);

    ctx.fillStyle=`rgba(${r2},${g2},${b2},.15)`;
    if(ctx.roundRect) ctx.roundRect(bx,y,bw,bh,3); else ctx.rect(bx,y,bw,bh);
    ctx.fill();
    ctx.strokeStyle=`rgba(${r2},${g2},${b2},.8)`;
    ctx.lineWidth=1; ctx.setLineDash([]);
    if(ctx.roundRect) ctx.roundRect(bx,y,bw,bh,3); else ctx.rect(bx,y,bw,bh);
    ctx.stroke();
    ctx.fillStyle=p.color;
    ctx.textAlign='center';
    ctx.fillText(label, bx+bw/2, y+bh-3);

    // Vertical tick
    ctx.strokeStyle=`rgba(${r2},${g2},${b2},.45)`;
    ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(x, p.pos==='above'?toY(c.h):toY(c.l));
    ctx.lineTo(x, p.pos==='above'?toY(c.h)-14:toY(c.l)+4);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
}

/* ══════════════════ FIBONACCI RENDERING ════════════════ */
function renderFibDrawing(ctx, d, vis, toX, priceToYfn, W, PAD_L, PAD_R, pH){
  if(!d.p1 || !d.p2) return;
  const FIB_LEVELS = [
    {r:0,     label:'0%',     col:'rgba(150,100,255,.7)'},
    {r:0.236, label:'23.6%',  col:'rgba(0,212,255,.7)'},
    {r:0.382, label:'38.2%',  col:'rgba(0,255,136,.8)'},
    {r:0.5,   label:'50%',    col:'rgba(255,200,0,.8)'},
    {r:0.618, label:'61.8%',  col:'rgba(255,150,0,.85)'},
    {r:0.786, label:'78.6%',  col:'rgba(255,80,80,.8)'},
    {r:1,     label:'100%',   col:'rgba(150,100,255,.7)'},
  ];
  const hiP = Math.max(d.p1.price, d.p2.price);
  const loP = Math.min(d.p1.price, d.p2.price);
  const range = hiP - loP;
  if(range <= 0) return;

  const x1 = candleToX(d.p1.gi, W);
  const x2 = candleToX(d.p2.gi, W);
  const xL  = Math.min(x1, x2, PAD_L);
  const xR  = Math.max(x1, x2, W-PAD_R);

  ctx.save();
  ctx.font = 'bold 9px Share Tech Mono';

  for(const lv of FIB_LEVELS){
    const price = hiP - lv.r * range;
    const y     = priceToYfn(price, pH);
    if(y < 0 || y > pH) continue;

    // Fill band between adjacent levels (subtle)
    const idx = FIB_LEVELS.indexOf(lv);
    if(idx < FIB_LEVELS.length-1){
      const nextPrice = hiP - FIB_LEVELS[idx+1].r * range;
      const y2 = priceToYfn(nextPrice, pH);
      const hx = lv.col.match(/[\d.]+/g);
      if(hx && hx.length>=3){
        ctx.fillStyle=`rgba(${hx[0]},${hx[1]},${hx[2]},0.04)`;
        ctx.fillRect(xL, Math.min(y,y2), xR-xL, Math.abs(y2-y));
      }
    }

    // Horizontal level line
    ctx.strokeStyle = lv.col;
    ctx.lineWidth   = lv.r===0.618 ? 1.8 : 1.2; // emphasize golden ratio
    ctx.setLineDash(lv.r===0.5?[6,4]:[]);
    ctx.beginPath(); ctx.moveTo(xL,y); ctx.lineTo(xR,y); ctx.stroke();
    ctx.setLineDash([]);

    // Label on right
    ctx.fillStyle   = lv.col;
    ctx.textAlign   = 'left';
    ctx.fillText(`${lv.label}  $${fP(price)}`, W-PAD_R+4, y+3.5);
  }

  // Anchor dots at p1 and p2
  ctx.fillStyle = 'rgba(150,100,255,.9)';
  ctx.beginPath(); ctx.arc(x1, priceToYfn(d.p1.price,pH), 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x2, priceToYfn(d.p2.price,pH), 4, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

/* ══════════════════ NOTE / LABEL TOOL ══════════════════ */
let _notePending = null; // {gi, price, x_screen, y_screen}

function showNoteInput(gi, price, screenX, screenY){
  _notePending = {gi, price};
  const wrap = document.getElementById('noteInputWrap');
  const inp  = document.getElementById('noteInputBox');
  wrap.style.display = 'block';
  wrap.style.left    = screenX + 'px';
  wrap.style.top     = (screenY - 40) + 'px';
  inp.value = '';
  inp.focus();
}

document.addEventListener('DOMContentLoaded', ()=>{
  const inp = document.getElementById('noteInputBox');
  if(!inp) return;
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      const text = inp.value.trim();
      if(text && _notePending){
        DRW.drawings.push({
          type:'note', color:DRW.color,
          p1:{gi:_notePending.gi, price:_notePending.price},
          text
        });
        updateDrawCount(); renderChart();
      }
      document.getElementById('noteInputWrap').style.display='none';
      _notePending = null;
    } else if(e.key==='Escape'){
      document.getElementById('noteInputWrap').style.display='none';
      _notePending = null;
    }
  });
  // Click outside dismisses
  document.addEventListener('mousedown', e=>{
    const wrap = document.getElementById('noteInputWrap');
    if(wrap && !wrap.contains(e.target) && wrap.style.display==='block'){
      wrap.style.display='none';
      _notePending = null;
    }
  }, true);
});


/* ══════════════════ LOCAL STORAGE PERSISTENCE ══════════════ */
// Everything saved under 'tt_' prefix to avoid conflicts
const LS_KEY = 'tt_v1';

function saveState(){
  try{
    const data = {
      wl:   ST.wl.map(c=>({id:c.id,name:c.name,symbol:c.symbol,image:c.image||''})),
      coin: {id:ST.coin.id,name:ST.coin.name,symbol:ST.coin.symbol,image:ST.coin.image||''},
      tf:   ST.tf,
      ct:   ST.ct,
      inds: [...ST.inds],
      showPatterns: ST.showPatterns,
      theme: document.documentElement.getAttribute('data-theme')||'dark',
      alerts: ALERTS,
      drawings: DRW.drawings,
      drawColor: DRW.color,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }catch(e){ console.warn('saveState failed:',e); }
}

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);

    // Restore watchlist
    if(data.wl && data.wl.length){
      ST.wl = data.wl.map(c=>({...c, price:0, change:0, mcap:0, vol:0}));
    }
    // Restore active coin
    if(data.coin && data.coin.id){
      Object.assign(ST.coin, data.coin);
    }
    // Restore timeframe + chart type
    if(data.tf) ST.tf = data.tf;
    if(data.ct) ST.ct = data.ct;
    // Restore indicators
    if(data.inds) data.inds.forEach(i=>ST.inds.add(i));
    // Restore pattern markers toggle
    if(data.showPatterns !== undefined) ST.showPatterns = !!data.showPatterns;
    // Restore drawings
    if(data.drawings) DRW.drawings = data.drawings;
    if(data.drawColor) DRW.color = data.drawColor;
    // Restore alerts
    if(data.alerts) ALERTS = data.alerts;
    // Restore theme
    if(data.theme === 'light'){
      lm = false; toggleTheme(); // toggleTheme flips lm, so flip back
    }
    return true;
  }catch(e){
    console.warn('loadState failed:',e);
    return false;
  }
}

function clearSavedState(){
  localStorage.removeItem(LS_KEY);
  showToast('🗑 Settings Cleared','Your saved watchlist, alerts, and drawings have been cleared. Refresh to reset.','info');
}

/* ══════════════════ PRICE ALERTS ══════════════════════════ */
let ALERTS = []; // [{id, coinId, symbol, dir:'above'|'below', price, active:true, triggered:false}]
let ALERT_CHECK_INTERVAL = null;

function toggleAlertPanel(){
  const body = document.getElementById('alertBody');
  const tog  = document.getElementById('alertToggle');
  const hdr  = document.getElementById('alertPanel')?.querySelector('.alert-panel-hdr');
  const open = body.classList.toggle('open');
  tog.classList.toggle('open', open);
  if(hdr) hdr.classList.toggle('open', open);
}

function updateAlertCoinName(){
  const el = document.getElementById('alertCoinName');
  if(el) el.textContent = ST.coin.symbol || 'BTC';
}

function addAlert(){
  const priceIn = document.getElementById('alertPrice');
  const dirIn   = document.getElementById('alertDir');
  const targetPrice = parseFloat(priceIn.value);
  if(!targetPrice || targetPrice <= 0){ showToast('⚠ Invalid Price','Please enter a valid price greater than 0.','warn'); return; }

  const alert = {
    id:       Date.now(),
    coinId:   ST.coin.id,
    symbol:   ST.coin.symbol || ST.coin.name,
    name:     ST.coin.name,
    dir:      dirIn.value,
    price:    targetPrice,
    active:   true,
    triggered:false,
  };

  // Check if price is already past target
  const cur = ST.coin.price;
  if(cur > 0){
    if(alert.dir === 'above' && cur >= targetPrice){
      showToast('⚠ Already Above','Current price ($'+fP(cur)+') is already above your target.','warn'); return;
    }
    if(alert.dir === 'below' && cur <= targetPrice){
      showToast('⚠ Already Below','Current price ($'+fP(cur)+') is already below your target.','warn'); return;
    }
  }

  ALERTS.push(alert);
  priceIn.value = '';
  renderAlerts();
  saveState();
  // Request notification permission if not already granted
  if('Notification' in window && Notification.permission === 'default'){
    Notification.requestPermission();
  }
  showToast('🔔 Alert Set','Will notify when '+alert.symbol+' goes '+alert.dir+' $'+fP(targetPrice),'success');
}

function deleteAlert(id){
  ALERTS = ALERTS.filter(a=>a.id!==id);
  renderAlerts();
  saveState();
}

function renderAlerts(){
  const list    = document.getElementById('alertList');
  const badge   = document.getElementById('alertBadge');
  const active  = ALERTS.filter(a=>a.active && !a.triggered).length;
  if(badge){ badge.textContent = ALERTS.length; badge.style.display = ALERTS.length?'inline':'none'; badge.classList.toggle('has-alerts', ALERTS.filter(a=>a.active&&!a.triggered).length>0); }
  if(!ALERTS.length){
    list.innerHTML = '<div class="alert-empty">No alerts set. Add one above!</div>';
    return;
  }
  list.innerHTML = ALERTS.map(a=>`
    <div class="alert-item${a.triggered?' triggered':''}">
      <span class="alert-item-dir ${a.dir}">${a.dir==='above'?'↑':'↓'}</span>
      <span class="alert-item-sym">${a.symbol}</span>
      <span class="alert-item-price">$${fP(a.price)}</span>
      <span style="flex:1;font-family:'Share Tech Mono',monospace;font-size:.63rem;color:var(--text3);">${a.name||''}</span>
      <span class="alert-item-status ${a.triggered?'hit':'active'}">${a.triggered?'✓ TRIGGERED':'ACTIVE'}</span>
      <button class="alert-del" onclick="deleteAlert(${a.id})" title="Remove alert">✕</button>
    </div>
  `).join('');
}

function checkAlerts(){
  if(!ALERTS.length) return;
  let changed = false;
  ALERTS.forEach(a=>{
    if(!a.active || a.triggered) return;
    // Find current price from watchlist or ST.coin
    let cur = 0;
    if(a.coinId === ST.coin.id) cur = ST.coin.price;
    else {
      const wlEntry = ST.wl.find(c=>c.id===a.coinId);
      if(wlEntry) cur = wlEntry.price;
    }
    if(!cur) return;
    const hit = (a.dir==='above' && cur >= a.price) || (a.dir==='below' && cur <= a.price);
    if(hit){
      a.triggered = true;
      changed = true;
      triggerAlert(a, cur);
    }
  });
  if(changed){ renderAlerts(); saveState(); }
}

// playAlertDing defined below (single canonical version)

function playAlertDing(){
  try{
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    // Three-note ascending ding: G5 → B5 → D6  (major chord, bright & clear)
    const notes = [
      {freq:784.0, start:0.00, dur:0.30},
      {freq:987.8, start:0.14, dur:0.30},
      {freq:1174.7,start:0.28, dur:0.50},
    ];

    notes.forEach(({freq, start, dur})=>{
      const osc  = ctx.createOscillator();
      const gn   = ctx.createGain();
      osc.connect(gn);
      gn.connect(gain);

      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      // Attack → sustain → release envelope
      const t0 = ctx.currentTime + start;
      gn.gain.setValueAtTime(0, t0);
      gn.gain.linearRampToValueAtTime(0.35, t0 + 0.015);   // fast attack
      gn.gain.setValueAtTime(0.35, t0 + dur * 0.4);         // sustain
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur); // smooth release

      osc.start(t0);
      osc.stop(t0 + dur + 0.01);
    });

    // Auto-close context after sound finishes
    setTimeout(()=>ctx.close(), 1200);
  }catch(e){
    console.warn('Alert sound failed:', e);
  }
}

function triggerAlert(alert, currentPrice){
  const msg = `${alert.symbol} is now ${alert.dir} $${fP(alert.price)}! Current: $${fP(currentPrice)}`;

  // Play ding sound
  playAlertDing();

  // Browser notification
  if('Notification' in window && Notification.permission === 'granted'){
    new Notification('🔔 Token-Tokens Alert', {
      body: msg,
      icon: 'chart.png',
      tag:  'tt-alert-'+alert.id,
    });
  }
  // In-app toast
  showToast(
    `🔔 ${alert.symbol} Alert Triggered!`,
    `Price ${alert.dir === 'above' ? 'crossed above' : 'dropped below'} $${fP(alert.price)}\nCurrent: $${fP(currentPrice)}`,
    'success'
  );
}

/* ══════════════════ TOAST SYSTEM ════════════════════════════ */
function showToast(title, msg, type='info', duration=5000){
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const id   = 'toast_'+Date.now();
  const div  = document.createElement('div');
  div.className = `toast ${type}`;
  div.id = id;
  const icons = {success:'✅', warn:'⚠️', info:'ℹ️'};
  div.innerHTML = `
    <span class="toast-icon">${icons[type]||'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg.replace(/\n/g,'<br>')}</div>
    </div>
    <span class="toast-close" onclick="closeToast('${id}')">✕</span>
  `;
  container.appendChild(div);
  if(duration > 0){
    setTimeout(()=>closeToast(id), duration);
  }
}

function closeToast(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.animation = 'toastOut .25s ease forwards';
  setTimeout(()=>el.remove(), 260);
}

/* ══════════════════ SETTINGS TOAST ══════════════════════════ */
function openSettings(){
  const modal = document.getElementById('settingsModal');
  if(!modal) return;
  // Populate live values
  const saved = localStorage.getItem(LS_KEY);
  const savedKB = saved ? (saved.length/1024).toFixed(1) : '0';
  const el = (id,val)=>{ const e=document.getElementById(id); if(e) e.textContent=val; };
  el('smWlCount', ST.wl.length + ' tokens');
  el('smAlCount', ALERTS.length + ' alerts');
  el('smDrwCount', (DRW.drawings||[]).length + ' drawings');
  el('smStorageKB', savedKB + ' KB');
  // Theme toggle state
  const tog = document.getElementById('smThemeToggle');
  if(tog) tog.checked = lm;
  const pat = document.getElementById('smPatternToggle');
  if(pat) pat.checked = ST.showPatterns;
  modal.classList.remove('hide');
}
function closeSettings(){
  const modal = document.getElementById('settingsModal');
  if(modal) modal.classList.add('hide');
}
function smBgClick(e){
  if(e.target === document.getElementById('settingsModal')) closeSettings();
}
function smToggleTheme(cb){ toggleTheme(); }
function smTogglePatterns(cb){
  ST.showPatterns = !!cb.checked;
  saveState();
  renderChart();
  showToast('Chart','Pattern markers ' + (ST.showPatterns ? 'enabled' : 'hidden') + '.','info');
}
function smExportData(){
  const data = localStorage.getItem(LS_KEY) || '{}';
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'token-tokens-data.json';
  a.click();
  showToast('💾 Exported','Your data has been downloaded as JSON.','success');
}
function smClearDrawings(){
  DRW.drawings=[]; DRW.pending=null; updateDrawCount(); renderChart(); saveState();
  openSettings();
  showToast('✏️ Cleared','All drawings removed.','info');
}
function smClearAlerts(){
  ALERTS=[]; renderAlerts(); saveState();
  openSettings();
  showToast('🔔 Cleared','All alerts removed.','info');
}
function smClearEverything(){
  if(!confirm('Reset ALL data? This cannot be undone.')) return;
  clearSavedState();
  closeSettings();
  showToast('⚠️ Reset','All data cleared. Refresh to start fresh.','warn',6000);
}
// Legacy alias
function showSettingsToast(){ openSettings(); }

/* ══════════════════ CHART INTERACTION ══════════════════ */
document.getElementById('priceCanvas').addEventListener('wheel',e=>{
  e.preventDefault();
  if(DRW.tool) return; // don't zoom while drawing
  const d=e.deltaY>0?1.18:.85;
  ST.zoom.r=Math.min(ST.candles.length,Math.max(10,Math.round(ST.zoom.r*d)));
  ST.zoom.s=Math.max(0,ST.candles.length-ST.zoom.r);
  renderChart();
},{passive:false});

/* ── Touch support for mobile (pinch-zoom + swipe-pan) ── */
(()=>{
  const pc=document.getElementById('priceCanvas');
  let lastTouchX=0,lastTouchDist=0,touchPanStart=0;
  pc.addEventListener('touchstart',e=>{
    if(e.touches.length===1){
      lastTouchX=e.touches[0].clientX;
      touchPanStart=ST.zoom.s;
    } else if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      lastTouchDist=Math.sqrt(dx*dx+dy*dy);
    }
    e.preventDefault();
  },{passive:false});
  pc.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1){
      // Pan
      const dx=e.touches[0].clientX-lastTouchX;
      const cw=(pc.width-4-82)/ST.zoom.r;
      const shift=Math.round(-dx/cw);
      ST.zoom.s=Math.max(0,Math.min(ST.candles.length-ST.zoom.r,touchPanStart+shift));
      renderChart();
    } else if(e.touches.length===2){
      // Pinch zoom
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(lastTouchDist>0){
        const scale=lastTouchDist/dist;
        ST.zoom.r=Math.min(ST.candles.length,Math.max(10,Math.round(ST.zoom.r*scale)));
        ST.zoom.s=Math.max(0,ST.candles.length-ST.zoom.r);
        lastTouchDist=dist;
        renderChart();
      }
    }
  },{passive:false});
  pc.addEventListener('touchend',e=>{
    if(e.touches.length===0){
      lastTouchDist=0;
    }
  },{passive:false});
})();

document.getElementById('priceCanvas').addEventListener('mousedown',e=>{
  const pc  = document.getElementById('priceCanvas');
  const rect= pc.getBoundingClientRect();
  const mx  = e.clientX - rect.left;
  const my  = e.clientY - rect.top;

  if(!DRW.tool){
    // Normal pan mode
    ST.drag={on:true,x:e.clientX,s:ST.zoom.s};
    return;
  }

  const ci    = pxToCandleIdx(mx, pc.width);
  const price = pxToPrice(my, pc.height);
  if(!ci || price == null) return;

  if(DRW.tool === 'hline'){
    DRW.drawings.push({type:'hline', color:DRW.color, p1:{gi:ci.globalIdx, price}});
    DRW.pending = null;
    updateDrawCount(); renderChart(); saveState(); return;
  }

  if(DRW.tool === 'note'){
    // Show floating text input at click position
    showNoteInput(ci.globalIdx, price, e.clientX, e.clientY);
    return;
  }

  if(!DRW.pending){
    // First click — start the shape
    DRW.pending = {type:DRW.tool, color:DRW.color, p1:{gi:ci.globalIdx, price}, p2:{gi:ci.globalIdx, price}};
  } else {
    // Second click — finish the shape
    DRW.pending.p2 = {gi:ci.globalIdx, price};
    DRW.drawings.push({...DRW.pending});
    DRW.pending = null;
    updateDrawCount(); renderChart(); saveState();
  }
});

document.addEventListener('mousemove',e=>{
  const pc = document.getElementById('priceCanvas');
  if(!pc) return;

  if(!DRW.tool && ST.drag.on){
    // Pan mode
    const cw=(pc.width-4-82)/ST.zoom.r;
    const sh=Math.round(-(e.clientX-ST.drag.x)/cw);
    ST.zoom.s=Math.max(0,Math.min(ST.candles.length-ST.zoom.r,ST.drag.s+sh));
    renderChart(); return;
  }

  if(DRW.tool && DRW.pending){
    // Update pending drawing's p2 to follow mouse
    const rect = pc.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const ci   = pxToCandleIdx(mx, pc.width);
    const price= pxToPrice(my, pc.height);
    if(ci && price != null){
      DRW.pending.p2 = {gi:ci.globalIdx, price};
      renderChart();
    }
  }
});
document.addEventListener('mouseup',()=>{ST.drag.on=false;});

// Right-click on chart to cancel pending drawing
document.getElementById('priceCanvas').addEventListener('contextmenu',e=>{
  if(DRW.pending){ e.preventDefault(); DRW.pending=null; renderChart(); }
});

document.getElementById('priceCanvas').addEventListener('mousemove',function(e){
  const rect=this.getBoundingClientRect(),mx=e.clientX-rect.left;
  const vis=ST.candles.slice(Math.max(0,ST.zoom.s),Math.min(ST.candles.length,ST.zoom.s+ST.zoom.r));
  if(!vis.length)return;
  const cw=(this.width-4-78)/vis.length,idx=Math.max(0,Math.min(vis.length-1,Math.floor((mx-4)/cw)));
  const c=vis[idx],t=new Date(c.t),tt=document.getElementById('cTip');
  // Full datetime string
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const spanMs=vis.length>1?vis[vis.length-1].t-vis[0].t:0;
  const spanDays=spanMs/86400000;
  const dateStr=MON[t.getMonth()]+' '+t.getDate()+', '+t.getFullYear()+(spanDays<=2?' '+t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0'):'');
  // Change from open
  const chg=c.o>0?((c.c-c.o)/c.o*100):0;
  const chgStr=(chg>=0?'+':'')+chg.toFixed(2)+'%';
  tt.innerHTML=`
    <div class="tr"><span class="tl">📅 Date</span><span class="tv" style="font-size:.68rem">${dateStr}</span></div>
    <div class="tr"><span class="tl">Open</span><span class="tv">$${fP(c.o)}</span></div>
    <div class="tr"><span class="tl" style="color:var(--green)">High</span><span class="tv">$${fP(c.h)}</span></div>
    <div class="tr"><span class="tl" style="color:var(--red)">Low</span><span class="tv">$${fP(c.l)}</span></div>
    <div class="tr"><span class="tl">Close</span><span class="tv">$${fP(c.c)}</span></div>
    <div class="tr"><span class="tl">Change</span><span class="tv ${chg>=0?'pos':'neg'}">${chgStr}</span></div>
    <div class="tr"><span class="tl">Vol</span><span class="tv">${fL(c.v)}</span></div>`;
  tt.style.opacity=1;let lx=mx+14,ly=e.clientY-rect.top-10;if(lx+178>this.width)lx-=200;ly=Math.max(0,Math.min(this.height-155,ly));tt.style.left=lx+'px';tt.style.top=ly+'px';
  // Full date in OHLC bar
  document.getElementById('oO').textContent='$'+fP(c.o);document.getElementById('oH').textContent='$'+fP(c.h);document.getElementById('oL').textContent='$'+fP(c.l);document.getElementById('oC').textContent='$'+fP(c.c);document.getElementById('oV').textContent=fL(c.v);
  // Update OHLC bar date display
  const dateEl=document.getElementById('oDate');if(dateEl)dateEl.textContent=dateStr;
});
document.getElementById('priceCanvas').addEventListener('mouseleave',()=>document.getElementById('cTip').style.opacity=0);

/* ══════════════════ CONTROLS ══════════════════ */
async function setTF(btn,tf){document.querySelectorAll('.tf').forEach(b=>b.classList.remove('on'));btn.classList.add('on');ST.tf=tf;await loadChart(ST.coin.id,tf);saveState();}
function setCT(t){ST.ct=t;document.getElementById('candleBtn').classList.toggle('on',t==='candle');document.getElementById('lineBtn').classList.toggle('on',t==='line');renderChart();saveState();}
function toggleInd(n){
  ST.inds.has(n)?ST.inds.delete(n):ST.inds.add(n);
  const on=ST.inds.has(n);
  // Sync right panel button
  const rpBtn=document.getElementById('i'+n.toUpperCase());
  if(rpBtn)rpBtn.classList.toggle('on',on);
  // Sync mobile panel buttons (they don't have IDs, match by onclick)
  document.querySelectorAll('.ind-panel .ind').forEach(b=>{
    if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+n+"'")){b.classList.toggle('on',on);}
  });
  renderChart();saveState();
}
async function doRefresh(){
  // CryptoCompare chart data is fetched fresh each time (no cache for chart data)
  await loadChart(ST.coin.id, ST.tf);
}

/* indicator info tooltips */
const IT={
  ma:{h:'MA(20) — Moving Average',p:'The average closing price over the last 20 candles. Smooths out noise to reveal the true trend direction. Simple and widely used.',s:'<b>Price above MA</b> = bullish trend &nbsp;|&nbsp; <s>Price below MA</s> = bearish<br>Golden Cross: fast MA crosses above slow MA = major buy signal'},
  ema:{h:'EMA(50) — Exponential MA',p:'Like MA but gives more weight to recent prices, so it reacts faster to price changes. Better for catching trend shifts early.',s:'<b>Price above EMA</b> = uptrend &nbsp;|&nbsp; <s>Price below EMA</s> = downtrend<br>EMA crossovers are popular momentum signals'},
  bb:{h:'Bollinger Bands',p:'Three lines: 20-period MA center with upper/lower bands set 2 standard deviations apart. They expand when volatile, contract when calm.',s:'<b>Near upper band</b> = overbought<br><s>Near lower band</s> = oversold<br>Band squeeze → big move coming!'},
  vwap:{h:'VWAP — Volume Weighted Avg Price',p:'The average price weighted by volume. Used by institutional traders as a key benchmark throughout the trading day.',s:'<b>Price above VWAP</b> = bullish day sentiment<br><s>Price below VWAP</s> = bearish day sentiment'},
  rsi:{h:'RSI(14) — Relative Strength Index',p:'Measures price momentum on a 0–100 scale over 14 periods. Shows when assets are statistically overbought or oversold.',s:'<s>RSI above 70</s> = Overbought (potential pullback)<br><b>RSI below 30</b> = Oversold (potential bounce)<br>Watch for RSI divergence from price!'},
  macd:{h:'MACD (12,26,9)',p:'Shows momentum shifts via two EMAs. The MACD line (purple) crossing the signal line (orange) generates signals. Histogram shows strength.',s:'<b>MACD crosses above signal</b> = bullish<br><s>MACD crosses below signal</s> = bearish<br>Shrinking histogram = trend losing momentum'},
};
function showIT(e,n){const t=document.getElementById('iTip'),i=IT[n];if(!i)return;document.getElementById('itH').textContent=i.h;document.getElementById('itP').textContent=i.p;document.getElementById('itS').innerHTML=i.s;t.style.display='block';const r=e.target.getBoundingClientRect();t.style.left=Math.min(r.left,innerWidth-275)+'px';t.style.top=(r.bottom+8)+'px';}
function hideIT(){document.getElementById('iTip').style.display='none';}

/* ══════════════════ TIME MACHINE ══════════════════ */
function initTimeMachine(){
  const inp=document.getElementById('tmDate');
  const today=new Date();
  inp.max=today.toISOString().slice(0,10);
  // Default to 2 years ago
  const ago=new Date(today);ago.setFullYear(ago.getFullYear()-2);
  inp.value=ago.toISOString().slice(0,10);
}

async function runTimeMachine() {
  const inp     = document.getElementById('tmDate');
  const dateStr = inp.value; // "YYYY-MM-DD"
  if (!dateStr) { showTMError('Please pick a date first.'); return; }

  const [yyyy, mm0, dd] = dateStr.split('-').map(Number);
  const mm = mm0 - 1;
  const targetTs = Date.UTC(yyyy, mm, dd, 12, 0, 0);

  if (targetTs > Date.now()) { showTMError('Cannot look up a future date!'); return; }
  if (yyyy < 2010)           { showTMError('Price data is not available before 2010.'); return; }

  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const displayDate = `${MON[mm]} ${dd}, ${yyyy}`;

  const loadEl = document.getElementById('tmLoading');
  const resEl  = document.getElementById('tmResult');
  loadEl.classList.add('show');
  resEl.classList.remove('show');
  resEl.innerHTML = '';

  // ── Strategy 1: CoinGecko history endpoint (works for < 365 days) ───────────
  try {
    const cgDateStr = `${dd.toString().padStart(2, '0')}-${mm0.toString().padStart(2, '0')}-${yyyy}`;
    const url = `${CG}/coins/${ST.coin.id}/history?date=${cgDateStr}`;
    const res = await fetch(url, {headers:{'Accept':'application/json'}});
    if (res.ok) {
      const json = await res.json();
      if (json && json.market_data && json.market_data.current_price && json.market_data.current_price.usd) {
        const p = json.market_data.current_price.usd;
        const m = json.market_data.market_cap ? json.market_data.market_cap.usd : null;
        const v = json.market_data.total_volume ? json.market_data.total_volume.usd : null;
        loadEl.classList.remove('show');
        showTMSuccess(p, displayDate, m, v, 'CoinGecko');
        return;
      }
    }
  } catch(e) { console.warn('CG TM history failed:', e); }

  // ── Strategy 2: Search already-loaded candles ────────────────────────────
  loadEl.classList.remove('show');
  if (ST.candles.length) {
    const best     = ST.candles.reduce((b, c) =>
      Math.abs(c.t - targetTs) < Math.abs(b.t - targetTs) ? c : b
    );
    const diffDays = Math.abs(best.t - targetTs) / 86400000;
    if (diffDays <= 30) {
      const bd  = new Date(best.t);
      const bds = `${MON[bd.getUTCMonth()]} ${bd.getUTCDate()}, ${bd.getUTCFullYear()}`;
      showTMSuccess(best.c, bds, null, best.v, `chart data (±${Math.round(diffDays)}d)`);
      scrollChartToDate(best.t);
      return;
    }
  }

  showTMError(
    `No price data found for ${displayDate}. ` +
    `This token may not have existed yet, or try loading the MAX chart first.`
  );
}

function showTMSuccess(price,dateStr,mcap,vol,source){
  const resEl=document.getElementById('tmResult');
  const currentPrice=ST.coin.price;
  const pctChange=currentPrice&&price?((currentPrice-price)/price*100):null;
  const pctStr=pctChange!=null?(pctChange>=0?'+':'')+pctChange.toFixed(2)+'%':null;
  const pctClass=pctChange!=null?(pctChange>=0?'pos':'neg'):'';
  const emoji=pctChange!=null?(pctChange>=0?'▲':'▼'):'';
  resEl.innerHTML=`
    <span class="tm-r-coin">${ST.coin.name} <span style="color:var(--text3);font-size:.7rem;">${ST.coin.symbol}</span></span>
    <span class="tm-r-date">📅 ${dateStr}</span>
    <span class="tm-r-price">$${fP(price)}</span>
    ${pctStr?`<span class="tm-r-vs">vs today <span class="tm-r-change ${pctClass}">${pctStr} ${emoji}</span></span>`:''}
    ${mcap?`<span class="tm-r-note">MCap $${fL(mcap)}</span>`:''}
    ${vol?`<span class="tm-r-note">Vol $${fL(vol)}</span>`:''}
    <span class="tm-r-note" style="color:var(--text3);font-size:.63rem;">via ${source}</span>`;
  resEl.classList.add('show');
}

function showTMError(msg){
  const loadEl=document.getElementById('tmLoading'),resEl=document.getElementById('tmResult');
  loadEl.classList.remove('show');
  resEl.innerHTML=`<span class="tm-error">⚠ ${msg}</span>`;
  resEl.classList.add('show');
}

function scrollChartToDate(targetTs){
  if(!ST.candles.length)return;
  // Find closest candle
  let best=0,bestDist=Infinity;
  ST.candles.forEach((c,i)=>{const d=Math.abs(c.t-targetTs);if(d<bestDist){bestDist=d;best=i;}});
  // Center view around it
  const half=Math.floor(ST.zoom.r/2);
  ST.zoom.s=Math.max(0,Math.min(ST.candles.length-ST.zoom.r,best-half));
  renderChart();
  // Draw Time Machine marker
  setTimeout(()=>drawTMMarker(best),50);
}

function drawTMMarker(candleIdx){
  const pc=document.getElementById('priceCanvas');
  if(!pc)return;
  const ctx=pc.getContext('2d');
  const{s,r}=ST.zoom;
  const visIdx=candleIdx-s;
  if(visIdx<0||visIdx>=r)return;
  const pL=4,pR=78,W=pc.width,pH=pc.height;
  const cW=W-pL-pR,cw=cW/r,x=pL+(visIdx+.5)*cw;
  ctx.save();
  // Glowing vertical line
  ctx.shadowColor='rgba(123,47,255,.8)';ctx.shadowBlur=8;
  ctx.strokeStyle='rgba(123,47,255,.9)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.moveTo(x,12);ctx.lineTo(x,pH-20);ctx.stroke();
  ctx.setLineDash([]);ctx.shadowBlur=0;
  // Label pill
  const label='⏳ TIME MACHINE';const lw=ctx.measureText(label).width+16;
  ctx.fillStyle='rgba(123,47,255,.9)';
  ctx.beginPath();ctx.roundRect?ctx.roundRect(x-lw/2,3,lw,13,3):ctx.fillRect(x-lw/2,3,lw,13);
  ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 8px Share Tech Mono';ctx.textAlign='center';ctx.fillText(label,x,12);
  ctx.restore();
  setTimeout(()=>renderChart(),4500);
}
function fP(p){if(p==null)return'—';if(p===0)return'0.00';const a=Math.abs(p);if(a<.00001)return p.toFixed(8);if(a<.001)return p.toFixed(6);if(a<.1)return p.toFixed(5);if(a<1)return p.toFixed(4);if(a<100)return p.toFixed(2);if(a<10000)return p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return p.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}
function fL(n){if(!n||n<=0)return'—';if(n>=1e12)return(n/1e12).toFixed(2)+'T';if(n>=1e9)return(n/1e9).toFixed(2)+'B';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toFixed(2);}
function esc(s){return(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
function rc(s){const cols=['#f7931a','#627eea','#9945ff','#0033ad','#c2a633','#00d4ff','#ff6b35','#00ff88','#e84142','#26a17b','#2775ca','#f0b90b'];let h=0;for(let i=0;i<(s||'').length;i++)h=(h*31+s.charCodeAt(i))%cols.length;return cols[h];}


/* ══════════════════ LEARN SECTION HELPERS ══════════════════ */
function scrollLearn(id){
  const el=document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
function lsCk(el){
  el.classList.toggle('done');
}
function activateIndicator(name){
  // Switch to chart tab and enable the indicator
  showTab('chart');
  if(!ST.inds.has(name)){
    ST.inds.add(name);
    const btn=document.getElementById('i'+name.toUpperCase());
    if(btn) btn.classList.add('on');
    renderChart();
    saveState();
  }
}

/* ══════════════════ TABS / THEME / CHECKLIST ══════════════════ */
function showTab(n){
  document.getElementById('chartTab').style.display = n==='chart'?'flex':'none';
  document.getElementById('learnSec').style.display = n==='learn'?'flex':'none';
  
  // Sync nav buttons by text content
  document.querySelectorAll('.hdr-nav .nb').forEach(b=>{
    const txt=b.textContent||'';
    b.classList.toggle('on',
      (n==='chart'&&txt.includes('Chart'))||
      (n==='learn'&&txt.includes('Learn'))||
      (n==='news' &&txt.includes('News'))
    );
  });
  if(n==='chart') setTimeout(renderChart,50);
  if(n==='news'){
    // News section is Coming Soon — no fetch needed
  }
}
function ck(li){li.classList.toggle('done');li.querySelector('.ck').textContent=li.classList.contains('done')?'✓':'';}
let lm=false;
function toggleTheme(){
  lm=!lm;
  const v=(k,d,l)=>document.documentElement.style.setProperty(k,lm?l:d);
  v('--bg','#050810','#f0f4fa');
  v('--bg2','#0a1020','#e4eaf5');
  v('--surface','#0d1628','#d8e2f0');
  v('--border','#1a2d4a','#a0b4d0');
  v('--text','#e0eeff','#0a1020');
  v('--text2','#7a9cc0','#2a4060');
  v('--text3','#3a5a80','#6080a0');
  document.documentElement.setAttribute('data-theme', lm?'light':'dark');
  renderChart();
}

/* resize */
new ResizeObserver(()=>renderChart()).observe(document.getElementById('chartZone'));

/* ══════════════════ ENTER / INIT ══════════════════ */
function enterApp(){
  // Auto-enter is handled by the splash sequence timer.
  // This is kept as a fallback no-op.
}

async function initApp(){
  // ── Restore saved state first ───────────────────────────
  const hadSaved = loadState();

  // Show chart tab by default
  showTab('chart');

  setupSearch();
  setupModalSearch();
  initCoinInfoPopup();
  initTimeMachine();
  updateAlertCoinName();
  renderAlerts();

  // Sync UI to restored state
  document.querySelectorAll('.tf').forEach(b=>{
    const tfMap={'1':'1d','7':'7d','30':'30d','90':'90d','365':'1y','1825':'5y','max':'MAX'};
    b.classList.toggle('on', b.textContent === (tfMap[ST.tf]||'30d'));
  });
  document.getElementById('candleBtn')?.classList.toggle('on', ST.ct==='candle');
  document.getElementById('lineBtn')?.classList.toggle('on',   ST.ct==='line');
  // Sync all indicator buttons (right panel rp-ind + mobile ind-panel)
  ST.inds.forEach(n=>{
    document.getElementById('i'+n.toUpperCase())?.classList.add('on');
    document.querySelectorAll('.ind-panel .ind').forEach(b=>{
      if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+n+"'")){b.classList.add('on');}
    });
  });
  // Restore draw color
  if(DRW.color){
    const colorMap={'#00d4ff':'dcAqua','#00ff88':'dcGreen','#ff3366':'dcRed','#ffc800':'dcYellow','#9664ff':'dcPurple'};
    const btnId=colorMap[DRW.color];
    if(btnId) setDrawColor(DRW.color,btnId);
  }
  // Default pointer active
  document.getElementById('dtPointer')?.classList.add('on');

  // Draw placeholder gauge while loading
  drawFGGauge(50,'#ffc800');
  setDot('wait');
  await loadPrices();
  await sleep(300);
  await loadTrending();
  await sleep(300);
  loadTicker();
  await sleep(300);
  await loadChart(ST.coin.id, ST.tf);

  // ── Auto-save + polling — staggered so they don't all fire at once ─────
  // Intervals are paused when tab is hidden to reduce CPU burn and
  // prevent the browser's document_idle from never settling.
  let _ivSave, _ivPrices, _ivTicker, _ivAlerts, _ivFG;
  function startIntervals(){
    _ivSave   = setInterval(saveState,   30000);
    setTimeout(()=>{ _ivPrices = setInterval(loadPrices,  90000); }, 5000);
    setTimeout(()=>{ _ivTicker = setInterval(loadTicker, 240000); }, 12000);
    setTimeout(()=>{ _ivAlerts = setInterval(checkAlerts, 15000); }, 3000);
    setTimeout(()=>{ _ivFG     = setInterval(loadFearGreed, 3600000); }, 20000);
  }
  function stopIntervals(){
    [_ivSave,_ivPrices,_ivTicker,_ivAlerts,_ivFG].forEach(id=>clearInterval(id));
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ stopIntervals(); }
    else { stopIntervals(); startIntervals(); loadPrices(); }
  });
  startIntervals();

  // ── Fear & Greed ────────────────────────────────────────
  loadFearGreed();

  if(hadSaved){
    showToast('👋 Welcome back!',
      `Restored your ${ST.wl.length} watchlist tokens and ${ALERTS.length} alert${ALERTS.length!==1?'s':''}.`,
      'info', 3500);
  }
}

/* ══════════════════ COIN INFO POPUP ══════════════════════ */
let _cipTimeout=null, _cipHideTimeout=null, _cipCurrentId=null;


// cipHover: read data-* attrs from button and call showCoinInfo safely
function cipHover(btn){
  showCoinInfo(
    {target:btn, stopPropagation:()=>{}},
    btn.dataset.id,
    btn.dataset.name,
    btn.dataset.sym,
    btn.dataset.img
  );
}
async function showCoinInfo(e, id, name, symbol, image){
  e.stopPropagation();
  clearTimeout(_cipHideTimeout);
  clearTimeout(_cipTimeout);

  const popup = document.getElementById('coinInfoPopup');
  if(!popup) return;

  // If same coin already loaded and visible, just keep it open
  if(_cipCurrentId === id && popup.classList.contains('show')) return;

  // Position the popup next to the hovered button
  const rect = e.target.getBoundingClientRect();
  const pw = 288, ph = 400;
  let left = rect.right + 12;
  let top  = rect.top - 10;
  if(left + pw > window.innerWidth  - 8) left = rect.left - pw - 8;
  if(left < 8) left = 8;
  if(top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
  if(top < 8) top = 8;
  popup.style.left = left + 'px';
  popup.style.top  = top  + 'px';

  // Update header — use innerHTML on wrapper, never outerHTML
  const col = rc(symbol || '');
  const wrap = document.getElementById('cipImgWrap');
  if(wrap){
    if(image){
      const abbr = (symbol||'?').substring(0,3);
      wrap.innerHTML = `<img class="cip-img" src="${image}" alt=""
        onerror="this.outerHTML='<div class=cip-img-fb style=background:${col}22;color:${col};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:.48rem;font-weight:900;>${abbr}</div>'">`;
    } else {
      const abbr = (symbol||'?').substring(0,3);
      wrap.innerHTML = `<div class="cip-img-fb" style="background:${col}22;color:${col};">${abbr}</div>`;
    }
  }
  const nameEl = document.getElementById('cipName');
  const symEl  = document.getElementById('cipSym');
  const body   = document.getElementById('cipBody');
  const footer = document.getElementById('cipFooter');
  if(nameEl) nameEl.textContent = name || '—';
  if(symEl)  symEl.textContent  = (symbol||'—') + ' / USD';
  if(body)   body.innerHTML = '<div class="cip-loading"><div class="spin" style="display:inline-block;width:12px;height:12px;border-width:1.5px;vertical-align:middle;margin-right:6px;"></div>Loading info…</div>';
  if(footer) footer.textContent = 'Hover away to close';

  _cipCurrentId = id;
  popup.classList.add('show');

  // Fetch full coin data — 5 min cache so repeated hovers are instant
  _cipTimeout = setTimeout(async () => {
    if(_cipCurrentId !== id) return;
    try {
      const data = await cgFetch(
        `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
        300000
      );
      if(_cipCurrentId !== id) return;
      renderCoinInfoPopup(data);
    } catch(err) {
      if(_cipCurrentId !== id) return;
      if(body) body.innerHTML = '<div class="cip-loading" style="color:var(--red);">⚠ Could not load — check connection</div>';
    }
  }, 250);
}

function renderCoinInfoPopup(d){
  const m=d.market_data||{};
  const price=m.current_price?.usd;
  const change24=m.price_change_percentage_24h;
  const change7=m.price_change_percentage_7d;
  const change30=m.price_change_percentage_30d;
  const ath=m.ath?.usd;
  const athDate=m.ath_date?.usd;
  const atl=m.atl?.usd;
  const mcap=m.market_cap?.usd;
  const vol=m.total_volume?.usd;
  const supply=m.circulating_supply;
  const maxSupply=m.max_supply;
  const rank=d.market_cap_rank;
  const genesis=d.genesis_date;
  const desc=(d.description?.en||'').replace(/<[^>]+>/g,'').substring(0,150);
  const categories=(d.categories||[]).filter(Boolean).slice(0,3).join(', ');
  const website=(d.links?.homepage||[]).filter(Boolean)[0]||'';
  const athPct=ath&&price?((price-ath)/ath*100):null;
  const athDateStr=athDate?new Date(athDate).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'—';

  const row=(lbl,val,cls='')=>`<div class="cip-row"><span class="cip-lbl">${lbl}</span><span class="cip-val${cls?' '+cls:''}">${val}</span></div>`;
  const chCls=v=>v==null?'':(v>=0?' pos':' neg');
  const chStr=v=>v==null?'—':`${v>=0?'+':''}${v.toFixed(2)}%`;

  let body='';
  if(rank)         body+=row('Market Cap Rank','#'+rank,'accent');
  body+=row('Current Price',price?'$'+fP(price):'—','accent');
  if(change24!=null) body+=row('24h Change',chStr(change24),chCls(change24));
  if(change7!=null)  body+=row('7d Change', chStr(change7), chCls(change7));
  if(change30!=null) body+=row('30d Change',chStr(change30),chCls(change30));
  if(mcap)           body+=row('Market Cap','$'+fL(mcap));
  if(vol)            body+=row('24h Volume','$'+fL(vol));
  if(ath)            body+=row('All-Time High','$'+fP(ath));
  if(athPct!=null)   body+=row('From ATH',chStr(athPct),chCls(athPct));
  if(athDate)        body+=row('ATH Date',athDateStr);
  if(atl)            body+=row('All-Time Low','$'+fP(atl));
  if(supply)         body+=row('Circulating',fL(supply)+' '+d.symbol?.toUpperCase());
  if(maxSupply)      body+=row('Max Supply',fL(maxSupply));
  if(genesis)        body+=row('Launch Date',new Date(genesis).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}));
  if(categories)     body+=row('Categories',categories);

  document.getElementById('cipBody').innerHTML=body;

  // Footer: short description or website
  const footer=document.getElementById('cipFooter');
  if(footer){
    if(desc) footer.innerHTML=`<span style="line-height:1.5;display:block;">${desc}${desc.length>=150?'…':''}</span>`;
    else if(website) footer.innerHTML=`<a href="${website}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none;">${website.replace(/https?:\/\//,'').split('/')[0]}</a>`;
    else footer.textContent='Hover away to close';
  }
}

function hideCoinInfo(){
  _cipHideTimeout=setTimeout(()=>{
    const popup=document.getElementById('coinInfoPopup');
    if(popup)popup.classList.remove('show');
    _cipCurrentId=null;
    clearTimeout(_cipTimeout);
  },400);
}
// Attach popup hover listeners - called from initApp after DOM is ready
function initCoinInfoPopup(){
  const popup=document.getElementById('coinInfoPopup');
  if(!popup)return;
  popup.addEventListener('mouseenter',()=>clearTimeout(_cipHideTimeout));
  popup.addEventListener('mouseleave',hideCoinInfo);
}

/* ── HATTY LINKS DROPDOWN ─────────────────────────────── */
function toggleHattyDrop(e){
  e.stopPropagation();
  document.getElementById('hattyDropWrap').classList.toggle('open');
}
document.addEventListener('click',e=>{
  const w=document.getElementById('hattyDropWrap');
  if(w&&!w.contains(e.target))w.classList.remove('open');
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.getElementById('hattyDropWrap')?.classList.remove('open');
});


/* ══════════════════ CNT HELPERS ══════════════════ */
async function quickAddCNT(id, name, sym, img){
  const existing = ST.wl.find(c => c.id === id);
  if(existing){ await selectCoin(id, name, sym, img || existing.image || ''); return; }
  showToast('🔵 Adding '+sym, 'Fetching '+name+' price…', 'info', 2000);
  await addToWL(id, name, sym, img);
  await selectCoin(id, name, sym, img || ST.wl.find(c=>c.id===id)?.image || '');
}
function toggleCNTPanel(){
  const list = document.getElementById('cntList');
  const btn  = document.getElementById('cntToggle');
  if(!list || !btn) return;
  const collapsed = list.style.display === 'none';
  list.style.display = collapsed ? '' : 'none';
  btn.textContent = collapsed ? '▼' : '▶';
}
function openCardanoModal(){
  openModal();
  setTimeout(()=>{
    const btn = [...document.querySelectorAll('.mc')].find(b => b.textContent.includes('Cardano'));
    if(btn){ document.querySelectorAll('.mc').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); ST.mb.cat='cardano-ecosystem'; ST.mb.page=1; fetchModal(); }
  }, 80);
}

/* ══════════════════ TRENDING COLLAPSE ══════════════════ */
function toggleTrendingPanel(){
  const body = document.getElementById('trList');
  const btn  = document.getElementById('trendingToggle');
  if(!body || !btn) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  btn.textContent = collapsed ? '▼' : '▶';
}



/* Exposing functions to window for inline HTML handlers */
if(typeof animate === 'function') window.animate = animate;
if(typeof getUrl === 'function') window.getUrl = getUrl;
if(typeof apiFetchDirect === 'function') window.apiFetchDirect = apiFetchDirect;
if(typeof apiFetch === 'function') window.apiFetch = apiFetch;
if(typeof sleep === 'function') window.sleep = sleep;
if(typeof setDot === 'function') window.setDot = setDot;
if(typeof pxToCandleIdx === 'function') window.pxToCandleIdx = pxToCandleIdx;
if(typeof pxToPrice === 'function') window.pxToPrice = pxToPrice;
if(typeof priceToY === 'function') window.priceToY = priceToY;
if(typeof candleToX === 'function') window.candleToX = candleToX;
if(typeof setDrawTool === 'function') window.setDrawTool = setDrawTool;
if(typeof setDrawColor === 'function') window.setDrawColor = setDrawColor;
if(typeof undoDraw === 'function') window.undoDraw = undoDraw;
if(typeof clearDrawings === 'function') window.clearDrawings = clearDrawings;
if(typeof updateDrawCount === 'function') window.updateDrawCount = updateDrawCount;
if(typeof loadPrices === 'function') window.loadPrices = loadPrices;
if(typeof fetchCCPrice === 'function') window.fetchCCPrice = fetchCCPrice;
if(typeof fetchCCChart === 'function') window.fetchCCChart = fetchCCChart;
if(typeof loadChart === 'function') window.loadChart = loadChart;
if(typeof synthCandles === 'function') window.synthCandles = synthCandles;
if(typeof setupSearch === 'function') window.setupSearch = setupSearch;
if(typeof doSearch === 'function') window.doSearch = doSearch;
if(typeof clearSearch === 'function') window.clearSearch = clearSearch;
if(typeof sbAddWL === 'function') window.sbAddWL = sbAddWL;
if(typeof selectCoin === 'function') window.selectCoin = selectCoin;
if(typeof addToWL === 'function') window.addToWL = addToWL;
if(typeof removeFromWL === 'function') window.removeFromWL = removeFromWL;
if(typeof renderWL === 'function') window.renderWL = renderWL;
if(typeof selectCoinByIdx === 'function') window.selectCoinByIdx = selectCoinByIdx;
if(typeof refreshWL === 'function') window.refreshWL = refreshWL;
if(typeof updateHdr === 'function') window.updateHdr = updateHdr;
if(typeof loadTrending === 'function') window.loadTrending = loadTrending;
if(typeof loadTicker === 'function') window.loadTicker = loadTicker;
if(typeof openModal === 'function') window.openModal = openModal;
if(typeof closeModal === 'function') window.closeModal = closeModal;
if(typeof mBgClick === 'function') window.mBgClick = mBgClick;
if(typeof setMCat === 'function') window.setMCat = setMCat;
if(typeof setMSort === 'function') window.setMSort = setMSort;
if(typeof setupModalSearch === 'function') window.setupModalSearch = setupModalSearch;
if(typeof fetchModal === 'function') window.fetchModal = fetchModal;
if(typeof cgFetch === 'function') window.cgFetch = cgFetch;
if(typeof renderModal === 'function') window.renderModal = renderModal;
if(typeof mAdd === 'function') window.mAdd = mAdd;
if(typeof renderMPg === 'function') window.renderMPg = renderMPg;
if(typeof mPage === 'function') window.mPage = mPage;
if(typeof renderChart === 'function') window.renderChart = renderChart;
if(typeof calcRSI === 'function') window.calcRSI = calcRSI;
if(typeof calcEMA === 'function') window.calcEMA = calcEMA;
if(typeof calcMACD === 'function') window.calcMACD = calcMACD;
if(typeof loadFearGreed === 'function') window.loadFearGreed = loadFearGreed;
if(typeof drawFGGauge === 'function') window.drawFGGauge = drawFGGauge;
if(typeof loadMiniCharts === 'function') window.loadMiniCharts = loadMiniCharts;
if(typeof drawMiniChart === 'function') window.drawMiniChart = drawMiniChart;
if(typeof setTFFromMini === 'function') window.setTFFromMini = setTFFromMini;
if(typeof detectPatterns === 'function') window.detectPatterns = detectPatterns;
if(typeof renderPatterns === 'function') window.renderPatterns = renderPatterns;
if(typeof renderFibDrawing === 'function') window.renderFibDrawing = renderFibDrawing;
if(typeof showNoteInput === 'function') window.showNoteInput = showNoteInput;
if(typeof saveState === 'function') window.saveState = saveState;
if(typeof loadState === 'function') window.loadState = loadState;
if(typeof clearSavedState === 'function') window.clearSavedState = clearSavedState;
if(typeof toggleAlertPanel === 'function') window.toggleAlertPanel = toggleAlertPanel;
if(typeof updateAlertCoinName === 'function') window.updateAlertCoinName = updateAlertCoinName;
if(typeof addAlert === 'function') window.addAlert = addAlert;
if(typeof deleteAlert === 'function') window.deleteAlert = deleteAlert;
if(typeof renderAlerts === 'function') window.renderAlerts = renderAlerts;
if(typeof checkAlerts === 'function') window.checkAlerts = checkAlerts;
if(typeof playAlertDing === 'function') window.playAlertDing = playAlertDing;
if(typeof triggerAlert === 'function') window.triggerAlert = triggerAlert;
if(typeof showToast === 'function') window.showToast = showToast;
if(typeof closeToast === 'function') window.closeToast = closeToast;
if(typeof openSettings === 'function') window.openSettings = openSettings;
if(typeof closeSettings === 'function') window.closeSettings = closeSettings;
if(typeof smBgClick === 'function') window.smBgClick = smBgClick;
if(typeof smToggleTheme === 'function') window.smToggleTheme = smToggleTheme;
if(typeof smTogglePatterns === 'function') window.smTogglePatterns = smTogglePatterns;
if(typeof smExportData === 'function') window.smExportData = smExportData;
if(typeof smClearDrawings === 'function') window.smClearDrawings = smClearDrawings;
if(typeof smClearAlerts === 'function') window.smClearAlerts = smClearAlerts;
if(typeof smClearEverything === 'function') window.smClearEverything = smClearEverything;
if(typeof showSettingsToast === 'function') window.showSettingsToast = showSettingsToast;
if(typeof setTF === 'function') window.setTF = setTF;
if(typeof setCT === 'function') window.setCT = setCT;
if(typeof toggleInd === 'function') window.toggleInd = toggleInd;
if(typeof doRefresh === 'function') window.doRefresh = doRefresh;
if(typeof showIT === 'function') window.showIT = showIT;
if(typeof hideIT === 'function') window.hideIT = hideIT;
if(typeof initTimeMachine === 'function') window.initTimeMachine = initTimeMachine;
if(typeof runTimeMachine === 'function') window.runTimeMachine = runTimeMachine;
if(typeof showTMSuccess === 'function') window.showTMSuccess = showTMSuccess;
if(typeof showTMError === 'function') window.showTMError = showTMError;
if(typeof scrollChartToDate === 'function') window.scrollChartToDate = scrollChartToDate;
if(typeof drawTMMarker === 'function') window.drawTMMarker = drawTMMarker;
if(typeof fP === 'function') window.fP = fP;
if(typeof fL === 'function') window.fL = fL;
if(typeof esc === 'function') window.esc = esc;
if(typeof rc === 'function') window.rc = rc;
if(typeof scrollLearn === 'function') window.scrollLearn = scrollLearn;
if(typeof lsCk === 'function') window.lsCk = lsCk;
if(typeof activateIndicator === 'function') window.activateIndicator = activateIndicator;
if(typeof showTab === 'function') window.showTab = showTab;
if(typeof ck === 'function') window.ck = ck;
if(typeof toggleTheme === 'function') window.toggleTheme = toggleTheme;
if(typeof enterApp === 'function') window.enterApp = enterApp;
if(typeof initApp === 'function') window.initApp = initApp;
if(typeof startIntervals === 'function') window.startIntervals = startIntervals;
if(typeof stopIntervals === 'function') window.stopIntervals = stopIntervals;
if(typeof cipHover === 'function') window.cipHover = cipHover;
if(typeof showCoinInfo === 'function') window.showCoinInfo = showCoinInfo;
if(typeof renderCoinInfoPopup === 'function') window.renderCoinInfoPopup = renderCoinInfoPopup;
if(typeof hideCoinInfo === 'function') window.hideCoinInfo = hideCoinInfo;
if(typeof initCoinInfoPopup === 'function') window.initCoinInfoPopup = initCoinInfoPopup;
if(typeof toggleHattyDrop === 'function') window.toggleHattyDrop = toggleHattyDrop;
if(typeof quickAddCNT === 'function') window.quickAddCNT = quickAddCNT;
if(typeof toggleCNTPanel === 'function') window.toggleCNTPanel = toggleCNTPanel;
if(typeof openCardanoModal === 'function') window.openCardanoModal = openCardanoModal;
if(typeof toggleTrendingPanel === 'function') window.toggleTrendingPanel = toggleTrendingPanel;
if(typeof resize === 'function') window.resize = resize;
if(typeof ch === 'function') window.ch = ch;
if(typeof cw === 'function') window.cw = cw;
if(typeof rp === 'function') window.rp = rp;
if(typeof items === 'function') window.items = items;
if(typeof needsClientSort === 'function') window.needsClientSort = needsClientSort;
if(typeof asc === 'function') window.asc = asc;
if(typeof av === 'function') window.av = av;
if(typeof zv === 'function') window.zv = zv;
if(typeof pct === 'function') window.pct = pct;
if(typeof hxN === 'function') window.hxN = hxN;
if(typeof data === 'function') window.data = data;
if(typeof hit === 'function') window.hit = hit;
if(typeof el === 'function') window.el = el;
if(typeof chgStr === 'function') window.chgStr = chgStr;
if(typeof v === 'function') window.v = v;
if(typeof abbr === 'function') window.abbr = abbr;
if(typeof desc === 'function') window.desc = desc;
if(typeof categories === 'function') window.categories = categories;
if(typeof website === 'function') window.website = website;
if(typeof row === 'function') window.row = row;

/* ══════════════════ FIREBASE AUTH & DATABASE ════════════════════════ */
let P_ = null;

function F_() {
  window.fbSignOut(window.firebaseAuth);
}

setTimeout(() => {
  if (window.fbOnAuthStateChanged) {
    window.fbOnAuthStateChanged(window.firebaseAuth, async e => {
      P_ = e;
      let t = document.getElementById('authBtn');
      if (e) {
        t.innerHTML = '👤 Sign Out';
        t.onclick = F_;
        try {
          // Fetch watchlist from Realtime Database
          let ref = window.fbRef(window.firebaseDb, `users/${e.uid}`);
          let snapshot = await window.fbGet(ref);
          if (snapshot.exists()) {
            ST.wl = snapshot.val().watchlist || [];
            renderWL({});
            saveState();
          }
        } catch (err) {
          console.error('Error fetching watchlist from Firebase:', err);
        }
      } else {
        t.innerHTML = '👤 Log In';
        t.onclick = () => { document.getElementById('fbModal').style.display = 'flex'; };
        ST.wl = [];
        renderWL({});
        saveState();
      }
    });
  }
}, 1000);

// Intercept addWL and rmWL to save to Firebase
const origAddWL = window.addWL || (typeof addWL === 'function' ? addWL : function(){});
const origRmWL  = window.rmWL  || (typeof rmWL  === 'function' ? rmWL  : function(){});

function syncFirebaseWL() {
  if (P_) {
    let ref = window.fbRef(window.firebaseDb, `users/${P_.uid}`);
    window.fbSet(ref, { watchlist: ST.wl }).catch(err => {
      console.error('Error saving watchlist to Firebase:', err);
    });
  }
}

if(typeof addWL === 'function') {
  window.addWL = function(...args) { origAddWL(...args); syncFirebaseWL(); };
  addWL = window.addWL;
}
if(typeof rmWL === 'function') {
  window.rmWL = function(...args) { origRmWL(...args); syncFirebaseWL(); };
  rmWL = window.rmWL;
}

