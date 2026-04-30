import { indexConfigs } from './config.js';

/**
 * HELPER: Binary Momentum Backgrounds
 * Ensures no "dead zones" - every cell is either Green or Red based on SMI.
 */
function getSMIBackground(smi) {
    if (smi === undefined || smi === null) return 'transparent';
    
    // BULLISH SIDE (SMI >= 0)
    if (smi >= 0) {
        return smi >= 40 
            ? 'rgba(74, 222, 128, 0.18)' // Strong Green Tint
            : 'rgba(74, 222, 128, 0.08)'; // Weak Green Tint
    }
    
    // BEARISH SIDE (SMI < 0)
    return smi <= -40 
        ? 'rgba(248, 113, 113, 0.18)' // Strong Red Tint
        : 'rgba(248, 113, 113, 0.08)'; // Weak Red Tint
}

export function renderAll(data) {
    if (!data || !data.indices) return;
    
    // Update Global Timestamp
    const tsElement = document.getElementById('timestamp');
    if (tsElement) tsElement.innerText = "Last Sync: " + data.ts;

    const grid = document.getElementById('data-grid');
    const lastTicker = localStorage.getItem('lastTicker') || 'SPY';

    grid.innerHTML = Object.entries(data.indices).map(([s, v]) => {
        const config = indexConfigs[s] || {};
        const ey = config.pe > 0 ? (100 / config.pe) : 0;
        const gap = config.pe > 0 ? (ey - data.yield).toFixed(2) : "N/A";
        
        const smiBg = getSMIBackground(v.smi);
        
        // Binary Border Logic: Green glow if positive, Red glow if negative
        const borderColor = v.smi >= 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)';
        
        return `
            <div class="cell ${s === lastTicker ? 'active' : ''}" 
                 onclick="selectTicker('${s}')" 
                 style="background-color: ${smiBg}; border-color: ${borderColor}">
                <div class="label" style="font-size:0.7rem; font-weight:800;">${s} | ${v.change}</div>
                <div class="val">${v.price.toFixed(2)}</div>
                <div class="sub">
                    GAP: <span style="color:${gap > 1.0 ? 'var(--bullish)' : 'var(--caution)'}">${gap}%</span><br>
                    PW: <span style="color:${v.pw === 'UP' ? 'var(--bullish)' : 'var(--bearish)'}">${v.pw}</span> | 
                    SMI: <span style="color:${v.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">${v.smi}</span>
                </div>
            </div>`;
    }).join('') + `
        <div class="cell" style="border-color:var(--caution)">
            <div class="label">10Y YIELD</div>
            <div class="val">${data.yield.toFixed(2)}%</div>
        </div>`;

    // Render News Tape
    const newsBox = document.getElementById('news-tape');
    if (newsBox && data.news) {
        newsBox.innerHTML = data.news.map(n => `
            <div class="news-item">
                <span style="color:var(--accent); font-size:0.7rem; font-weight:800;">${n.time}</span> 
                <a href="${n.link}" target="_blank">${n.title}</a>
            </div>
        `).join('');
    }
    
    updateDetail(data, lastTicker);
}

export function selectTicker(s) {
    localStorage.setItem('lastTicker', s);
    const cached = localStorage.getItem('surgicalData');
    if (cached) renderAll(JSON.parse(cached));
}

export function updateDetail(data, ticker) {
    const config = indexConfigs[ticker];
    const indexData = data.indices[ticker];
    if (!config || !indexData) return;

    const gap = (100 / config.pe - data.yield).toFixed(2);
    const confColor = indexData.conf === 'C/UP' ? 'var(--bullish)' : (indexData.conf === 'C/DN' ? 'var(--bearish)' : 'var(--text-dim)');

    // Sync Interrogation Box with SMI Momentum Colors
    const interrogationBox = document.getElementById('analysis-narrative').parentElement;
    if (interrogationBox) {
        const smiBg = getSMIBackground(indexData.smi);
        const borderColor = indexData.smi >= 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)';
        
        interrogationBox.style.backgroundColor = smiBg;
        interrogationBox.style.borderColor = borderColor;
        interrogationBox.style.transition = "all 0.3s ease"; // Smooth transition when switching tickers
    }

    // Update Text Elements
    document.getElementById('active-ticker').innerText = ticker;
    document.getElementById('big-stat-val').innerText = gap + "%";
    document.getElementById('big-stat-val').style.color = gap > 1.0 ? 'var(--bullish)' : 'var(--caution)';
    
    const breadthVal = document.getElementById('breadth-val');
    if (breadthVal) breadthVal.innerText = "PTCP: " + (config.breadth || "N/A");

    document.getElementById('analysis-narrative').innerHTML = `
        <p><strong>Primary Wave:</strong> Velocity is <strong style="color:${indexData.pw === 'UP' ? 'var(--bullish)' : 'var(--bearish)'}">${indexData.pw}</strong>.</p>
        <p><strong>SMI Momentum:</strong> <strong style="color:${indexData.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">${indexData.smi}</strong>.</p>
        <p><strong>VectorVest:</strong> ${ticker} is showing <strong style="color:${confColor}">${indexData.conf}</strong>.</p>
        <p><strong>Trendline:</strong> Price ${indexData.price > config.sma200 ? 'ABOVE' : 'BELOW'} SMA200 (${config.sma200}).</p>
    `;
}