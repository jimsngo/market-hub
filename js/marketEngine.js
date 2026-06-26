// Global safety guard to prevent duplicate variable errors across decoupled scripts
if (typeof PROXY === 'undefined') {
    window.PROXY = "https://script.google.com/macros/s/AKfycbzA28YtFZenD8vH4tTDU95C2Mowv4uOTeGuCU_ipkkk7YpMnt-zDuxQ-EHMkfXiqIMY/exec?url=";
}

// Hardened backup proxy line to preserve uptime if Google Script handshakes drop
const BACKUP_PROXY = "https://api.allorigins.win/get?url=";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- SURGICAL INDICATOR HELPERS ---

// Upgraded Technical Ichimoku Engine incorporating 26-Period Forward Displaced Cloud
function calculateIchimoku(history) {
    const N = history.length;
    // Requires a minimum of 78 bars to compute a 52-period Span B lookback from 26 days ago
    if (N < 78) return { tenkan: 0, kijun: 0, trend: "Neutral", cloud: "Inside", distanceKijun: 0 };

    // 1. TODAY'S EQUILIBRIUM VALUES
    const slice9_today = history.slice(-9);   // Standard 9-period lookback
    const slice26_today = history.slice(-26); // Standard 26-period lookback
    const currentPrice = history[N - 1].c;

    const tenkan = (Math.max(...slice9_today.map(d => d.h)) + Math.min(...slice9_today.map(d => d.l))) / 2;
    const kijun = (Math.max(...slice26_today.map(d => d.h)) + Math.min(...slice26_today.map(d => d.l))) / 2;

    // 2. CORRECTION: 26-BAR HISTORICAL OFFSET FOR TODAY'S CLOUD BOUNDARIES
    const targetIdx = N - 1 - 26;

    // Span A (Displaced 26 bars forward to represent today's floor): (Tenkan @ target + Kijun @ target) / 2
    const slice9_target = history.slice(targetIdx - 8, targetIdx + 1);
    const slice26_target = history.slice(targetIdx - 25, targetIdx + 1);

    const tenkan_target = (Math.max(...slice9_target.map(d => d.h)) + Math.min(...slice9_target.map(d => d.l))) / 2;
    const kijun_target = (Math.max(...slice26_target.map(d => d.h)) + Math.min(...slice26_target.map(d => d.l))) / 2;
    const spanA = (tenkan_target + kijun_target) / 2;

    // Span B (Displaced 26 bars forward to represent today's ceiling): 52-period midpoint ending at targetIdx
    const slice52_target = history.slice(targetIdx - 51, targetIdx + 1);
    const spanB = (Math.max(...slice52_target.map(d => d.h)) + Math.min(...slice52_target.map(d => d.l))) / 2;

    // Short-Term Posture Status
    let trend = "Neutral";
    if (currentPrice > tenkan && currentPrice > kijun) {
        trend = "Bullish";
    } else if (currentPrice < tenkan && currentPrice < kijun) {
        trend = "Bearish";
    }

    // Long-Term Kumo Cloud Position Status (Synced with thinkorswim ground truth)
    let cloud = "Inside";
    if (currentPrice > spanA && currentPrice > spanB) {
        cloud = "Above";
    } else if (currentPrice < spanA && currentPrice < spanB) {
        cloud = "Below";
    }

    // Normalized tracking calculation for sector rotation scoring 
    const distanceKijun = kijun !== 0 ? ((currentPrice - kijun) / kijun) * 100 : 0;

    return {
        tenkan: parseFloat(tenkan.toFixed(2)),
        kijun: parseFloat(kijun.toFixed(2)),
        trend: trend,
        cloud: cloud,
        distanceKijun: parseFloat(distanceKijun.toFixed(2))
    };
}

// --- MAIN DATA ENGINE ---

async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, ts: new Date().toLocaleTimeString(), moneyFlow: [] };

    for (let sym of symbols) {
        try {
            await sleep(150); // Proxy firewall safety pacing

            // OPTIMIZATION: Extended lookback range from 3mo to 6mo to capture deep historical cloud data
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=6mo`;
            let response, raw;

            try {
                response = await fetch(PROXY + encodeURIComponent(targetUrl), {
                    method: 'GET',
                    redirect: 'follow'
                });
                raw = await response.json();
            } catch (primaryError) {
                console.warn(`Primary proxy failed for ${sym}. Triggering backup router...`);
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

                const last = history[history.length - 1]; 
                const prev = history[history.length - 2]; 
                const smaValue = history.reduce((acc, val) => acc + val.c, 0) / history.length;
                
                const currentPrice = last.c;
                
                const last5Days = history.slice(-5);
                const weekHigh = Math.max(...last5Days.map(d => d.h));
                const weekLow = Math.min(...last5Days.map(d => d.l));
                
                let currentPct = 50;
                const weekRange = weekHigh - weekLow;
                if (weekRange > 0) {
                    currentPct = ((currentPrice - weekLow) / weekRange) * 100;
                }
                currentPct = Math.max(0, Math.min(100, currentPct));

                const changePct = ((last.c - prev.c) / prev.c * 100).toFixed(2);

                const ichi = calculateIchimoku(history);

                results.indices[ticker] = {
                    price: currentPrice.toFixed(2),
                    dailyChange: changePct,
                    change5d: parseFloat(changePct), 
                    tenkan: ichi.tenkan,
                    kijun: ichi.kijun,
                    trend: ichi.trend,
                    cloud: ichi.cloud, // INJECTED TO REPAIR UI ALIGNMENT GAP
                    score: ichi.distanceKijun, 
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

    if (results.indices["GLD"] && results.yield > 0) {
        const gldEarningsYield = (100 / 22.5); 
        results.indices["GLD"].valueGap = (gldEarningsYield - results.yield * 0.93).toFixed(2) + "%";
    }
    if (results.indices["SLV"] && results.yield > 0) {
        const slvEarningsYield = (100 / 25.0); 
        results.indices["SLV"].valueGap = (slvEarningsYield - results.yield * 0.93).toFixed(2) + "%";
    }

    // EXPANDED SCORING MATRIX: Evaluates all 11 core sectors for money flow rankings
    const sectors = ["XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU"];
    results.moneyFlow = sectors
        .filter(s => results.indices[s])
        .map(s => ({ ticker: s, score: results.indices[s].score }))
        .sort((a, b) => b.score - a.score);

    return results;
}