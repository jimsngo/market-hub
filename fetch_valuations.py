#!/usr/bin/env python3
import json
import os
import yfinance as yf

# ---------------------------------------------------------
# TACTICAL PROXY MAP
# The engine will automatically map these leveraged/complex 
# tickers to their unleveraged index to pull accurate P/E multiples.
# ---------------------------------------------------------
PROXY_MAP = {
    "YINN": {"proxy": "FXI", "name": "FTSE China 50 Index (3x Bull)"},
    "YANG": {"proxy": "FXI", "name": "FTSE China 50 Index (3x Bear)"},
    "KORU": {"proxy": "EWY", "name": "MSCI South Korea Index (3x Bull)"},
    "TQQQ": {"proxy": "QQQ", "name": "Nasdaq 100 Index (3x Bull)"},
    "SQQQ": {"proxy": "QQQ", "name": "Nasdaq 100 Index (3x Bear)"},
    "SOXL": {"proxy": "SOXX", "name": "Semiconductor Index (3x Bull)"},
    "UPRO": {"proxy": "SPY", "name": "S&P 500 Index (3x Bull)"}
}

def load_watchlist():
    if not os.path.exists("watch_list.json"):
        # Generate a clean, flat list if the file is missing
        default_data = ["YINN", "KORU", "NVDA", "META"]
        with open("watch_list.json", "w") as f:
            json.dump(default_data, f, indent=4)
        return default_data
        
    with open("watch_list.json", "r") as f:
        data = json.load(f)
        
        # Safety catch: If the old dictionary format is found, extract just the symbols
        if isinstance(data, dict) and "portfolio" in data:
            return [item["symbol"] if isinstance(item, dict) else item for item in data["portfolio"]]
            
        # Standard return for the new streamlined flat list
        return data

def run_valuation_sync():
    watchlist = load_watchlist()
    processed_list = []
    
    print("\n[⚡ ENGINE] Fetching valuations & generating auto-notes...")
    
    for item in watchlist:
        # Since the JSON is now just a list of strings, item is the symbol
        symbol = str(item).upper().strip()
        is_proxied = symbol in PROXY_MAP
        proxy_symbol = PROXY_MAP[symbol]["proxy"] if is_proxied else symbol
        
        try:
            ticker = yf.Ticker(proxy_symbol)
            info = ticker.info
            
            price = info.get("regularMarketPrice") or info.get("previousClose") or 0.0
            trailing_pe = info.get("trailingPE")
            forward_pe = info.get("forwardPE")
            peg = info.get("pegRatio")
            
            # Fallback calculation if forward P/E is missing but EPS exists
            if not forward_pe and price:
                forward_eps = info.get("forwardEps")
                if forward_eps and forward_eps > 0:
                    forward_pe = round(price / forward_eps, 2)
                    
            # ---------------------------------------------------------
            # 100% AUTOMATED NOTES GENERATOR
            # ---------------------------------------------------------
            if is_proxied:
                auto_note = f"Auto-Mapped: {PROXY_MAP[symbol]['name']} (Proxy: {proxy_symbol})"
            else:
                company_name = info.get("shortName") or info.get("longName") or "Unknown Asset"
                sector = info.get("sector") or info.get("category") or ""
                
                if sector:
                    auto_note = f"{company_name} | {sector}"
                else:
                    auto_note = company_name

            # Replace the processed_list.append block with this safer version:
            processed_list.append({
            "symbol": symbol,
            "proxy": proxy_symbol if is_proxied else None,
            "price": round(price, 2) if price else 0.0,
            # Check if the value is actually a number before rounding
            "trailing_pe": round(trailing_pe, 2) if isinstance(trailing_pe, (int, float)) else "—",
            "forward_pe": round(forward_pe, 2) if isinstance(forward_pe, (int, float)) else "—",
            "peg_ratio": round(peg, 2) if isinstance(peg, (int, float)) else "—",
            "allocation": "N/A", 
            "notes": auto_note
        })
            
            print(f" -> Synced: {symbol} | Note: {auto_note}")
            
        except Exception as e:
            print(f" [❌ ERROR] Failed to load data for {symbol}: {str(e)}")
            processed_list.append({
                "symbol": symbol,
                "proxy": None,
                "price": "Error",
                "trailing_pe": "Error",
                "forward_pe": "Error",
                "peg_ratio": "Error",
                "allocation": "N/A",
                "notes": f"Sync Failed: {str(e)}"
            })
            
    # Write aggregated data out to dashboard data payload
    with open("market_valuations.json", "w") as f:
        json.dump(processed_list, f, indent=4)
    print("\n[✔ SUCCESS] market_valuations.json compiled dynamically.\n")

if __name__ == "__main__":
    run_valuation_sync()