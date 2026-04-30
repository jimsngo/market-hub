import { fetchMarketData } from './marketEngine.js';
import { fetchNews } from './newsEngine.js';
import { renderDashboard, updateClock } from './ui.js';

async function runTheatre() {
    updateClock();
    // Using the exact symbols from your previous logic
    const symbols = ["SPY", "DIA", "QQQ", "IWM", "VXX", "%5ETNX"];

    const [marketData, newsData] = await Promise.all([
        fetchMarketData(symbols),
        fetchNews()
    ]);

    // Add news to the market data object before rendering
    marketData.news = newsData;
    
    localStorage.setItem('surgicalData', JSON.stringify(marketData));
    renderDashboard(marketData);
}

// Initial Run
runTheatre();

// Bind Refresh Button - Using 'sync-btn' to match your index.html
const btn = document.getElementById('sync-btn');
if (btn) {
    btn.addEventListener('click', async () => {
        btn.innerText = "SYNCING...";
        btn.disabled = true;
        await runTheatre();
        btn.innerText = "Refresh Theatre";
        btn.disabled = false;
    });
}

// Listen for the custom event from the HTML window.triggerSync if needed
window.addEventListener('triggerSync', runTheatre);

// Clock Interval
setInterval(updateClock, 1000);