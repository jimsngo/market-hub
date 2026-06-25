// Global safety guard to prevent duplicate variable errors across decoupled scripts
if (typeof PROXY === 'undefined') {
    window.PROXY = "https://script.google.com/macros/s/AKfycbzA28YtFZenD8vH4tTDU95C2Mowv4uOTeGuCU_ipkkk7YpMnt-zDuxQ-EHMkfXiqIMY/exec?url=";
}

// Hardened backup proxy line to preserve uptime if Google Script handshakes drop
const BACKUP_PROXY = "https://api.allorigins.win/get?url=";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- SURGICAL INDICATOR HELPERS ---

// Standard Technical Ichimoku (9, 26) Equilibrium Midpoint Engine
function calculateIchimoku(history) {
    // Safety drop if there isn't enough historical depth to compute the Kijun baseline
    if (history.length < 26) return { tenkan: 0, kijun: 0, trend: "Neutral", distanceKijun: 0 };

    const slice9 = history.slice(-9);   // Calibrated to standard 9-period lookback
    const slice26 = history.slice(-26); // Calibrated to standard 26-period lookback
    const currentPrice = history[history.length - 1].c;

    // Tenkan-Sen (9-period midpoint)
    const high9 = Math.max(...slice9.map(d => d.h));
    const low9 = Math.min(...slice9.map(d => d.l));
    const tenkan = (high9 + low9) / 2;

    // Kijun-Sen (26-period midpoint)
    const high26 = Math.max(...slice26.map(d => d.h));
    const low26 = Math.min(...slice26.map(d => d.l));
    const kijun = (high26 + low26) / 2;

    // Establish pure structural posture status
    let trend = "Neutral";
    if (currentPrice > tenkan && currentPrice > kijun) {
        trend = "Bullish";
    } else if (currentPrice < tenkan && currentPrice < kijun) {
        trend = "Bearish";
    }

    // Normalized tracking calculation for sector rotation scoring 
    const distanceKijun = kijun !== 0 ? ((currentPrice - kijun) / kijun) * 100 : 0;

    return {
        tenkan: parseFloat(tenkan.toFixed(2)),
        kijun: parseFloat(kijun.toFixed(2)),
        trend: trend,
        distanceKijun: parseFloat(distanceKijun.toFixed(2))
    };
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

                // Process the custom Ichimoku calculations
                const ichi = calculateIchimoku(history);

                results.indices[ticker] = {
                    price: currentPrice.toFixed(2),
                    dailyChange: changePct,
                    change5d: parseFloat(changePct), 
                    tenkan: ichi.tenkan,
                    kijun: ichi.kijun,
                    trend: ichi.trend,
                    score: ichi.distanceKijun, // Injected proxy variable for UI rendering blocks
                    conf: (currentPrice > smaValue && ichi.trend === "Bullish") ? "UP" : "DOWN",
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
        .map(s => ({ ticker: s, score: results.indices[s].score }))
        .sort((a, b) => b.score - a.score);

    return results;
}