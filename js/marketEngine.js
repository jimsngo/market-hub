const PROXY = "https://script.google.com/macros/s/AKfycbzA28YtFZenD8vH4tTDU95C2Mowv4uOTeGuCU_ipkkk7YpMnt-zDuxQ-EHMkfXiqIMY/exec?url=";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, ts: new Date().toLocaleTimeString(), moneyFlow: [] };

    for (let sym of symbols) {
        try {
            await sleep(150); // Proxy firewall safety pacing

            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1wk&range=1y`;
            const response = await fetch(PROXY + encodeURIComponent(url));
            const raw = await response.json();
            
            if (raw?.chart?.result?.[0]) {
                const res = raw.chart.result[0];
                const ind = res.indicators.quote[0];
                const ticker = sym.replace('%5E', '').replace('TNX', 'TNX').toUpperCase();

                const history = res.timestamp.map((t, i) => ({
                    c: ind.close[i], h: ind.high[i], l: ind.low[i]
                })).filter(d => d.c !== null && d.h !== null && d.l !== null);

                // Isolate current active running week bar
                const last = history[history.length - 1]; 
                const prev = history[history.length - 2]; 
                const smaValue = history.reduce((acc, val) => acc + val.c, 0) / history.length;
                
                const currentPrice = last.c;
                const weekHigh = last.h;
                const weekLow = last.l;
                
                // Calculate position relative to weekly HL2 midpoint
                let currentPct = 50;
                const weekRange = weekHigh - weekLow;
                if (weekRange > 0) {
                    currentPct = ((currentPrice - weekLow) / weekRange) * 100;
                }
                currentPct = Math.max(0, Math.min(100, currentPct));

                const changePct = ((last.c - prev.c) / prev.c * 100).toFixed(2);

                // Pure Weekly SMI(10) lookback slicing
                const len10Weeks = history.slice(-10);
                const macroHigh = Math.max(...len10Weeks.map(d => d.h));
                const macroLow = Math.min(...len10Weeks.map(d => d.l));
                const center = (macroHigh + macroLow) / 2;
                const range = (macroHigh - macroLow) / 2;
                
                const smiValue = range !== 0 ? Math.round(((last.c - center) / range) * 100) : 0;

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
        } catch (e) { console.error(e); }
    }

    Object.keys(results.indices).forEach(key => {
        const cfg = indexConfigs[key];
        if (cfg && cfg.pe > 0 && key !== 'TNX') {
            const earningsYield = (100 / cfg.pe);
            const gap = (earningsYield - results.yield).toFixed(2);
            results.indices[key].valueGap = gap + "%";
        }
    });

    const sectors = ["XLK", "XLF", "XLV", "XLY"];
    results.moneyFlow = sectors
        .filter(s => results.indices[s])
        .map(s => ({ ticker: s, score: results.indices[s].smi }))
        .sort((a, b) => b.score - a.score);

    return results;
}