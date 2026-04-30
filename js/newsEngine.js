const PROXY = "https://script.google.com/macros/s/AKfycbwG5Bz_OwwRLQIEDQwDHu9nLgd35fGyx-VdpveJNbVXqpnNzRYyMAmXdsgo3OcK-gYo/exec?url=";

export async function fetchNews() {
    try {
        const url = `https://query1.finance.yahoo.com/v1/finance/trending/US`;
        const response = await fetch(PROXY + encodeURIComponent(url));
        const data = await response.json();
        const news = data?.finance?.result?.[0]?.quotes?.map(q => q.symbol) || [];
        console.log(`[SUCCESS] News Data: ${news.length} items retrieved.`);
        return news;
    } catch (e) {
        console.error("[ERROR] News Fetch failed:", e);
        return [];
    }
}