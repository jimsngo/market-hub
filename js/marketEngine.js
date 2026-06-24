// Global safety guard to prevent duplicate variable errors across decoupled scripts
if (typeof PROXY === 'undefined') {
    window.PROXY = "https://script.google.com/macros/s/AKfycbzA28YtFZenD8vH4tTDU95C2Mowv4uOTeGuCU_ipkkk7YpMnt-zDuxQ-EHMkfXiqIMY/exec?url=";
}

// Hardened backup proxy line to preserve uptime if Google Script handshakes drop
const BACKUP_PROXY = "https://api.allorigins.win/get?url=";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- SURGICAL INDICATOR HELPERS ---

// Generates a sequentially smoothed EMA array to allow precise double smoothing
function calculateEMAArray(data, period) {
    if (!data.length) return [];
    const k = 2 / (period + 1);
    let ema = data[0];
    const results = [ema];
    for (let i = 1; i < data.length; i++) {
        ema = (data[i] - ema) * k + ema;
        results.push(ema);
    }
    return results;
}

// Custom Technical SMI: 10-day Momentum Engine with 5-day Normalization Window
function calculateSurgicalSMI(history) {
    const rangeLength = 5; // 5-day high/low filter
    const smooth = 3;      // Double smoothing length
    
    if (history.length < 15) return 0;
    
    let diffs = [];
    let ranges = [];
    
    // Compute raw metrics across the historical window
    for (let i = rangeLength - 1; i < history.length; i++) {
        const slice = history.slice(i - rangeLength + 1, i + 1);
        const h = Math.max(...slice.map(d => d.h));
        const l = Math.min(...slice.map(d => d.l));
        const c = history[i].c;
        
        const range = h - l;
        const midpoint = (h + l) / 2;
        
        diffs.push(c - midpoint);
        ranges.push(range);
    }
    
    // Sequential Double Smoothing (EMA of EMA)
    const emaDiff1 = calculateEMAArray(diffs, smooth);
    const emaDiff2 = calculateEMAArray(emaDiff1, smooth);
    
    const emaRange1 = calculateEMAArray(ranges, smooth);
    const emaRange2 = calculateEMAArray(emaRange1, smooth);
    
    if (emaRange2.length === 0) return 0;
    
    const finalDiff = emaDiff2[emaDiff2.length - 1];
    const finalRange = emaRange2[emaRange2.length - 1];
    
    return (finalRange !== 0) ? Math.round((finalDiff / (finalRange / 2)) * 100) : 0;
}

// --- MAIN DATA ENGINE ---

async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, ts: new Date().toLocaleTimeString(), moneyFlow: [] };

    for (let sym of symbols) {
        try {
            await sleep(150); // Proxy firewall safety pacing

            // Interval calibrated to daily 1d frequency lookbacks
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=3mo`;
            let response, raw;

            try {
                // Try Primary Attempt: Google Apps Script Proxy
                response = await fetch(PROXY + encodeURIComponent(targetUrl), {
                    method: 'GET',
                    redirect: 'follow'
                });
                raw = await response.json();
            } catch (primaryError) {
                console.warn(`Primary proxy failed for ${sym}. Triggering backup router...`);
                
                // Fallback Attempt: Public open CORS router line
                response = await fetch(BACKUP_PROXY + encodeURIComponent(targetUrl));
                const wrappedData = await response.json();
                raw = JSON.parse(wrappedData.contents);
            }
            
            if (raw?.chart?.result?.[0]) {
                const res = raw.chart.result[0];
                const ind = res.indicators.quote[0];
                const ticker = sym.replace('%5E', '').replace('TNX', 'TNX').toUpperCase();

                const history = res.timestamp.map((t, i) => ({
                    c: ind.close[i], h: ind.high[i], l: ind.low[i]
                })).filter(d => d.c !== null && d.h !== null && d.l !== null);

                // Isolate current active daily bars
                const last = history[history.length - 1]; 
                const prev = history[history.length - 2]; 
                const smaValue = history.reduce((acc, val) => acc + val.c, 0) / history.length;
                
                const currentPrice = last.c;
                
                // Track current rolling 5-day window boundaries instead of fixed weekly frames
                const last5Days = history.slice(-5);
                const weekHigh = Math.max(...last5Days.map(d => d.h));
                const weekLow = Math.min(...last5Days.map(d => d.l));
                
                // Calculate tracking location relative to running High/Low parameters
                let currentPct = 50;
                const weekRange = weekHigh - weekLow;
                if (weekRange > 0) {
                    currentPct = ((currentPrice - weekLow) / weekRange) * 100;
                }
                currentPct = Math.max(0, Math.min(100, currentPct));

                const changePct = ((last.c - prev.c) / prev.c * 100).toFixed(2);

                // Process the 10-day custom momentum / 5-day normalization window SMI calculations
                const smiValue = calculateSurgicalSMI(history);

                results.indices[ticker] = {
                    price: currentPrice.toFixed(2),
                    dailyChange: changePct,
                    change5d: parseFloat(changePct), 
                    smi: smiValue,
                    conf: (currentPrice > smaValue && smiValue > 0) ? "UP" : "DOWN",
                    valueGap: "N/A",
                    weekHigh: weekHigh.toFixed(2),
                    weekLow: weekLow.toFixed(2),
                    currentPct: currentPct.toFixed(1)
                };

                if (ticker === "TNX") results.yield = currentPrice;
            }
        } catch (e) { 
            console.error(`Complete pipeline drop for symbol ${sym}:`, e); 
        }
    }

    // Apply baseline valuation gaps
    Object.keys(results.indices).forEach(key => {
        const cfg = indexConfigs[key];
        if (cfg && cfg.pe > 0 && key !== 'TNX') {
            const earningsYield = (100 / cfg.pe);
            const gap = (earningsYield - results.yield).toFixed(2);
            results.indices[key].valueGap = gap + "%";
        }
    });

    // Handle precious metals value gaps manually against 2-Yr yield parity
    if (results.indices["GLD"] && results.yield > 0) {
        const gldEarningsYield = (100 / 22.5); 
        results.indices["GLD"].valueGap = (gldEarningsYield - results.yield * 0.93).toFixed(2) + "%";
    }
    if (results.indices["SLV"] && results.yield > 0) {
        const slvEarningsYield = (100 / 25.0); 
        results.indices["SLV"].valueGap = (slvEarningsYield - results.yield * 0.93).toFixed(2) + "%";
    }

    const sectors = ["XLK", "XLF", "XLV", "XLY"];
    results.moneyFlow = sectors
        .filter(s => results.indices[s])
        .map(s => ({ ticker: s, score: results.indices[s].smi }))
        .sort((a, b) => b.score - a.score);

    return results;
}