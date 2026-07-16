function updateClock() {
    const el = document.getElementById('clock');
    if (el) el.innerText = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);

// VIEW TOGGLE LOGIC (OPTION A)
function switchView(viewName) {
    const macroView = document.getElementById('macro-view');
    const valView = document.getElementById('val-view');
    const tabMacro = document.getElementById('tab-macro');
    const tabVal = document.getElementById('tab-val');
    
    if (!macroView || !valView) return;
    
    if (viewName === 'macro') {
        macroView.style.display = 'block';
        valView.style.display = 'none';
        if (tabMacro) tabMacro.classList.add('active');
        if (tabVal) tabVal.classList.remove('active');
    } else {
        macroView.style.display = 'none';
        valView.style.display = 'block';
        if (tabMacro) tabMacro.classList.remove('active');
        if (tabVal) tabVal.classList.add('active');
        fetchValuationData();
    }
}

async function triggerSync() {
    const btn = document.getElementById('sync-btn');
    if (btn) btn.innerText = "SYNCING...";
    try {
        const symbols = [
            "SPY", "DIA", "QQQ", "IWM", "%5EVIX", "%5ETNX", 
            "XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU",
            "GLD", "SLV", "ES=F", "RTY=F"
        ];
        const data = await fetchMarketData(symbols);
        localStorage.setItem('surgicalData', JSON.stringify(data));
        renderDashboard(data);
        fetchValuationData(); // Also sync local valuations
    } catch (e) { console.error(e); }
    if (btn) btn.innerText = "Refresh Theatre";
}

// LOCAL VALUATION ENGINE DATA PARSER
async function fetchValuationData() {
    const tbody = document.getElementById('valuation-table-body');
    const statusEl = document.getElementById('valuation-sync-status');
    if (!tbody) return;
    
    try {
        const response = await fetch('market_valuations.json');
        if (!response.ok) throw new Error("Database offline");
        const data = await response.json();
        
        tbody.innerHTML = '';
        if (statusEl) {
            statusEl.innerText = "LOCAL PAYLOAD SYNCHRONIZED";
            statusEl.style.color = "#00ffcc";
        }
        
        data.forEach(item => {
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid #111";
            
            // Visual indicators based on multiples
            let peClass = "";
            const fpe = parseFloat(item.forward_pe);
            if (!isNaN(fpe)) {
                if (fpe <= 12.0) peClass = "gap-pos"; // Deep Value (Green)
                else if (fpe >= 25.0) peClass = "gap-neg"; // Premium Tech (Red)
            }
            
            const proxyBadge = item.proxy 
                ? `<span style="font-size: 0.7em; color: #ffcc00; background: #1f1a00; border: 1px solid #473e0a; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-family: monospace;">PROXY: ${item.proxy}</span>` 
                : "";
                
            row.innerHTML = `
                <td style="padding: 14px 12px; font-weight: bold; color: #fff; font-family: monospace; letter-spacing: 1px;">
                    ${item.symbol} ${proxyBadge}
                </td>
                <td style="padding: 14px 12px; font-family: monospace;">$${item.price}</td>
                <td style="padding: 14px 12px; font-family: monospace;">${item.trailing_pe}${item.trailing_pe !== 'N/A' && item.trailing_pe !== 'Error' ? 'x' : ''}</td>
                <td style="padding: 14px 12px; font-family: monospace;" class="${peClass}">${item.forward_pe}${item.forward_pe !== 'N/A' && item.forward_pe !== 'Error' ? 'x' : ''}</td>
                <td style="padding: 14px 12px; font-family: monospace;">${item.peg_ratio}</td>
                <td style="padding: 14px 12px;"><span style="background: #111; border: 1px solid #222; padding: 3px 8px; border-radius: 4px; font-family: monospace; color: #888;">${item.allocation}</span></td>
                <td style="padding: 14px 12px; color: #888; font-size: 0.9em;">${item.notes}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Valuation retrieval exception:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #ff3366; padding: 40px; font-weight: bold; font-family: monospace;">
                    ⚠️ OFFLINE: RUN python fetch_valuations.py TO COMPILE LOCAL DATASETS
                </td>
            </tr>`;
        if (statusEl) {
            statusEl.innerText = "DATA PAYLOAD OFFLINE";
            statusEl.style.color = "#ff3366";
        }
    }
}

function getTrendStatusProperties(trend, isMacroGate = false) {
    if (trend === "Bullish") return { text: "BULLISH", color: "#00ff66" }; 
    if (trend === "Bearish") return { text: "BEARISH", color: "#ff3366" }; 
    return { text: "NEUTRAL", color: "#ffcc00" };
}

function getCloudStructureProperties(cloudPosition) {
    if (cloudPosition === "Above" || cloudPosition === "Bullish") return { text: "ABOVE CLOUD ☁️", color: "#00ffcc", valid: true };
    if (cloudPosition === "Below" || cloudPosition === "Bearish") return { text: "BELOW CLOUD 🚨", color: "#ff3366", valid: false };
    return { text: "INSIDE CLOUD ⏳", color: "#ffcc00", valid: false };
}

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

    const isVixSafe = (vixData && vixData.trend === "Bearish");
    const isTnxSafe = (tnxData && tnxData.trend === "Bearish");
    const isSystemSafeToOperate = (isVixSafe && isTnxSafe);
    const isFirewallTripped = !isSystemSafeToOperate;

    const gate1MacroGrid = document.getElementById('gate1-macro-grid');
    if (gate1MacroGrid) {
        const macroConfig = [
            { ticker: "VIX", name: "CBOE Volatility Index", suffix: "" },
            { ticker: "TNX", name: "10Y Treasury Yield", suffix: "%" }
        ];

        gate1MacroGrid.innerHTML = macroConfig.map(item => {
            const val = data.indices[item.ticker];
            if (!val) return '';

            const trendStyles = getTrendStatusProperties(val.trend);
            const cloudStyles = getCloudStructureProperties(val.cloud);
            const gapClass = parseFloat(val.valueGap) >= 0 ? 'gap-pos' : 'gap-neg';
            const priceColorClass = val.change5d >= 0 ? 'gap-pos' : 'gap-neg';
            const cardMomentumClass = val.change5d >= 0 ? 'up' : 'down';
            const ageColor = val.trend === "Bearish" ? "#00ff66" : "#ff3366";

            return `
            <div class="card ${cardMomentumClass}" style="border: 1px solid #333;">
                <div>
                    <h3 style="color:#aaa; margin:0 0 5px 0; font-size:0.85em; letter-spacing:0.5px;">${item.ticker} <span style="font-size:0.75em; color:#666; font-weight:normal;">(${item.name})</span></h3>
                    <div class="price ${priceColorClass}" style="font-size:1.4em; font-weight:bold;">${val.price}${item.suffix}</div>
                </div>
                <div>
                    <div class="tos-mini-track" style="height: 12px;">
                        <div class="tos-center-axis" style="left: 50%;"></div>
                        <div class="tos-fill-bar" style="${getTosBarStyle(val.currentPct)}"></div>
                    </div>
                    <div class="tos-labels" style="margin-bottom: 6px;">
                        <span style="color:#666;">5D L: ${val.weekLow}${item.suffix}</span>
                        <span style="color:#666;">5D H: ${val.weekHigh}${item.suffix}</span>
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
                    <div style="color:#555; display:flex; justify-content:space-between; align-items:center;">
                        <span>VALUE GAP:</span>
                        <span class="${gapClass}" style="font-weight:bold; font-size:1.1em;">${val.valueGap}</span>
                    </div>
                    <div style="color:#555; display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #1a1a1a; margin-top:2px; padding-top:4px;">
                        <span>TREND AGE:</span>
                        <span style="color:${ageColor}; font-weight:bold; font-size:1.3em; letter-spacing:0.5px;">${val.trendAge || 0}d</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    const summaryEl = document.getElementById('gate1-summary-directive');
    if (summaryEl) {
        const globalDays = data.firewallAge || 0;
        const durationColor = isSystemSafeToOperate ? "#00ff66" : "#ff3366";
        const durationBadge = `<span style="float:right; font-size:0.85em; background:rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; color:${durationColor}; letter-spacing:1px;">ALIGNMENT AGE: ${globalDays} ${globalDays === 1 ? 'DAY' : 'DAYS'}</span>`;
        
        if (isSystemSafeToOperate) {
            summaryEl.innerHTML = `📋 DIRECTIVE: Market Favorable — Buy ONLY high value stocks that are rising. | Core Macro Signals Synchronized Below Tactical Thresholds ${durationBadge}`;
            summaryEl.style.cssText = "border:1px solid #007f4e; padding:14px; border-radius:6px; font-weight:bold; font-size:0.95em; text-align:left; letter-spacing:0.5px; background:#0a1910; color:#00ff66; box-shadow:0 0 10px rgba(0,255,102,0.15);";
        } else {
            summaryEl.innerHTML = `📋 DIRECTIVE: Market Unfavorable — Firewall Locked Down Against Structural Macro Stress ${durationBadge}`;
            summaryEl.style.cssText = "border:1px solid #b9001b; padding:14px; border-radius:6px; font-weight:bold; font-size:0.95em; text-align:left; letter-spacing:0.5px; background:#1a0d0f; color:#ff3366; box-shadow:0 0 12px rgba(255,51,102,0.2);";
        }
    }

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

    const coreIndices = ['SPY', 'DIA', 'QQQ', 'IWM'];
    const bearZoneCount = coreIndices.filter(ticker => data.indices[ticker] && parseFloat(data.indices[ticker].currentPct) < 50).length;
    const gate1AlertBox = document.getElementById('gate1-alert');
    const headlineElement = document.getElementById('barometer-headline');

    if (gate1AlertBox && headlineElement) {
        if (isFirewallTripped) {
            gate1AlertBox.innerText = `🛑 CRITICAL FIREWALL BREACH: MACRO STRATA TREND REVERSAL DETECTED`;
            gate1AlertBox.style.cssText = "color:#ff3366; border-color:#ff3366; background:#1a0d0f; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px; box-shadow: 0 0 10px rgba(255,51,102,0.2);";
            headlineElement.innerText = "FIREWALL SHUTDOWN CALIBRATED: MACRO RISK ENGINES BREACH SHORT TERM BOUNDARIES. LONG TERMINAL EXECUTION SHUT DOWN.";
        } else if (bearZoneCount >= 2) {
            gate1AlertBox.innerText = `🛑 TACTICAL RISK EXPOSURE ALERT: ${bearZoneCount} CORE INDICES IN BEAR CHANNELS`;
            gate1AlertBox.style.cssText = "color:#ff3366; border-color:#ff3366; background:#1a0d0f; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
        } else {
            gate1AlertBox.innerText = "🟢 CLEAR SYSTEM PARITY: CONDITIONS FAVORABLE FOR LONG DEPLOYMENT";
            gate1AlertBox.style.cssText = "color:#00ffcc; border-color:#00ffcc; background:#091412; padding:12px; border-radius:6px; font-weight:bold; font-size:0.9em; letter-spacing:1px; text-align:center; margin-bottom:15px;";
        }
    }
    
    if (tsEl) tsEl.innerText = "Last Intel Sync: " + data.ts;

    const grid = document.getElementById('data-grid');
    if (grid) {
        const coreMarketTickers = ['SPY', 'DIA', 'QQQ', 'IWM'];
        const sectorPool = ["XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU"];

        const sectorNames = {
            "XLC": "Comm Services",
            "XLY": "Cons Discretionary",
            "XLP": "Consumer Staples",
            "XLE": "Energy",
            "XLF": "Financials",
            "XLV": "Health Care",
            "XLI": "Industrials",
            "XLK": "Technology",
            "XLB": "Materials",
            "XLRE": "Real Estate",
            "XLU": "Utilities"
        };

        const activeSectors = sectorPool.filter(ticker => data.indices[ticker] && data.indices[ticker].trend === "Bullish");
        const orderedRenderSequence = [...coreMarketTickers, ...activeSectors];

        grid.innerHTML = orderedRenderSequence.map(ticker => {
            const val = data.indices[ticker];
            if (!val) return '';
            
            const trendStyles = getTrendStatusProperties(val.trend);
            const cloudStyles = getCloudStructureProperties(val.cloud);
            const isCoreIndex = coreMarketTickers.includes(ticker);
            
            const displayTitle = isCoreIndex ? ticker : `${ticker} <span style="font-size:0.75em; color:#666; font-weight:normal;">(${sectorNames[ticker]})</span>`;
            const gapClass = parseFloat(val.valueGap) >= 0 ? 'gap-pos' : 'gap-neg';
            const priceColorClass = val.change5d >= 0 ? 'gap-pos' : 'gap-neg';
            const cardMomentumClass = val.change5d >= 0 ? 'up' : 'down';
            
            const isFullyQualified = trendStyles.text === "BULLISH" && cloudStyles.valid;
            const cardBorderAccent = isFullyQualified
                ? "border: 2px solid #00ffcc; box-shadow: 0 0 15px rgba(0,255,204,0.2);"
                : (isCoreIndex ? "border: 1px solid #333;" : "border: 1px solid #1a2925;");

            const ageColor = val.trend === "Bullish" ? "#00ff66" : "#ff3366";

            return `
            <div class="card ${cardMomentumClass}" style="${cardBorderAccent}">
                <div>
                    <h3 style="color:#aaa; margin:0 0 5px 0; font-size:0.85em; letter-spacing:0.5px;">${displayTitle} ${isCoreIndex ? '<span style="color:#555; font-size:0.8em; font-weight:normal;">[INDEX]</span>' : ''}</h3>
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
                    <div style="color:#555; display:flex; justify-content:space-between; align-items:center;">
                        <span>VALUE GAP:</span>
                        <span class="${gapClass}" style="font-weight:bold; font-size:1.1em;">${val.valueGap}</span>
                    </div>
                    <div style="color:#555; display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #1a1a1a; margin-top:2px; padding-top:4px;">
                        <span>TREND AGE:</span>
                        <span style="color:${ageColor}; font-weight:bold; font-size:1.3em; letter-spacing:0.5px;">${val.trendAge || 0}d</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    const flowGrid = document.getElementById('money-flow-rank');
    if (flowGrid) {
        flowGrid.innerHTML = '';
        flowGrid.style.display = 'none';
    }
}

window.onload = () => {
    const saved = localStorage.getItem('surgicalData');
    if (saved) {
        try { renderDashboard(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    fetchValuationData(); // Load valuations on start
    setTimeout(triggerSync, 500);
    setInterval(triggerSync, 5 * 60 * 1000); 
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.onclick = triggerSync;
};