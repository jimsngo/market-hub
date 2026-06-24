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
    if (isNaN(score)) return { color: "#ffffff" };
    return score >= 0 ? { color: "#00ff66" } : { color: "#ff3366" };
}

// Style String Return Builder for standard High/Low candle midpoint bars (0-100%)
function getTosBarStyle(percentage) {
    const pct = parseFloat(percentage);
    if (isNaN(pct)) return '';
    return pct >= 50 
        ? `left: 50%; width: ${pct - 50}%; background: #007f4e; border-radius: 0 2px 2px 0;`
        : `left: ${pct}%; width: ${50 - pct}%; background: #b9001b; border-radius: 2px 0 0 2px;`;
}

// Progressive Intensity Gradient Return Builder for SMI tracks (-100 to +100)
function getSmiBarStyle(scoreValue) {
    const score = parseFloat(scoreValue);
    if (isNaN(score)) return '';
    const smiPct = ((score + 100) / 200) * 100;
    
    return score >= 0
        ? `left: 50%; width: ${smiPct - 50}%; background: linear-gradient(to right, #007f4e, #00ff66); border-radius: 0 2px 2px 0;`
        : `left: ${smiPct}%; width: ${50 - smiPct}%; background: linear-gradient(to left, #b9001b, #ff3366); border-radius: 2px 0 0 2px;`;
}

function renderDashboard(data) {
    if (!data || !data.indices) return;

    const tsEl = document.getElementById('timestamp'); 
    const bDate = document.getElementById('barometer-date');
    if (bDate) bDate.innerText = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const vixData = data.indices["VIX"];
    const tnxData = data.indices["TNX"];
    const gldData = data.indices["GLD"];
    const slvData = data.indices["SLV"];
    const esData = data.indices["ES=F"];
    const rtyData = data.indices["RTY=F"];

    const vixVal = vixData ? parseFloat(vixData.price) : 0;
    const vixSmi = vixData ? parseFloat(vixData.smi) : 0;
    const vixAvg = vixData ? parseFloat(vixData.smiAvg) : 0;
    const vixPct = vixData ? parseFloat(vixData.currentPct) : 50;
    
    const tnxVal = tnxData ? parseFloat(tnxData.price) : 0;
    const tnxSmi = tnxData ? parseFloat(tnxData.smi) : 0;

    // --- HARDENED REAL-TIME PIVOT ENGINE (NO IFS, ANDS, OR ORS) ---
    // Rule 1: If VIX > 20, market is bearish, period.
    // Rule 2: If VIX < 20, look at the 5-day H/L graph. If it's green (> 50%), it is bearish.
    const isSystemSafeToOperate = (vixVal < 20 && vixPct <= 50);
    const isFirewallTripped = !isSystemSafeToOperate;

    // 1. DYNAMIC UPDATE FOR GATE 1 VOLATILITY MATRIX
    const elVix = document.getElementById('baro-vix'); if (elVix && vixData) elVix.innerText = vixVal.toFixed(2);
    const vixFill = document.getElementById('vix-tos-fill');
    if (vixFill && vixData) vixFill.style.cssText = getTosBarStyle(vixData.currentPct);
    const vixL = document.getElementById('vix-lbl-low'); if (vixL && vixData) vixL.innerText = `L: ${vixData.weekLow}`;
    const vixH = document.getElementById('vix-lbl-high'); if (vixH && vixData) vixH.innerText = `H: ${vixData.weekHigh}`;
    const vixSmiLabel = document.getElementById('vix-lbl-smi'); 
    if (vixSmiLabel && vixData) {
        vixSmiLabel.innerText = `SMI: ${vixSmi} / Avg: ${vixAvg}`;
        vixSmiLabel.style.color = getSmiStyleProperties(vixSmi).color;
    }

    // 2. DYNAMIC UPDATE FOR GATE 1 RATE MOMENTUM MATRIX
    const elTnx = document.getElementById('baro-tnx'); if (elTnx && tnxData) elTnx.innerText = tnxVal.toFixed(2) + "%";
    const tnxFill = document.getElementById('tnx-tos-fill');
    if (tnxFill && tnxData) tnxFill.style.cssText = getTosBarStyle(tnxData.currentPct);
    const tnxL = document.getElementById('tnx-lbl-low'); if (tnxL && tnxData) tnxL.innerText = `L: ${tnxData.weekLow}%`;
    const tnxH = document.getElementById('tnx-lbl-high'); if (tnxH && tnxData) tnxH.innerText = `H: ${tnxData.weekHigh}%`;
    const tnxSmiLabel = document.getElementById('tnx-lbl-smi');
    if (tnxSmiLabel && tnxData) {
        tnxSmiLabel.innerText = `SMI: ${tnxSmi}`;
        tnxSmiLabel.style.color = getSmiStyleProperties(tnxSmi).color;
    }

    // --- 2b. BINARY OPERATIONAL DIRECTIVE BOX OUTPUT ---
    const summaryEl = document.getElementById('gate1-summary-directive');
    if (summaryEl) {
        if (isSystemSafeToOperate) {
            summaryEl.innerText = "📋 DIRECTIVE: Market Favorable - It's OK to buy High Value Stocks";
            summaryEl.style.cssText = "border:1px solid #007f4e; padding:14px; border-radius:6px; font-weight:bold; font-size:0.95em; text-align:center; letter-spacing:0.5px; background:#0a1910; color:#00ff66; box-shadow:0 0 10px rgba(0,255,102,0.15);";
        } else {
            summaryEl.innerText = "📋 DIRECTIVE: Market Unfavorable - Time to Cash Out or Trim Positions";
            summaryEl.style.cssText = "border:1px solid #b9001b; padding:14px; border-radius:6px; font-weight:bold; font-size:0.95em; text-align:center; letter-spacing:0.5px; background:#1a0d0f; color:#ff3366; box-shadow:0 0 12px rgba(255,51,102,0.2);";
        }
    }

    // 3. TIMING PANELS (PRE-MARKET FUTURES ACTIVE MATRIX)
    const options = { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hour12: false };
    const etParts = new Intl.DateTimeFormat([], options).formatToParts(new Date());
    const etTimeFloat = parseInt(etParts.find(p => p.type === "hour").value, 10) + (parseInt(etParts.find(p => p.type === "minute").value, 10) / 60);
    const futuresPanel = document.getElementById('premarket-futures-panel');
    
    if (etTimeFloat >= 4.0 && etTimeFloat < 9.5) {
        if (futuresPanel) {
            futuresPanel.style.display = "block";
            const esEl = document.getElementById('baro-es-futures'); if (esEl) esEl.innerText = esData ? "$" + esData.price : "--";
            const rtyEl = document.getElementById('baro-rty-futures'); if (rtyEl) rtyEl.innerText = rtyData ? "$" + rtyData.price : "--";
            if (esEl && esData) esEl.style.color = esData.change5d >= 0 ? "#00ffcc" : "#ff3366";
            if (rtyEl && rtyData) rtyEl.style.color = rtyData.change5d >= 0 ? "#00ffcc" : "#ff3366";
        }
    } else if (futuresPanel) {
        futuresPanel.style.display = "none";
    }

    // 4. GATE 2 ROW GRID GENERATOR (Value Gaps + 2-Yr Yield floor)
    const us02yPrice = vixData ? (data.yield * 0.93).toFixed(2) + "%" : "4.17%";
    const isFloorHeld = parseFloat(us02yPrice) >= 3.75;

    let gate2Html = `
    <div style="background:#1a1111; padding:10px; border-radius:6px; border:1px solid #331a1a; text-align:center; display:flex; flex-direction:column; justify-content:center; min-height:120px;">
        <div style="font-size:0.65em; color:#885555; font-weight:bold; letter-spacing:1px; margin-bottom:4px;">3.75% US02Y FLOOR</div>
        <div id="baro-floor-status" style="font-size:1.3em; font-weight:bold; color:${isFloorHeld ? '#00ffcc' : '#ff3366'}; margin-top:5px; letter-spacing:1px;">
            ${isFloorHeld ? 'HELD 💪' : 'BROKEN 🚨'}
        </div>
        <div style="font-size:0.55em; color:#555; margin-top:8px; line-height:1.3;">EQUITY HURDLE STATUS</div>
    </div>`;

    const gate2Config = [
        { label: "2-YR TREASURY (US02Y)", price: us02yPrice, data: tnxData, suffix: "%", scale: 0.93, isMetal: false },
        { label: "GOLD TRUST (GLD)", price: gldData ? "$" + gldData.price : "--", data: gldData, suffix: "", scale: 1, prefix: "$", isMetal: true },
        { label: "SILVER TRUST (SLV)", price: slvData ? "$" + slvData.price : "--", data: slvData, suffix: "", scale: 1, prefix: "$", isMetal: true }
    ];

    const gate2Grid = document.getElementById('gate2-grid');
    if (gate2Grid) {
        gate2Html += gate2Config.map(asset => {
            const val = asset.data;
            if (!val) return '';
            
            const pColor = val.change5d >= 0 ? "#00ffcc" : "#ff3366";
            const lowVal = asset.isMetal ? `${asset.prefix}${val.weekLow}` : `${(parseFloat(val.weekLow) * asset.scale).toFixed(2)}${asset.suffix}`;
            const highVal = asset.isMetal ? `${asset.prefix}${val.weekHigh}` : `${(parseFloat(val.weekHigh) * asset.scale).toFixed(2)}${asset.suffix}`;
            const textStyles = getSmiStyleProperties(val.smi);
            const gapClass = parseFloat(val.valueGap) >= 0 || val.valueGap === "N/A" ? 'gap-pos' : 'gap-neg';

            return `
            <div style="background:#111; padding:10px; border-radius:6px; border:1px solid #1a1a1a; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div style="font-size:0.6em; color:#555;">${asset.label}</div>
                    <div style="font-size:1.2em; font-weight:bold; color:${pColor}; margin-top:5px;">${asset.price}</div>
                </div>
                <div>
                    <div class="tos-mini-track" style="height: 12px; margin-top:8px; margin-bottom:4px;">
                        <div class="tos-center-axis" style="left: 50%;"></div>
                        <div class="tos-fill-bar" style="${getTosBarStyle(val.currentPct)}"></div>
                    </div>
                    <div class="tos-labels" style="margin-bottom: 6px;">
                        <span style="color:#666;">L: ${lowVal}</span>
                        <span style="color:#666;">H: ${highVal}</span>
                    </div>
                    <div style="font-size:0.55em; border-top:1px solid #1c1c1c; padding-top:4px; color:#555; display:flex; flex-direction:column; gap:4px;">
                        <div>
                            SMI MOMENTUM: <span style="color:${textStyles.color}; font-weight:bold; float:right;">${val.smi}</span>
                        </div>
                        <div class="tos-mini-track" style="height: 12px; margin: 0; background: #03070d; border-color: #0e1620;">
                            <div class="tos-center-axis" style="left: 50%; background: #192535;"></div>
                            <div class="tos-fill-bar" style="${getSmiBarStyle(val.smi)}"></div>
                        </div>
                        <div style="margin-top:2px;">
                            Value Gap: <span class="${gapClass}" style="float:right; font-weight:bold;">${val.valueGap}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        gate2Grid.innerHTML = gate2Html;
    }

    // 5. FIREWALL LEVEL OVERRIDE AND MULTI-INDEX HEADLINE ANALYSIS
    const coreIndices = ['SPY', 'DIA', 'QQQ', 'IWM'];
    const bearZoneCount = coreIndices.filter(ticker => data.indices[ticker] && parseFloat(data.indices[ticker].currentPct) < 50).length;
    const gate1AlertBox = document.getElementById('gate1-alert');
    const headlineElement = document.getElementById('barometer-headline');

    if (gate1AlertBox && headlineElement) {
        if (isFirewallTripped) {
            gate1AlertBox.innerText = `🛑 CRITICAL FIREWALL BREACH: CLOSE POSITIONS / DEFENSIVE CASH LOCK`;
            gate1AlertBox.style.cssText = "color:#ff3366; border-color:#ff3366; background:#1a0d0f; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px; box-shadow: 0 0 10px rgba(255,51,102,0.2);";
            headlineElement.innerText = "MACRO THREAT ACTIVE: PIVOT SHUTDOWN CALIBRATED. EXTRAORDINARY REGIME ANXIETY DETECTED VIA GRAPH EXTENSION OR LEVEL BREAK.";
        } else if (bearZoneCount >= 2) {
            gate1AlertBox.innerText = `🛑 TACTICAL RISK EXPOSURE ALERT: ${bearZoneCount} CORE INDICES IN BEAR CHANNELS`;
            gate1AlertBox.style.cssText = "color:#ff3366; border-color:#ff3366; background:#1a0d0f; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
            headlineElement.innerText = "DISTRIBUTION REGIME CONFIRMED: SEVERE LACK OF BID DEPTH DRIVES RISK CHANNELS UNDER THE HORIZON. PROTECT TRADING CAPITAL.";
        } else {
            if (elVix) elVix.style.color = vixVal > 20 ? "#ff3366" : (vixVal < 14 ? "#00ffcc" : "#ffcc00");
            
            if (vixVal < 14) {
                gate1AlertBox.innerText = "🟢 CLEAR SYSTEM PARITY: CONDITIONS FAVORABLE FOR LONG DEPLOYMENT";
                gate1AlertBox.style.cssText = "color:#00ffcc; border-color:#00ffcc; background:#091412; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
                headlineElement.innerText = "COMPLACENCY DOMINATES CAPITAL STRATAS: BULLS DIRECT ENVIRONMENT VELOCITY. ACCUMULATION MODE ACTIVE.";
            } else {
                gate1AlertBox.innerText = "⚠️ CAUTION: MARKET CONDITIONS UNSETTLED (ELEVATED NOISE)";
                gate1AlertBox.style.cssText = "color:#ffcc00; border-color:#ffcc00; background:#1a160d; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
                headlineElement.innerText = "CHOPPY CONSOLIDATION DETECTED: ASSETS HOLD ABOVE DAILY EQUILIBRIUM MEDIANS. ROTATION IS ACTIVELY PACING.";
            }
        }
    }
    
    if (tsEl) tsEl.innerText = "Last Intel Sync: " + data.ts;

    // 6. MASTER GRID RENDERING LOOP (GATE 3 ASSET GRIDS)
    const grid = document.getElementById('data-grid');
    if (grid) {
        grid.innerHTML = Object.entries(data.indices).map(([ticker, val]) => {
            if (["GLD", "SLV", "ES=F", "RTY=F", "VIX", "TNX"].includes(ticker)) return '';
            
            const gapClass = parseFloat(val.valueGap) >= 0 ? 'gap-pos' : 'gap-neg';
            const priceColorClass = val.change5d >= 0 ? 'gap-pos' : 'gap-neg';
            const cardMomentumClass = val.change5d >= 0 ? 'up' : 'down';
            const textStyles = getSmiStyleProperties(val.smi);

            return `
            <div class="card ${cardMomentumClass}">
                <div>
                    <h3 style="color:#888; margin:0 0 5px 0; font-size:0.85em;">${ticker}</h3>
                    <div class="price ${priceColorClass}" style="font-size:1.4em; font-weight:bold;">$${val.price}</div>
                </div>
                <div>
                    <div class="tos-mini-track" style="height: 12px;">
                        <div class="tos-center-axis" style="left: 50%;"></div>
                        <div class="tos-fill-bar" style="${getTosBarStyle(val.currentPct)}"></div>
                    </div>
                    <div class="tos-labels" style="margin-bottom: 6px;">
                        <span style="color:#666;">5D L: ${val.weekLow}</span>
                        <span style="color:#666;">5D H: ${val.weekHigh}</span>
                    </div>
                </div>
                <div class="metrics" style="font-size:0.65em; margin-top:8px; border-top:1px solid #151515; padding-top:8px;">
                    <div style="color:#555; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span>SMI MOMENTUM:</span>
                        <span style="color:${textStyles.color}; font-weight:bold;">${val.smi}</span>
                    </div>
                    <div class="tos-mini-track" style="height: 12px; margin: 4px 0 6px 0; background: #03070d; border-color: #0e1620;">
                        <div class="tos-center-axis" style="left: 50%; background: #192535;"></div>
                        <div class="tos-fill-bar" style="${getSmiBarStyle(val.smi)}"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px; color:#555;">
                        <span>Value Gap: <span class="${gapClass}">${val.valueGap}</span></span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // 7. SECTOR ALLOCATION SCOREBOARD RENDERING LOOP
    const flowGrid = document.getElementById('money-flow-rank');
    if (flowGrid) {
        flowGrid.innerHTML = (data.moneyFlow || []).map((s, i) => {
            const sectorData = data.indices[s.ticker];
            const flowBarClass = (sectorData && sectorData.change5d >= 0) ? 'flow-up' : 'flow-down';
            const textStyles = getSmiStyleProperties(s.score);

            return `
            <div class="flow-card ${flowBarClass} ${i === 0 ? 'leader' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; color:#888; margin-bottom:5px;">
                    <span>${s.ticker}</span>
                    <span style="color:${textStyles.color}; font-size:1.1em;">${s.score}</span>
                </div>
                <div class="tos-mini-track" style="height: 12px; margin: 4px 0; background: #03070d; border-color: #0e1620;">
                    <div class="tos-center-axis" style="left: 50%; background: #192535;"></div>
                    <div class="tos-fill-bar" style="${getSmiBarStyle(s.score)}"></div>
                </div>
                <div style="font-size:0.6em; color:#444; letter-spacing:1px; text-align:center; font-weight:bold;">SMI MOMENTUM FLOW</div>
            </div>`;
        }).join('');
    }
}

window.onload = () => {
    const saved = localStorage.getItem('surgicalData');
    if (saved) {
        try { renderDashboard(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    setTimeout(triggerSync, 500);
    setInterval(triggerSync, 5 * 60 * 1000); 
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.onclick = triggerSync;
};