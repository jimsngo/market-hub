function updateClock() {
    const el = document.getElementById('clock');
    if (el) el.innerText = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);

async function triggerSync() {
    const btn = document.getElementById('sync-btn');
    if (btn) btn.innerText = "SYNCING...";
    try {
        // Full 11-sector matrix + core macro tracking assets
        const symbols = [
            "SPY", "DIA", "QQQ", "IWM", "%5EVIX", "%5ETNX", 
            "XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU",
            "GLD", "SLV", "ES=F", "RTY=F"
        ];
        const data = await fetchMarketData(symbols);
        localStorage.setItem('surgicalData', JSON.stringify(data));
        renderDashboard(data);
    } catch (e) { console.error(e); }
    if (btn) btn.innerText = "Refresh Theatre";
}

// STANDARD COLOR LOGIC: Uniform tracking across all panels (Bullish = Green, Bearish = Red)
function getTrendStatusProperties(trend, isMacroGate = false) {
    if (trend === "Bullish") {
        return { text: "BULLISH", color: "#00ff66" }; 
    } else if (trend === "Bearish") {
        return { text: "BEARISH", color: "#ff3366" }; 
    }
    return { text: "NEUTRAL", color: "#ffcc00" };
}

// Long-Term Kumo Cloud Structure Mapping Utility
function getCloudStructureProperties(cloudPosition) {
    if (cloudPosition === "Above" || cloudPosition === "Bullish") {
        return { text: "ABOVE CLOUD ☁️", color: "#00ffcc", valid: true };
    } else if (cloudPosition === "Below" || cloudPosition === "Bearish") {
        return { text: "BELOW CLOUD 🚨", color: "#ff3366", valid: false };
    }
    return { text: "INSIDE CLOUD ⏳", color: "#ffcc00", valid: false };
}

// Midpoint range horizontal tracker bar (0-100%)
function getTosBarStyle(percentage) {
    const pct = parseFloat(percentage);
    if (isNaN(pct)) return '';
    return pct >= 50 
        ? `left: 50%; width: ${pct - 50}%; background: #007f4e; border-radius: 0 2px 2px 0;`
        : `left: ${pct}%; width: ${50 - pct}%; background: #b9001b; border-radius: 2px 0 0 2px;`;
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
    const tnxVal = tnxData ? parseFloat(tnxData.price) : 0;

    // Hardened Macro Regime Calculation
    const isVixSafe = (vixData && vixData.trend === "Bearish" && vixData.cloud === "Below");
    const isTnxSafe = (tnxData && tnxData.trend === "Bearish" && tnxData.cloud === "Below");
    const isSystemSafeToOperate = (isVixSafe && isTnxSafe);
    const isFirewallTripped = !isSystemSafeToOperate;

    // 1. GATE 1 VOLATILITY MATRIX
    const elVix = document.getElementById('baro-vix'); if (elVix && vixData) elVix.innerText = vixVal.toFixed(2);
    const vixFill = document.getElementById('vix-tos-fill');
    if (vixFill && vixData) vixFill.style.cssText = getTosBarStyle(vixData.currentPct);
    const vixL = document.getElementById('vix-lbl-low'); if (vixL && vixData) vixL.innerText = `L: ${vixData.weekLow}`;
    const vixH = document.getElementById('vix-lbl-high'); if (vixH && vixData) vixH.innerText = `H: ${vixData.weekHigh}`;
    const vixSmiLabel = document.getElementById('vix-lbl-smi'); 
    if (vixSmiLabel && vixData) {
        const vProps = getTrendStatusProperties(vixData.trend, true);
        const vCloud = getCloudStructureProperties(vixData.cloud);
        vixSmiLabel.innerHTML = `
            ST POSTURE: <span style="font-size:1.1em; color:${vProps.color}; font-weight:bold; margin-right:12px;">${vProps.text}</span>
            LT STRUCTURE: <span style="font-size:1.1em; color:${vCloud.color}; font-weight:bold;">${vCloud.text}</span>`;
    }

    // 2. GATE 1 RATE MOMENTUM MATRIX
    const elTnx = document.getElementById('baro-tnx'); if (elTnx && tnxData) elTnx.innerText = tnxVal.toFixed(2) + "%";
    const tnxFill = document.getElementById('tnx-tos-fill');
    if (tnxFill && tnxData) tnxFill.style.cssText = getTosBarStyle(tnxData.currentPct);
    const tnxL = document.getElementById('tnx-lbl-low'); if (tnxL && tnxData) tnxL.innerText = `L: ${tnxData.weekLow}%`;
    const tnxH = document.getElementById('tnx-lbl-high'); if (tnxH && tnxData) tnxH.innerText = `H: ${tnxData.weekHigh}%`;
    const tnxSmiLabel = document.getElementById('tnx-lbl-smi');
    if (tnxSmiLabel && tnxData) {
        const tProps = getTrendStatusProperties(tnxData.trend, true);
        const tCloud = getCloudStructureProperties(tnxData.cloud);
        tnxSmiLabel.innerHTML = `
            ST POSTURE: <span style="font-size:1.1em; color:${tProps.color}; font-weight:bold; margin-right:12px;">${tProps.text}</span>
            LT STRUCTURE: <span style="font-size:1.1em; color:${tCloud.color}; font-weight:bold;">${tCloud.text}</span>`;
    }

    // 2b. BINARY OPERATIONAL DIRECTIVE BOX OUTPUT
    const summaryEl = document.getElementById('gate1-summary-directive');
    if (summaryEl) {
        if (isSystemSafeToOperate) {
            summaryEl.innerText = "📋 DIRECTIVE: Market Favorable - Core Macro Signals Synchronized Below Kumo Cloud Ceiling";
            summaryEl.style.cssText = "border:1px solid #007f4e; padding:14px; border-radius:6px; font-weight:bold; font-size:0.95em; text-align:center; letter-spacing:0.5px; background:#0a1910; color:#00ff66; box-shadow:0 0 10px rgba(0,255,102,0.15);";
        } else {
            summaryEl.innerText = "📋 DIRECTIVE: Market Unfavorable - Firewall Locked Down Against Structural Macro Stress";
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

    // 4. GATE 2 ROW GRID GENERATOR
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
            const trendStyles = getTrendStatusProperties(val.trend);
            const cloudStyles = getCloudStructureProperties(val.cloud);
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
                    <div style="font-size:0.55em; border-top:1px solid #1c1c1c; padding-top:6px; color:#555; display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>ST POSTURE:</span>
                            <span style="color:${trendStyles.color}; font-size:1.2em; font-weight:bold;">${trendStyles.text}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>LT CLOUD:</span>
                            <span style="color:${cloudStyles.color}; font-size:1.2em; font-weight:bold;">${cloudStyles.text}</span>
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

    // 5. FIREWALL ALERTS
    const coreIndices = ['SPY', 'DIA', 'QQQ', 'IWM'];
    const bearZoneCount = coreIndices.filter(ticker => data.indices[ticker] && parseFloat(data.indices[ticker].currentPct) < 50).length;
    const gate1AlertBox = document.getElementById('gate1-alert');
    const headlineElement = document.getElementById('barometer-headline');

    if (gate1AlertBox && headlineElement) {
        if (isFirewallTripped) {
            gate1AlertBox.innerText = `🛑 CRITICAL FIREWALL BREACH: MACRO STRATA TREND REVERSAL DETECTED`;
            gate1AlertBox.style.cssText = "color:#ff3366; border-color:#ff3366; background:#1a0d0f; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px; box-shadow: 0 0 10px rgba(255,51,102,0.2);";
            headlineElement.innerText = "FIREWALL SHUTDOWN CALIBRATED: MACRO RISK ENGINES PENETRATE KUMO CEILINGS. LONG TERMINAL EXECUTION SHUT DOWN.";
        } else if (bearZoneCount >= 2) {
            gate1AlertBox.innerText = `🛑 TACTICAL RISK EXPOSURE ALERT: ${bearZoneCount} CORE INDICES IN BEAR CHANNELS`;
            gate1AlertBox.style.cssText = "color:#ff3366; border-color:#ff3366; background:#1a0d0f; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
        } else {
            gate1AlertBox.innerText = "🟢 CLEAR SYSTEM PARITY: CONDITIONS FAVORABLE FOR LONG DEPLOYMENT";
            gate1AlertBox.style.cssText = "color:#00ffcc; border-color:#00ffcc; background:#091412; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
        }
    }
    
    if (tsEl) tsEl.innerText = "Last Intel Sync: " + data.ts;

    // 6. MASTER GRID RENDERING LOOP (GATE 3 SYMMETRICAL MATRIX)[cite: 1]
    const grid = document.getElementById('data-grid');
    if (grid) {
        const coreMarketTickers = ['SPY', 'DIA', 'QQQ', 'IWM'];
        const sectorPool = ["XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU"];

        // Extract active bullish sectors to map out row 2[cite: 1]
        const activeSectors = sectorPool.filter(ticker => data.indices[ticker] && data.indices[ticker].trend === "Bullish");

        // Merge anchors and breakouts sequentially to preserve clean alignment[cite: 1]
        const orderedRenderSequence = [...coreMarketTickers, ...activeSectors];

        grid.innerHTML = orderedRenderSequence.map(ticker => {
            const val = data.indices[ticker];
            if (!val) return '';
            
            const trendStyles = getTrendStatusProperties(val.trend);
            const cloudStyles = getCloudStructureProperties(val.cloud);
            const isCoreIndex = coreMarketTickers.includes(ticker);
            
            const gapClass = parseFloat(val.valueGap) >= 0 ? 'gap-pos' : 'gap-neg';
            const priceColorClass = val.change5d >= 0 ? 'gap-pos' : 'gap-neg';
            const cardMomentumClass = val.change5d >= 0 ? 'up' : 'down';
            
            // Symmetrical neon frame accents when momentum converges with long-term structure[cite: 1]
            const isFullyQualified = trendStyles.text === "BULLISH" && cloudStyles.valid;
            const cardBorderAccent = isFullyQualified 
                ? "border: 2px solid #00ffcc; box-shadow: 0 0 15px rgba(0,255,204,0.2);" 
                : (isCoreIndex ? "border: 1px solid #333;" : "border: 1px solid #1a2925;");

            return `
            <div class="card ${cardMomentumClass}" style="${cardBorderAccent}">
                <div>
                    <h3 style="color:#888; margin:0 0 5px 0; font-size:0.85em;">${ticker} ${isCoreIndex ? '<span style="color:#555; font-size:0.8em; font-weight:normal;">[INDEX]</span>' : ''}</h3>
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
                <div class="metrics" style="font-size:0.65em; margin-top:8px; border-top:1px solid #151515; padding-top:8px; display:flex; flex-direction:column; gap:5px;">
                    <div style="color:#555; display:flex; justify-content:space-between; align-items:center;">
                        <span>ST POSTURE:</span>
                        <span style="color:${trendStyles.color}; font-size:1.3em; font-weight:bold;">${trendStyles.text}</span>
                    </div>
                    <div style="color:#555; display:flex; justify-content:space-between; align-items:center;">
                        <span>LT CLOUD:</span>
                        <span style="color:${cloudStyles.color}; font-size:1.3em; font-weight:bold;">${cloudStyles.text}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:4px; color:#555;">
                        <span>Value Gap: <span class="${gapClass}">${val.valueGap}</span></span>
                    </div>
                </div>
            </div>`;
        }).join('');

        // Clean safety state fallback if absolutely zero sectors are printing a bullish signal
        if (activeSectors.length === 0) {
            // Renders indices on top still, but displays clear cash notice below
            const macroIndicesHtml = coreMarketTickers.map(ticker => { /* Renders core index sub-block standalone if required */ }).join('');
            // Optional: You can append an explicit "frozen" footer alert to the grid if desired.
        }
    }

    // 7. CLEAN REDUNDANCY ELIMINATION FIELD[cite: 1]
    const flowGrid = document.getElementById('money-flow-rank');
    if (flowGrid) {
        // Complete structural removal of old text loop to maintain a sleek desktop presence[cite: 1]
        flowGrid.innerHTML = '';
        flowGrid.style.display = 'none';
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