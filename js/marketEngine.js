const PROXY = "https://script.google.com/macros/s/AKfycbwG5Bz_OwwRLQIEDQwDHu9nLgd35fGyx-VdpveJNbVXqpnNzRYyMAmXdsgo3OcK-gYo/exec?url=";

async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, ts: new Date().toLocaleTimeString() };
    console.log("%c--- Sync Sequence Initiated ---", "color: white; background: #3b82f6; padding: 2px 5px;");
    console.log("Retrieving data for " + symbols.length + " symbols...");

    for (let sym of symbols) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=3mo`;
            const response = await fetch(PROXY + encodeURIComponent(url));
            const raw = await response.json();
            
            if (raw?.chart?.result?.[0]) {
                const res = raw.chart.result[0];
                const ind = res.indicators.quote[0];
                const ticker = sym.replace('%5E', '').replace('TNX', 'TNX').toUpperCase();

                const history = res.timestamp.map((t, i) => ({
                    c: ind.close[i], h: ind.high[i], l: ind.low[i]
                })).filter(d => d.c !== null).slice(-50);

                const last = history[history.length - 1];
                const prev = history[history.length - 2];
                const smaValue = history.reduce((acc, val) => acc + val.c, 0) / history.length;
                
                const hh = Math.max(...history.map(d => d.h));
                const ll = Math.min(...history.map(d => d.l));
                const center = (hh + ll) / 2;
                const range = hh - ll;
                const smiValue = range !== 0 ? Math.round(((last.c - center) / (range / 2)) * 100) : 0;

                results.indices[ticker] = {
                    price: last.c.toFixed(2),
                    change: ((last.c - prev.c) / prev.c * 100).toFixed(2) + "%",
                    sma50: smaValue.toFixed(2),
                    smi: smiValue,
                    pw: last.c > prev.c ? "UP" : "DOWN",
                    conf: (last.c > smaValue && smiValue > 0) ? "UP" : "DOWN",
                    valueGap: "N/A"
                };

                console.log(`[DATA] ${ticker} retrieved.`);

                // TRIGGER: Only calculate when TNX (10Y Yield) arrives
                if (ticker === "TNX") {
                    results.yield = parseFloat(last.c);
                    console.log(`%c[STATUS] TNX Yield Ready: ${results.yield.toFixed(2)}%`, "color: #4ade80; font-weight: bold;");
                    console.log("%c[TRIGGER] Starting Value Gap (Est) calculation...", "color: #3b82f6; font-weight: bold;");
                    
                    Object.keys(results.indices).forEach(key => {
                        const cfg = indexConfigs[key]; // Global from config.js
                        if (cfg && cfg.pe > 0 && key !== 'TNX') {
                            // Calculate EY dynamically from the TTM PE in config
                            const earningsYield = (100 / cfg.pe).toFixed(2);
                            const gap = (earningsYield - results.yield).toFixed(2);
                            
                            results.indices[key].valueGap = gap + "%";
                            
                            // Debugging output with the Earnings Yield you want to monitor
                            console.log(`   > ${key}: [Earnings Yield: ${earningsYield}%] - [10Y Yield: ${results.yield.toFixed(2)}%] = Value Gap: ${gap}%`);
                        }
                    });
                }
            }
        } catch (e) {
            console.error(`[ERROR] Fetch failed for ${sym}:`, e);
        }
    }
    return results;
}

/**
 * Fetches latest headlines with URLs for clickable news items
 */
async function fetchNews() {
    try {
        const url = "https://query1.finance.yahoo.com/v1/finance/search?q=stock-market&newsCount=15";
        const response = await fetch(PROXY + encodeURIComponent(url));
        const data = await response.json();
        
        console.log(`[NEWS] ${data.news ? data.news.length : 0} headlines retrieved.`);
        
        return (data.news || []).map(item => ({
            title: item.title,
            link: item.link
        }));
    } catch (e) {
        console.warn("[WARN] News feed unavailable.");
        return [];
    }
}