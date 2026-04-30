function getSMIBackground(smi) {
    if (smi === undefined || smi === null) return 'transparent';
    if (smi >= 0) {
        return smi >= 40 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(74, 222, 128, 0.05)';
    } else {
        return smi <= -40 ? 'rgba(248, 113, 113, 0.15)' : 'rgba(248, 113, 113, 0.05)';
    }
}

function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = new Date().toLocaleTimeString();
}

function renderDashboard(data) {
    if (!data || !data.indices) return;
    
    const meta = indexConfigs.metadata;
    document.getElementById('timestamp').innerText = "Last Sync: " + (data.ts || "");
    const grid = document.getElementById('data-grid');
    const lastTicker = localStorage.getItem('lastTicker') || 'SPY';

    grid.innerHTML = Object.entries(data.indices).map(([s, v]) => {
        const config = indexConfigs[s] || { pe: 0 };
        const isTNX = s === 'TNX';
        
        // Logic for determining Bullish vs Bearish color
        const isPositive = parseFloat(v.change) >= 0;
        const trendColor = isPositive ? 'var(--bullish)' : 'var(--bearish)';
        
        const smaColor = parseFloat(v.price) > parseFloat(v.sma50) ? 'var(--bullish)' : 'var(--bearish)';
        const finalGap = (v.valueGap && v.valueGap !== "N/A") ? v.valueGap : "N/A";
        
        const smiBg = getSMIBackground(v.smi);
        const borderColor = v.smi >= 0 ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)';

        return `
            <div class="cell ${s === lastTicker ? 'active' : ''}" onclick="selectTicker('${s}')" 
                 style="background-color: ${smiBg}; border-color: ${s === lastTicker ? 'var(--accent)' : borderColor}">
                <div class="label">${isTNX ? '10Y YIELD' : s} | <span style="color:${trendColor}">${v.change}</span></div>
                
                <div class="val" style="color:${trendColor}">${isTNX ? v.price + '%' : '$' + v.price}</div>
                
                <div class="sub">
                    SMA50: <strong style="color:${smaColor}">${parseFloat(v.price) > parseFloat(v.sma50) ? 'BULLISH' : 'BEARISH'}</strong><br>
                    SMI10: <strong style="color:${v.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">${v.smi}</strong><br>
                    Confirm Call: <strong style="color:${v.conf === 'UP' ? 'var(--bullish)' : 'var(--bearish)'}">${v.conf}</strong><br>
                    Primary Wave: <strong style="color:${v.pw === 'UP' ? 'var(--bullish)' : 'var(--bearish)'}">${v.pw}</strong><br>
                    PE (${meta.lastUpdated}): <strong style="color:var(--accent)">${isTNX || config.pe === 0 ? 'N/A' : config.pe}</strong><br>
                    VALUE GAP (Est): <strong style="color:${parseFloat(finalGap) > 0 ? 'var(--bullish)' : 'var(--bearish)'}">${finalGap}</strong>
                </div>
            </div>`;
    }).join('');

    const newsBox = document.getElementById('news-tape');
    if (newsBox && data.news && data.news.length > 0) {
        newsBox.innerHTML = data.news.map(n => `
            <div style="margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 8px;">
                <a href="${n.link}" target="_blank" class="news-link">
                    <span style="color:var(--accent); margin-right: 8px;">•</span>${n.title}
                </a>
            </div>
        `).join('');
    }
}

function selectTicker(ticker) {
    localStorage.setItem('lastTicker', ticker);
    const cached = localStorage.getItem('surgicalData');
    if (cached) renderDashboard(JSON.parse(cached));
}