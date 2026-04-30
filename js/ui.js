import { indexConfigs } from './config.js';

function getSMIBackground(smi) {
    if (smi === undefined || smi === null) return 'transparent';
    if (smi >= 0) return smi >= 40 ? 'rgba(74, 222, 128, 0.18)' : 'rgba(74, 222, 128, 0.08)';
    return smi <= -40 ? 'rgba(248, 113, 113, 0.18)' : 'rgba(248, 113, 113, 0.08)';
}

export function renderAll(data) {
    if (!data || !data.indices) return;
    document.getElementById('timestamp').innerText = "Last Sync: " + data.ts;
    const grid = document.getElementById('data-grid');
    const lastTicker = localStorage.getItem('lastTicker') || 'SPY';

    grid.innerHTML = Object.entries(data.indices).map(([s, v]) => {
        const config = indexConfigs[s] || {};
        const isTNX = s === 'TNX';
        const ey = config.pe > 0 ? (100 / config.pe) : 0;
        const gap = config.pe > 0 ? (ey - data.yield).toFixed(2) : "N/A";
        const smiBg = getSMIBackground(v.smi);
        const borderColor = v.smi >= 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)';
        
        return `
            <div class="cell ${s === lastTicker ? 'active' : ''}" onclick="selectTicker('${s}')" 
                 style="background-color: ${smiBg}; border-color: ${borderColor}">
                <div class="label" style="font-size:0.7rem; font-weight:800;">${isTNX ? '10Y YIELD' : s} | ${v.change}</div>
                <div class="val">${isTNX ? v.price.toFixed(2) + '%' : v.price.toFixed(2)}</div>
                <div class="sub">
                    ${isTNX ? '<span style="color:var(--caution)">MACRO ANCHOR</span>' : `GAP: <span style="color:${gap > 1.0 ? 'var(--bullish)' : 'var(--caution)'}">${gap}%</span>`}<br>
                    PW: <span style="color:${v.pw === 'UP' ? 'var(--bullish)' : 'var(--bearish)'}">${v.pw}</span> | 
                    SMI: <span style="color:${v.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">${v.smi}</span>
                </div>
            </div>`;
    }).join('');

    const newsBox = document.getElementById('news-tape');
    if (newsBox && data.news) {
        newsBox.innerHTML = data.news.map(n => `
            <div class="news-item"><span style="color:var(--accent); font-size:0.7rem;">${n.time}</span> <a href="${n.link}" target="_blank">${n.title}</a></div>
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
    const config = indexConfigs[ticker] || {};
    const indexData = data.indices[ticker];
    if (!indexData) return;

    const interrogationBox = document.getElementById('analysis-narrative').parentElement;
    const activeTickerEl = document.getElementById('active-ticker');
    const bigStatEl = document.getElementById('big-stat-val');
    const narrativeEl = document.getElementById('analysis-narrative');

    if (interrogationBox) {
        interrogationBox.style.backgroundColor = getSMIBackground(indexData.smi);
        interrogationBox.style.borderColor = indexData.smi >= 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)';
    }

    activeTickerEl.innerText = ticker === 'TNX' ? "10Y YIELD" : ticker;

    if (ticker === 'TNX') {
        bigStatEl.innerText = indexData.price.toFixed(2) + "%";
        bigStatEl.style.color = 'var(--caution)';
    } else {
        const gap = (100 / config.pe - data.yield).toFixed(2);
        bigStatEl.innerText = gap + "%";
        bigStatEl.style.color = gap > 1.0 ? 'var(--bullish)' : 'var(--caution)';
    }
    
    narrativeEl.innerHTML = `
        <p><strong>Primary Wave:</strong> Velocity is <strong style="color:${indexData.pw === 'UP' ? 'var(--bullish)' : 'var(--bearish)'}">${indexData.pw}</strong>.</p>
        <p><strong>SMI Momentum:</strong> <strong style="color:${indexData.smi >= 0 ? 'var(--bullish)' : 'var(--bearish)'}">${indexData.smi}</strong>.</p>
        ${ticker !== 'TNX' ? `<p><strong>VectorVest:</strong> ${ticker} is showing <strong style="color:${indexData.conf === 'C/UP' ? 'var(--bullish)' : 'var(--bearish)'}">${indexData.conf}</strong>.</p>` : ''}
        <p><strong>Status:</strong> ${ticker === 'TNX' ? 'Rates are trending ' : 'Price is '}${indexData.pw === 'UP' ? 'HIGHER' : 'LOWER'} over the 5-day horizon.</p>
    `;
}