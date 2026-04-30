const PROXY = "https://script.google.com/macros/s/AKfycbwG5Bz_OwwRLQIEDQwDHu9nLgd35fGyx-VdpveJNbVXqpnNzRYyMAmXdsgo3OcK-gYo/exec?url=";

/**
 * HELPER: Robust JSON parser that handles Google's double-quoting
 */
function surgicalParse(text) {
    try {
        let clean = text;
        if (typeof clean === 'string' && (clean.startsWith('"') || clean.startsWith("'"))) {
            clean = JSON.parse(clean);
        }
        return typeof clean === 'string' ? JSON.parse(clean) : clean;
    } catch (e) {
        return null;
    }
}

export async function fetchNews() {
    try {
        const target = 'https://finance.yahoo.com/news/rss';
        const res = await fetch(`${PROXY}${encodeURIComponent(target)}`);
        const text = await res.text();
        const xml = new DOMParser().parseFromString(text, "text/xml");
        const items = xml.querySelectorAll("item");
        
        const macroKeywords = ['FED', 'POWELL', 'INFLATION', 'RATE', 'OIL', 'ENERGY', 'GEOPOLITICAL', 'GOLD', 'BITCOIN', 'MARKET'];

        const news = Array.from(items).map(item => ({
            title: item.querySelector("title")?.textContent || "Breaking Intel",
            link: item.querySelector("link")?.textContent || "#",
            time: new Date(item.querySelector("pubDate")?.textContent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })).filter(n => {
            const upper = n.title.toUpperCase();
            return macroKeywords.some(k => upper.includes(k));
        }).slice(0, 6);

        localStorage.setItem('surgicalNews', JSON.stringify(news));
        return news;
    } catch (e) {
        return JSON.parse(localStorage.getItem('surgicalNews')) || [];
    }
}

export async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0 };
    results.news = await fetchNews();

    for (let sym of symbols) {
        let attempts = 0;
        let success = false;

        while (attempts < 2 && !success) {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1mo&interval=1d&corsDomain=finance.yahoo.com`;
                const response = await fetch(`${PROXY}${encodeURIComponent(url)}`);
                const text = await response.text();
                
                const raw = surgicalParse(text);
                
                // DATA HUNTER: Check for existence of the result array
                if (!raw || !raw.chart || !raw.chart.result || !raw.chart.result[0]) {
                    throw new Error("Bad Structure");
                }

                const res = raw.chart.result[0];
                const meta = res.meta;
                const timestamps = res.timestamp || [];
                const indicators = res.indicators.quote[0];

                // Ensure we have valid price data
                const validData = timestamps.map((ts, i) => ({
                    c: indicators.close[i], 
                    h: indicators.high[i], 
                    l: indicators.low[i]
                })).filter(d => d.c !== null && d.c !== undefined);

                if (validData.length === 0) throw new Error("Empty Data");

                const cur = meta.regularMarketPrice;
                const ticker = sym.replace('%5ETNX', 'TNX').replace('%5E', '').toUpperCase();

                if (ticker === "TNX") {
                    results.yield = cur;
                } else {
                    const p1wk = validData[validData.length - 6]?.c || validData[0].c;
                    const p2wk = validData[validData.length - 11]?.c || validData[0].c;
                    const sliceH = validData.slice(-14).map(d => d.h);
                    const sliceL = validData.slice(-14).map(d => d.l);
                    const range = (Math.max(...sliceH) - Math.min(...sliceL)) || 1;
                    const center = (Math.max(...sliceH) + Math.min(...sliceL)) / 2;

                    results.indices[ticker] = {
                        price: cur,
                        change: ((cur - meta.chartPreviousClose) / meta.chartPreviousClose * 100).toFixed(2) + "%",
                        pw: cur > p1wk ? "UP" : "DN", 
                        conf: (cur > p1wk && p1wk > p2wk) ? "C/UP" : (cur < p1wk && p1wk < p2wk ? "C/DN" : "NEUT"),
                        smi: Math.round(((cur - center) / (range / 2)) * 100)
                    };
                }
                success = true;
            } catch (err) {
                attempts++;
                if (attempts === 2) console.warn(`[FINAL FAIL] ${sym}: ${err.message}`);
                await new Promise(r => setTimeout(r, 1000)); // Wait before retry
            }
        }
    }
    results.ts = new Date().toLocaleTimeString();
    return results;
}