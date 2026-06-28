// Global safety guard to prevent duplicate variable errors across decoupled scripts
if (typeof PROXY === 'undefined') {
    window.PROXY = "https://script.google.com/macros/s/AKfycbzA28YtFZenD8vH4tTDU95C2Mowv4uOTeGuCU_ipkkk7YpMnt-zDuxQ-EHMkfXiqIMY/exec?url=";
}

// Hardened backup proxy line to preserve uptime if Google Script handshakes drop
const BACKUP_PROXY = "https://api.allorigins.win/get?url=";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- SURGICAL INDICATOR HELPERS ---

// Universal Multi-Regime Scanner: Maps dynamic filters directly by tactical role
function getBinaryStateAt(history, idx, ticker) {
    const slice9 = history.slice(Math.max(0, idx - 8), idx + 1);
    const slice26 = history.slice(Math.max(0, idx - 25), idx + 1);
    const price = history[idx].c;

    const tenkan = (Math.max(...slice9.map(d => d.h)) + Math.min(...slice9.map(d => d.l))) / 2;
    const kijun = (Math.max(...slice26.map(d => d.h)) + Math.min(...slice26.map(d => d.l))) / 2;

    const isAboveST = (price > tenkan && price > kijun);

    // ⚡ GATEKEEPER EXCLUSION GATE: VIX & TNX evaluate pure short-term posture thresholds for rapid defense
    if (ticker === "VIX" || ticker === "TNX") {
        return isAboveST ? "Bullish" : "Bearish";
    }

    // 2. STANDARD DUAL-CONTAINMENT RULE FOR ALL CORE INDICES AND SECTORS
    if (idx < 78) {
        return isAboveST ? "Bullish" : "Bearish"; // Safe historical lookback boundary fallback
    }

    const targetIdx = idx - 26;
    const slice9_target = history.slice(targetIdx - 8, targetIdx + 1);
    const slice26_target = history.slice(targetIdx - 25, targetIdx + 1);
    const tenkan_target = (Math.max(...slice9_target.map(d => d.h)) + Math.min(...slice9_target.map(d => d.l))) / 2;
    const kijun_target = (Math.max(...slice26_target.map(d => d.h)) + Math.min(...slice26_target.map(d => d.l))) / 2;
    const spanA = (tenkan_target + kijun_target) / 2;

    const slice52_target = history.slice(targetIdx - 51, targetIdx + 1);
    const spanB = (Math.max(...slice52_target.map(d => d.h)) + Math.min(...slice52_target.map(d => d.l))) / 2;

    const isAboveLT = (price > spanA && price > spanB);

    return (isAboveST && isAboveLT) ? "Bullish" : "Bearish";
}

// Technical Evaluation Loop calculating contemporary and historical containment states
function calculateIchimoku(history, ticker) {
    const N = history.length;
    if (N < 26) return { tenkan: 0, kijun: 0, trend: "Neutral", cloud: "Inside", distanceKijun: 0, trendAge: 0 };

    const slice9_today = history.slice(-9);
    const slice26_today = history.slice(-26);
    const currentPrice = history[N - 1].c;

    const tenkan = (Math.max(...slice9_today.map(d => d.h)) + Math.min(...slice9_today.map(d => d.l))) / 2;
    const kijun = (Math.max(...slice26_today.map(d => d.h)) + Math.min(...slice26_today.map(d => d.l))) / 2;

    // Extract dynamic contemporary binary status
    const todayState = getBinaryStateAt(history, N - 1, ticker);

    // Track cloud positions cleanly purely to preserve layout string metrics on dashboard panels
    let cloud = "Inside";
    if (N >= 78) {
        const targetIdx = N - 1 - 26;
        const slice9_target = history.slice(targetIdx - 8, targetIdx + 1);
        const slice26_target = history.slice(targetIdx - 25, targetIdx + 1);
        const tenkan_target = (Math.max(...slice9_target.map(d => d.h)) + Math.min(...slice9_target.map(d => d.l))) / 2;
        const kijun_target = (Math.max(...slice26_target.map(d => d.h)) + Math.min(...slice26_target.map(d => d.l))) / 2;
        const spanA = (tenkan_target + kijun_target) / 2;
        const slice52_target = history.slice(targetIdx - 51, targetIdx + 1);
        const spanB = (Math.max(...slice52_target.map(d => d.h)) + Math.min(...slice52_target.map(d => d.l))) / 2;

        if (currentPrice > spanA && currentPrice > spanB) cloud = "Above";
        else if (currentPrice < spanA && currentPrice < spanB) cloud = "Below";
    } else {
        cloud = currentPrice > kijun ? "Above" : "Below";
    }

    // Stateless Backward Scanned Duration Engine mapped explicitly by asset routing rule
    let trendAge = 0;
    for (let i = N - 1; i >= 0; i--) {
        if (getBinaryStateAt(history, i, ticker) === todayState) {
            trendAge++;
        } else {
            break; 
        }
    }

    const distanceKijun = kijun !== 0 ? ((currentPrice - kijun) / kijun) * 100 : 0;

    return {
        tenkan: parseFloat(tenkan.toFixed(2)),
        kijun: parseFloat(kijun.toFixed(2)),
        trend: todayState, 
        cloud: cloud,
        trendAge: trendAge,
        distanceKijun: parseFloat(distanceKijun.toFixed(2))
    };
}

// --- MAIN DATA ENGINE ---

async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, firewallAge: 0, ts: new Date().toLocaleTimeString(), moneyFlow: [] };
    let vixHistoryRef = null;
    let tnxHistoryRef = null;

    for (let sym of symbols) {
        try {
            await sleep(150); 
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1y`;
            let response, raw;

            try {
                response = await fetch(PROXY + encodeURIComponent(targetUrl), { method: 'GET', redirect: 'follow' });
                raw = await response.json();
            } catch (e) {
                console.warn(`Primary proxy routing error on ${sym}. Initializing fallback pipeline...`);
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

                if (ticker === "VIX") vixHistoryRef = history;
                if (ticker === "TNX") tnxHistoryRef = history;

                const last = history[history.length - 1]; 
                const prev = history[history.length - 2]; 
                const smaValue = history.reduce((acc, val) => acc + val.c, 0) / history.length;
                const currentPrice = last.c;
                
                const last5Days = history.slice(-5);
                const weekHigh = Math.max(...last5Days.map(d => d.h));
                const weekLow = Math.min(...last5Days.map(d => d.l));
                
                let currentPct = 50;
                const weekRange = weekHigh - weekLow;
                if (weekRange > 0) currentPct = ((currentPrice - weekLow) / weekRange) * 100;
                currentPct = Math.max(0, Math.min(100, currentPct));

                const changePct = ((last.c - prev.c) / prev.c * 100).toFixed(2);
                const ichi = calculateIchimoku(history, ticker);

                results.indices[ticker] = {
                    price: currentPrice.toFixed(2),
                    dailyChange: changePct,
                    change5d: parseFloat(changePct), 
                    tenkan: ichi.tenkan,
                    kijun: ichi.kijun,
                    trend: ichi.trend,
                    cloud: ichi.cloud, 
                    trendAge: ichi.trendAge, 
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
            console.error(`Pipeline drop for symbol ${sym}:`, e); 
        }
    }

    // Synchronize Firewall Durations based on collective threat containment continuity
    if (vixHistoryRef && tnxHistoryRef && results.indices["VIX"] && results.indices["TNX"]) {
        const systemSafeToday = (results.indices["VIX"].trend === "Bearish") && (results.indices["TNX"].trend === "Bearish");
        let firewallAge = 0;
        const minLen = Math.min(vixHistoryRef.length, tnxHistoryRef.length);

        for (let offset = 0; offset < minLen; offset++) {
            const vixIdx = vixHistoryRef.length - 1 - offset;
            const tnxIdx = tnxHistoryRef.length - 1 - offset;
            if (vixIdx < 0 || tnxIdx < 0) break;

            const vState = getBinaryStateAt(vixHistoryRef, vixIdx, "VIX");
            const tState = getBinaryStateAt(tnxHistoryRef, tnxIdx, "TNX");
            const sysSafe = (vState === "Bearish" && tState === "Bearish");

            if (sysSafe === systemSafeToday) {
                firewallAge++;
            } else {
                break;
            }
        }
        results.firewallAge = firewallAge;
    }

    // Set value gap frameworks
    Object.keys(results.indices).forEach(key => {
        const cfg = indexConfigs[key];
        if (cfg && cfg.pe > 0 && key !== 'TNX') {
            const earningsYield = (100 / cfg.pe);
            results.indices[key].valueGap = (earningsYield - results.yield).toFixed(2) + "%";
        }
    });

    if (results.indices["GLD"] && results.yield > 0) {
        results.indices["GLD"].valueGap = ((100 / 22.5) - results.yield * 0.93).toFixed(2) + "%";
    }
    if (results.indices["SLV"] && results.yield > 0) {
        results.indices["SLV"].valueGap = ((100 / 25.0) - results.yield * 0.93).toFixed(2) + "%";
    }

    const sectors = ["XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU"];
    results.moneyFlow = sectors
        .filter(s => results.indices[s])
        .map(s => ({ ticker: s, score: results.indices[s].score }))
        .sort((a, b) => b.score - a.score);

    return results;
}