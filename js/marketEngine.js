const PROXY = "https://script.google.com/macros/s/AKfycbwG5Bz_OwwRLQIEDQwDHu9nLgd35fGyx-VdpveJNbVXqpnNzRYyMAmXdsgo3OcK-gYo/exec?url=";

async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, ts: new Date().toLocaleTimeString(), moneyFlow: [] };

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
                const range = (hh - ll) / 2;
                const smiValue = range !== 0 ? Math.round(((last.c - center) / range) * 100) : 0;

                // Calculate Daily Change % for color-coding
                const changePct = ((last.c - prev.c) / prev.c * 100).toFixed(2);

                results.indices[ticker] = {
                    price: last.c.toFixed(2),
                    dailyChange: changePct,
                    smi: smiValue,
                    conf: (last.c > smaValue && smiValue > 0) ? "UP" : "DOWN",
                    valueGap: "N/A"
                };

                if (ticker === "TNX") results.yield = parseFloat(last.c);
            }
        } catch (e) { console.error(e); }
    }

    // Value Gap Math (Earnings Yield - Bond Yield)
    Object.keys(results.indices).forEach(key => {
        const cfg = indexConfigs[key];
        if (cfg && cfg.pe > 0 && key !== 'TNX') {
            const earningsYield = (100 / cfg.pe);
            const gap = (earningsYield - results.yield).toFixed(2);
            results.indices[key].valueGap = gap + "%";
        }
    });

    // Money Flow Sorting (Sectors Only)
    const sectors = ["XLK", "XLF", "XLV", "XLY"];
    results.moneyFlow = sectors
        .filter(s => results.indices[s])
        .map(s => ({ ticker: s, score: results.indices[s].smi }))
        .sort((a, b) => b.score - a.score);

    return results;
}

async function fetchNews() {
    try {
        const url = "https://query1.finance.yahoo.com/v1/finance/search?q=stock-market&newsCount=15";
        const response = await fetch(PROXY + encodeURIComponent(url));
        const data = await response.json();
        return (data.news || []).map(item => ({ title: item.title, link: item.link }));
    } catch (e) { return []; }
}