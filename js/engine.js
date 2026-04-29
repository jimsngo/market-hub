const PROXY = "https://corsproxy.io/?";

export async function fetchNews() {
    try {
        // Updated to a robust World/Macro Finance RSS
        const rssUrl = 'https://www.yahoo.com/news/rss/finance';
        const res = await fetch(`${PROXY}${encodeURIComponent(rssUrl)}`);
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const items = xml.querySelectorAll("item");
        
        // Expanded "Institutional Filter" keywords
        const macroKeywords = [
            'FED', 'POWELL', 'INFLATION', 'YIELD', 'RATE', 'CENTRAL BANK',
            'OIL', 'CRUDE', 'ENERGY', 'GAS', 'SUPPLY', 'DOLLAR', 'USD',
            'GEOPOLITICAL', 'WAR', 'STRAIT', 'GOLD', 'BITCOIN', 'CRYPTO',
            'GDP', 'TREASURY', 'STIMULUS', 'DEBT', 'ECONOMY'
        ];

        const news = Array.from(items).map(item => ({
            title: item.querySelector("title").textContent,
            link: item.querySelector("link").textContent,
            time: new Date(item.querySelector("pubDate").textContent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })).filter(n => {
            const upperTitle = n.title.toUpperCase();
            // Pass the item if it hits a macro keyword OR covers general market trends
            return macroKeywords.some(keyword => upperTitle.includes(keyword)) || 
                   upperTitle.includes("MARKET") || upperTitle.includes("STOCKS");
        }).slice(0, 5);

        return news.length > 0 ? news : [{title: "Waiting for Macro Volatility...", link: "#", time: "--:--"}];
    } catch (e) {
        console.error("Macro News Fetch Error:", e);
        return [{title: "Intelligence Feed Offline", link: "#", time: "ERR"}];
    }
}

export async function fetchMarketData(symbols) {
    let results = { indices: {}, yield: 0, news: [] };
    
    // Fetch News in parallel with market data
    results.news = await fetchNews();

    for (let sym of symbols) {
        try {
            const res = await fetch(`${PROXY}https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1mo&interval=1d`);
            const json = await res.json();
            const result = json.chart.result[0];
            
            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];
            const validData = timestamps.map((ts, i) => ({
                c: quote.close[i], h: quote.high[i], l: quote.low[i]
            })).filter(d => d.c !== null);

            const cur = result.meta.regularMarketPrice;
            const ticker = sym.replace('%5E', '');

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
                    change: ((cur - result.meta.chartPreviousClose) / result.meta.chartPreviousClose * 100).toFixed(2) + "%",
                    pw: cur > p1wk ? "UP" : "DN", 
                    conf: (cur > p1wk && p1wk > p2wk) ? "C/UP" : (cur < p1wk && p1wk < p2wk ? "C/DN" : "NEUT"),
                    smi: Math.round(((cur - center) / (range / 2)) * 100)
                };
            }
        } catch (err) { console.error(err); }
        await new Promise(r => setTimeout(r, 600));
    }
    results.ts = new Date().toLocaleTimeString();
    return results;
}