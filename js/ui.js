import { indexConfigs } from './config.js';

export function getPtcpColor(text) {
    if (!text || text === "N/A") return 'var(--text-dim)';
    const val = parseInt(text.replace(/[^0-9]/g, '')) || 0;
    return val >= 55 ? 'var(--bullish)' : (val <= 45 ? 'var(--bearish)' : 'var(--text-dim)');
}

export function renderAll(data) {
    if (!data || !data.indices) return;
    document.getElementById('timestamp').innerText = "Last Sync: " + data.ts;
    const grid = document.getElementById('data-grid');
    const lastTicker = localStorage.getItem('lastTicker') || 'SPY';

    grid.innerHTML = Object.entries(data.indices).map(([s, v]) => {
        const config = indexConfigs[s] || {};
        const ey = config.pe > 0 ? (100 / config.pe) : 0;
        const gap = config.pe > 0 ? (ey - data.yield).toFixed(2) : "N/A";
        
        const pwColor = v.pw === "UP" ? 'var(--bullish)' : 'var(--bearish)';
        const smiColor = v.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)';
        const bText = config.breadth || "N/A";

        return `
            <div class="cell ${s === lastTicker ? 'active' : ''}" onclick="selectTicker('${s}')">
                <div class="label" style="font-size:0.7rem; font-weight:800;">
                    ${s} | <span style="color:${v.change.includes('-') ? 'var(--bearish)' : 'var(--bullish)'}">${v.change}</span>
                </div>
                <div class="val">${v.price.toFixed(2)}</div>
                <div class="sub" style="border-top: 1px solid #2d3748; margin-top:8px; padding-top:5px; text-align: left;">
                    GAP: <span style="color:${gap > 1.0 ? 'var(--bullish)' : 'var(--caution)'}; font-weight:900;">${gap}%</span><br>
                    PTCP: <span style="color:${getPtcpColor(bText)}; font-weight:bold;">${bText}</span><br>
                    PW: <span style="color:${pwColor}; font-weight:800;">${v.pw}</span> | 
                    SMI: <span style="color:${smiColor}; font-weight:bold;">${v.smi}</span>
                </div>
            </div>`;
    }).join('') + `
        <div class="cell" style="cursor:default; border-color: var(--caution);">
            <div class="label" style="font-size:0.7rem; font-weight:800;">10Y YIELD</div>
            <div class="val" style="color:var(--caution)">${data.yield.toFixed(2)}%</div>
            <div class="sub">Gravity Anchor</div>
        </div>`;

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

    // RESTORED: Value Gap Color Logic
    const ey = (100 / config.pe);
    const gap = (ey - data.yield).toFixed(2);
    const gapColor = gap > 1.0 ? 'var(--bullish)' : 'var(--caution)';
    
    // BINARY: SMI and PW Colors
    const smiColor = indexData.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)';
    const pwColor = indexData.pw === 'UP' ? 'var(--bullish)' : 'var(--bearish)';
    const confColor = indexData.conf === 'C/UP' ? 'var(--bullish)' : (indexData.conf === 'C/DN' ? 'var(--bearish)' : 'var(--text-dim)');
    
    document.getElementById('active-ticker').innerText = ticker;
    document.getElementById('big-stat-val').innerText = gap + "%";
    document.getElementById('big-stat-val').style.color = gapColor; // Restored
    
    document.getElementById('breadth-val').innerText = "Participation: " + (config.breadth || "N/A");
    document.getElementById('breadth-val').style.color = getPtcpColor(config.breadth);
    
    // REORDERED: Primary Wave Lead
    document.getElementById('analysis-narrative').innerHTML = `
        <p><strong>Primary Wave:</strong> Velocity is <strong style="color:${pwColor}">${indexData.pw}</strong>.</p>
        <p><strong>SMI Momentum:</strong> <strong style="color:${smiColor}">${indexData.smi}</strong> (${indexData.smi >= 0 ? 'BULLISH' : 'BEARISH'}).</p>
        <p><strong>VectorVest:</strong> ${ticker} is showing <strong style="color:${confColor}">${indexData.conf}</strong>.</p>
        <p><strong>Trendline:</strong> Price ${indexData.price > config.sma200 ? 'ABOVE' : 'BELOW'} SMA200 (${config.sma200}).</p>
    `;
}