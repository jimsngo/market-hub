function updateClock() {
    const el = document.getElementById('clock');
    if (el) el.innerText = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);

async function triggerSync() {
    const btn = document.getElementById('sync-btn');
    if (btn) btn.innerText = "SYNCING...";
    try {
        const symbols = ["SPY", "DIA", "QQQ", "IWM", "%5EVIX", "%5ETNX", "XLK", "XLF", "XLV", "XLY", "GLD", "SLV", "ES=F", "RTY=F"];
        const data = await fetchMarketData(symbols);
        localStorage.setItem('surgicalData', JSON.stringify(data));
        renderDashboard(data);
    } catch (e) { console.error(e); }
    if (btn) btn.innerText = "Refresh Theatre";
}

// Unified Tiered Momentum Color Assigner
function getSmiStyleProperties(val) {
    const score = parseFloat(val);
    if (isNaN(score)) return { color: "#ffffff", weight: "normal" };

    if (score >= 50) {
        return { color: "#fbbf24", weight: "bold" }; // Strong Buy = Yellow (#fbbf24)
    } else if (score >= 0) {
        return { color: "#4ade80", weight: "bold" }; // Buy = Green (#4ade80)
    } else if (score >= -50) {
        return { color: "#ff9f43", weight: "bold" }; // Sell = Orange (#ff9f43)
    } else {
        return { color: "#ff5f5f", weight: "bold" }; // Strong Sell = Red (#ff5f5f)
    }
}

// Utility to apply center-anchored block tracking styles to any element
function applyTosFillStyle(element, percentage) {
    if (!element) return;
    const pct = parseFloat(percentage);
    if (isNaN(pct)) return;

    if (pct >= 50) {
        const width = pct - 50;
        element.style.left = "50%";
        element.style.width = `${width}%`;
        element.style.background = "#007f4e"; // Green block expanding right
        element.style.borderRadius = "0 2px 2px 0";
    } else {
        const width = 50 - pct;
        element.style.left = `${pct}%`;
        element.style.width = `${width}%`;
        element.style.background = "#b9001b"; // Red block expanding left
        element.style.borderRadius = "2px 0 0 2px";
    }
}

function renderDashboard(data) {
    if (!data || !data.indices) return;

    const bDate = document.getElementById('barometer-date');
    if (bDate) {
        bDate.innerText = new Date().toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const us02yVal = data.indices["VIX"] ? (data.yield * 0.93).toFixed(2) + "%" : "4.17%"; 
    const tnxVal = data.indices["TNX"] ? parseFloat(data.indices["TNX"].price).toFixed(2) + "%" : "--";
    const vixVal = data.indices["VIX"] ? data.indices["VIX"].price : "--";
    const gldVal = data.indices["GLD"] ? "$" + data.indices["GLD"].price : "--";
    const slvVal = data.indices["SLV"] ? "$" + data.indices["SLV"].price : "--";

    const rawUs02y = parseFloat(us02yVal);
    const isFloorHeld = rawUs02y >= 3.75;
    
    const elUs02y = document.getElementById('baro-us02y'); if (elUs02y) elUs02y.innerText = us02yVal;
    const elTnx = document.getElementById('baro-tnx'); if (elTnx) elTnx.innerText = tnxVal;
    const elVix = document.getElementById('baro-vix'); if (elVix) elVix.innerText = vixVal;
    const elGld = document.getElementById('baro-gld'); if (elGld) elGld.innerText = gldVal;
    const elSlv = document.getElementById('baro-slv'); if (elSlv) elSlv.innerText = slvVal;

    const floorBadge = document.getElementById('baro-floor-status');
    if (floorBadge) {
        if (isFloorHeld) {
            floorBadge.innerText = "HELD 💪"; floorBadge.style.color = "#00ffcc";
        } else {
            floorBadge.innerText = "BROKEN 🚨"; floorBadge.style.color = "#ff3366";
        }
    }

    const tnxData = data.indices["TNX"];
    const vixData = data.indices["VIX"];
    const gldData = data.indices["GLD"];
    const slvData = data.indices["SLV"];
    const esData = data.indices["ES=F"];
    const rtyData = data.indices["RTY=F"];

    const applyMomentumColor = (elementId, tickerData) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (!tickerData || tickerData.change5d === undefined) {
            el.style.color = "#ffffff"; return;
        }
        el.style.color = tickerData.change5d >= 0 ? "#00ffcc" : "#ff3366";
    };

    applyMomentumColor('baro-us02y', tnxData); 
    applyMomentumColor('baro-tnx', tnxData);
    applyMomentumColor('baro-gld', gldData);
    applyMomentumColor('baro-slv', slvData);

    const options = { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hour12: false };
    const etParts = new Intl.DateTimeFormat([], options).formatToParts(new Date());
    const etHour = parseInt(etParts.find(p => p.type === "hour").value, 10);
    const etMin = parseInt(etParts.find(p => p.type === "minute").value, 10);
    const etTimeFloat = etHour + (etMin / 60);
    const futuresPanel = document.getElementById('premarket-futures-panel');
    
    if (etTimeFloat >= 4.0 && etTimeFloat < 9.5) {
        if (futuresPanel) {
            futuresPanel.style.display = "block";
            document.getElementById('baro-es-futures').innerText = esData ? "$" + esData.price : "--";
            document.getElementById('baro-rty-futures').innerText = rtyData ? "$" + rtyData.price : "--";
            applyMomentumColor('baro-es-futures', esData);
            applyMomentumColor('baro-rty-futures', rtyData);
        }
    } else if (futuresPanel) {
        futuresPanel.style.display = "none";
    }

    // ==================== GATE 1 RENDERING ====================
    if (vixData) {
        applyTosFillStyle(document.getElementById('vix-tos-fill'), vixData.currentPct);
        const lEl = document.getElementById('vix-lbl-low');
        const hEl = document.getElementById('vix-lbl-high');
        if (lEl) lEl.innerText = `L: ${vixData.weekLow}`;
        if (hEl) hEl.innerText = `H: ${vixData.weekHigh}`;
    }

    // ==================== GATE 2 RENDERING WITH COLOR FORMATTING ====================
    if (tnxData) {
        applyTosFillStyle(document.getElementById('tnx-tos-fill'), tnxData.currentPct);
        applyTosFillStyle(document.getElementById('us02y-tos-fill'), tnxData.currentPct);
        
        const tnxL = document.getElementById('tnx-lbl-low'); const tnxH = document.getElementById('tnx-lbl-high');
        const us02yL = document.getElementById('us02y-lbl-low'); const us02yH = document.getElementById('us02y-lbl-high');
        
        if (tnxL) tnxL.innerText = `L: ${tnxData.weekLow}%`;
        if (tnxH) tnxH.innerText = `H: ${tnxData.weekHigh}%`;
        if (us02yL) us02yL.innerText = `L: ${(parseFloat(tnxData.weekLow) * 0.93).toFixed(2)}%`;
        if (us02yH) us02yH.innerText = `H: ${(parseFloat(tnxData.weekHigh) * 0.93).toFixed(2)}%`;

        const tnxSmiEl = document.getElementById('tnx-smi');
        const us02ySmiEl = document.getElementById('us02y-smi');
        const yieldStyles = getSmiStyleProperties(tnxData.smi);

        if (tnxSmiEl) {
            tnxSmiEl.innerText = tnxData.smi;
            tnxSmiEl.style.color = yieldStyles.color;
            tnxSmiEl.style.fontWeight = yieldStyles.weight;
        }
        if (us02ySmiEl) {
            us02ySmiEl.innerText = tnxData.smi;
            us02ySmiEl.style.color = yieldStyles.color;
            us02ySmiEl.style.fontWeight = yieldStyles.weight;
        }
    }
    if (gldData) {
        applyTosFillStyle(document.getElementById('gld-tos-fill'), gldData.currentPct);
        const gldL = document.getElementById('gld-lbl-low'); const gldH = document.getElementById('gld-lbl-high');
        if (gldL) gldL.innerText = `L: $${gldData.weekLow}`;
        if (gldH) gldH.innerText = `H: $${gldData.weekHigh}`;

        const gldSmiEl = document.getElementById('gld-smi');
        if (gldSmiEl) {
            const styles = getSmiStyleProperties(gldData.smi);
            gldSmiEl.innerText = gldData.smi;
            gldSmiEl.style.color = styles.color;
            gldSmiEl.style.fontWeight = styles.weight;
        }
    }
    if (slvData) {
        applyTosFillStyle(document.getElementById('slv-tos-fill'), slvData.currentPct);
        const slvL = document.getElementById('slv-lbl-low'); const slvH = document.getElementById('slv-lbl-high');
        if (slvL) slvL.innerText = `L: $${slvData.weekLow}`;
        if (slvH) slvH.innerText = `H: $${slvData.weekHigh}`;

        const slvSmiEl = document.getElementById('slv-smi');
        if (slvSmiEl) {
            const styles = getSmiStyleProperties(slvData.smi);
            slvSmiEl.innerText = slvData.smi;
            slvSmiEl.style.color = styles.color;
            slvSmiEl.style.fontWeight = styles.weight;
        }
    }

    // ==================== AUTOMATED RISK HEADLINE MONITOR ====================
    const coreIndices = ['SPY', 'DIA', 'QQQ', 'IWM'];
    let bearZoneCount = 0;
    coreIndices.forEach(ticker => {
        if (data.indices[ticker] && parseFloat(data.indices[ticker].currentPct) < 50) {
            bearZoneCount++;
        }
    });

    const gate1AlertBox = document.getElementById('gate1-alert');
    const vixDisplayElement = document.getElementById('baro-vix');
    const headlineElement = document.getElementById('barometer-headline');
    const rawVix = parseFloat(vixVal);

    if (gate1AlertBox && headlineElement) {
        if (bearZoneCount >= 2) {
            gate1AlertBox.innerText = `🛑 TACTICAL RISK EXPOSURE ALERT: ${bearZoneCount} CORE INDICES IN BEAR CHANNELS`;
            gate1AlertBox.style.color = "#ff3366"; gate1AlertBox.style.borderColor = "#ff3366"; gate1AlertBox.style.background = "#1a0d0f";
            headlineElement.innerText = "DISTRIBUTION REGIME CONFIRMED: SEVERE LACK OF BID DEPTH DRIVES RISK CHANNELS UNDER THE HORIZON. PROTECT TRADING CAPITAL.";
        } else {
            if (rawVix > 20) {
                if (vixDisplayElement) vixDisplayElement.style.color = "#ff3366";
                gate1AlertBox.innerText = "🛑 DO NOT ENTER, VOLATILITY FLOOD ACTIVE";
                gate1AlertBox.style.color = "#ff3366"; gate1AlertBox.style.borderColor = "#ff3366"; gate1AlertBox.style.background = "#1a0d0f";
                headlineElement.innerText = "VOLATILITY SHOCK IN PROGRESS: SPECULATIVE VEHICLES COLLAPSE AS SYSTEM LIQUIDITY COILS AHEAD OF INTERNAL MACRO REBALANCING.";
            } else if (rawVix < 14) {
                if (vixDisplayElement) vixDisplayElement.style.color = "#00ffcc";
                gate1AlertBox.innerText = "🟢 CLEAR SYSTEM PARITY: CONDITIONS FAVORABLE FOR LONG DEPLOYMENT";
                gate1AlertBox.style.color = "#00ffcc"; gate1AlertBox.style.borderColor = "#00ffcc"; gate1AlertBox.style.background = "#091412";
                headlineElement.innerText = "COMPLACENCY DOMINATES CAPITAL STRATAS: BULLS DIRECT ENVIRONMENT VELOCITY. ACCUMULATION MODE ACTIVE.";
            } else {
                if (vixDisplayElement) vixDisplayElement.style.color = "#ffcc00";
                gate1AlertBox.innerText = "⚠️ CAUTION: MARKET CONDITIONS UNSETTLED (ELEVATED NOISE)";
                gate1AlertBox.style.color = "#ffcc00"; gate1AlertBox.style.borderColor = "#ffcc00"; gate1AlertBox.style.background = "#1a160d";
                headlineElement.innerText = "CHOPPY CONSOLIDATION DETECTED: ASSETS HOLD ABOVE WEEKLY EQUILIBRIUM MEDIANS. ROTATION IS ACTIVELY PACING.";
            }
        }
    }
    
    const tsEl = document.getElementById('timestamp');
    if (tsEl) tsEl.innerText = "Last Intel Sync: " + data.ts;

    // ==================== GATE 3 CARDS RENDERING WITH COLOR FORMATTING ====================
    const grid = document.getElementById('data-grid');
    if (grid) {
        grid.innerHTML = Object.entries(data.indices).map(([ticker, val]) => {
            if (ticker === "GLD" || ticker === "SLV" || ticker === "ES=F" || ticker === "RTY=F" || ticker === "VIX") return '';
            
            const gapNum = parseFloat(val.valueGap);
            const gapClass = gapNum >= 0 ? 'gap-pos' : 'gap-neg';
            
            const change5dNum = val.change5d !== undefined ? val.change5d : 0;
            const priceColorClass = change5dNum >= 0 ? 'gap-pos' : 'gap-neg';
            const cardMomentumClass = change5dNum >= 0 ? 'up' : 'down';
            
            const currentPct = val.currentPct !== undefined ? parseFloat(val.currentPct) : 50;
            const smiStyles = getSmiStyleProperties(val.smi);

            let fillBarStyle = '';
            if (currentPct >= 50) {
                const width = currentPct - 50;
                fillBarStyle = `left: 50%; width: ${width}%; background: #007f4e; border-radius: 0 2px 2px 0;`;
            } else {
                const width = 50 - currentPct;
                fillBarStyle = `left: ${currentPct}%; width: ${width}%; background: #b9001b; border-radius: 2px 0 0 2px;`;
            }

            return `
            <div class="card ${cardMomentumClass}">
                <div>
                    <h3 style="color:#888; margin:0 0 5px 0; font-size:0.85em;">${ticker}</h3>
                    <div class="price ${priceColorClass}" style="font-size:1.4em; font-weight:bold;">$${val.price}</div>
                </div>

                <div>
                    <div class="tos-mini-track">
                        <div class="tos-center-axis" style="left: 50%;"></div>
                        <div class="tos-fill-bar" style="${fillBarStyle}"></div>
                    </div>
                    <div class="tos-labels">
                        <span style="color:#666;">L: ${val.weekLow}</span>
                        <span style="color:#666;">H: ${val.weekHigh}</span>
                    </div>
                </div>

                <div class="metrics" style="font-size:0.65em; margin-top:8px; border-top:1px solid #151515; padding-top:8px;">
                    SMI(10): <span style="color:${smiStyles.color}; font-weight:${smiStyles.weight};">${val.smi}</span> | 
                    Gap: <span class="${gapClass}">${val.valueGap}</span>
                </div>
            </div>`;
        }).join('');
    }

    // ==================== GATE 3 SECTOR SCOREBOARD ROTATOR WITH COLOR FORMATTING ====================
    const flowGrid = document.getElementById('money-flow-rank');
    if (flowGrid) {
        flowGrid.innerHTML = (data.moneyFlow || []).map((s, i) => {
            const sectorData = data.indices[s.ticker];
            const change5dNum = (sectorData && sectorData.change5d !== undefined) ? sectorData.change5d : 0;
            const flowBarClass = change5dNum >= 0 ? 'flow-up' : 'flow-down';
            
            const textStyles = getSmiStyleProperties(s.score);

            return `
            <div class="flow-card ${flowBarClass} ${i === 0 ? 'leader' : ''}">
                <div style="font-weight:bold; color:#888; margin-bottom:5px;">${s.ticker}</div>
                <div class="score-val" style="color:${textStyles.color}; font-weight:${textStyles.weight};">${s.score}</div>
                <div style="font-size:0.65em; color:#555; letter-spacing:1px;">SMI(10) SCORE</div>
            </div>`;
        }).join('');
    }
}

window.onload = () => {
    const saved = localStorage.getItem('surgicalData');
    if (saved) renderDashboard(JSON.parse(saved));
    setTimeout(triggerSync, 500);
    document.getElementById('sync-btn').onclick = triggerSync;
};