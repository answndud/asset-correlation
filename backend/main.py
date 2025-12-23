"""
Asset Correlation Lab - FastAPI Backend
"""

import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import math

import numpy as np
import pandas as pd
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Asset Correlation Lab API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data directory
DATA_DIR = Path(__file__).parent / "data"

# Asset metadata
ASSETS = {
    "SPY": {"id": "SPY", "name": "S&P 500 (SPY)"},
    "QQQ": {"id": "QQQ", "name": "Nasdaq 100 (QQQ)"},
    "GLD": {"id": "GLD", "name": "Gold (GLD)"},
    "BTCUSD": {"id": "BTCUSD", "name": "Bitcoin (BTC-USD)"},
    "TLT": {"id": "TLT", "name": "US 20Y+ Treasury (TLT)"},
    "DXY": {"id": "DXY", "name": "US Dollar Index (DXY)"},
}


def load_asset_data(asset_id: str) -> pd.DataFrame:
    """Load CSV data for an asset."""
    file_path = DATA_DIR / f"{asset_id}.csv"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    
    df = pd.read_csv(file_path, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def compute_log_returns(df: pd.DataFrame) -> pd.DataFrame:
    """Compute log returns from price data."""
    df = df.copy()
    df["return"] = np.log(df["close"] / df["close"].shift(1))
    return df.dropna()


def filter_by_range(df: pd.DataFrame, range_type: str, reference_date: datetime) -> pd.DataFrame:
    """Filter data by date range."""
    if range_type == "1M":
        start_date = reference_date - timedelta(days=30)
    elif range_type == "3M":
        start_date = reference_date - timedelta(days=90)
    elif range_type == "6M":
        start_date = reference_date - timedelta(days=180)
    elif range_type == "1Y":
        start_date = reference_date - timedelta(days=365)
    elif range_type == "3Y":
        start_date = reference_date - timedelta(days=365*3)
    elif range_type == "5Y":
        start_date = reference_date - timedelta(days=365*5)
    elif range_type == "10Y":
        start_date = reference_date - timedelta(days=365*10)
    elif range_type == "MAX":
        return df  # Return all data
    elif range_type == "YTD":
        start_date = datetime(reference_date.year, 1, 1)
    else:
        start_date = reference_date - timedelta(days=365)  # default to 1Y
    
    return df[df["date"] >= start_date]


def compute_pearson_correlation(returns_a: np.ndarray, returns_b: np.ndarray) -> float:
    """Compute Pearson correlation coefficient."""
    if len(returns_a) < 2:
        return 0.0
    
    mean_a = np.mean(returns_a)
    mean_b = np.mean(returns_b)
    
    numerator = np.sum((returns_a - mean_a) * (returns_b - mean_b))
    denominator = np.sqrt(np.sum((returns_a - mean_a) ** 2) * np.sum((returns_b - mean_b) ** 2))
    
    if denominator == 0:
        return 0.0
    
    return float(numerator / denominator)


def get_reference_date() -> datetime:
    """Get the reference date (latest data date across all assets)."""
    latest_dates = []
    for asset_id in ASSETS.keys():
        try:
            df = load_asset_data(asset_id)
            latest_dates.append(df["date"].max())
        except:
            pass
    
    if not latest_dates:
        return datetime.now()
    
    return min(latest_dates)  # Use the minimum of max dates to ensure all assets have data


@app.get("/api/assets")
def get_assets():
    """Return list of available assets."""
    return list(ASSETS.values())


@app.get("/api/correlation-matrix")
def get_correlation_matrix(range: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|10Y|MAX|YTD)$")):
    """Compute correlation matrix for all asset pairs."""
    reference_date = get_reference_date()
    asset_ids = list(ASSETS.keys())
    
    # Load and compute returns for all assets
    asset_returns = {}
    for asset_id in asset_ids:
        df = load_asset_data(asset_id)
        df = compute_log_returns(df)
        df = filter_by_range(df, range, reference_date)
        asset_returns[asset_id] = df.set_index("date")["return"]
    
    # Compute correlation matrix
    matrix = []
    for i, asset_a in enumerate(asset_ids):
        row = []
        for j, asset_b in enumerate(asset_ids):
            # Find common dates
            returns_a = asset_returns[asset_a]
            returns_b = asset_returns[asset_b]
            common_dates = returns_a.index.intersection(returns_b.index)
            
            if len(common_dates) < 2:
                corr = 0.0
                sample_count = 0
            else:
                aligned_a = returns_a.loc[common_dates].values
                aligned_b = returns_b.loc[common_dates].values
                corr = compute_pearson_correlation(aligned_a, aligned_b)
                sample_count = len(common_dates)
            
            row.append({
                "asset_a": asset_a,
                "asset_b": asset_b,
                "correlation": round(corr, 4),
                "sample_count": sample_count
            })
        matrix.append(row)
    
    return {
        "assets": asset_ids,
        "asset_names": {k: v["name"] for k, v in ASSETS.items()},
        "matrix": matrix,
        "reference_date": reference_date.strftime("%Y-%m-%d"),
        "range": range
    }


@app.get("/api/comparison")
def get_comparison(
    asset_a: str = Query(..., description="First asset ID"),
    asset_b: str = Query(..., description="Second asset ID"),
    range: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|10Y|MAX|YTD)$")
):
    """Get comparison timeseries for two assets."""
    if asset_a not in ASSETS:
        raise HTTPException(status_code=404, detail=f"Asset {asset_a} not found")
    if asset_b not in ASSETS:
        raise HTTPException(status_code=404, detail=f"Asset {asset_b} not found")
    
    reference_date = get_reference_date()
    
    # Load and process both assets
    df_a = load_asset_data(asset_a)
    df_a = compute_log_returns(df_a)
    df_a = filter_by_range(df_a, range, reference_date)
    
    df_b = load_asset_data(asset_b)
    df_b = compute_log_returns(df_b)
    df_b = filter_by_range(df_b, range, reference_date)
    
    # Find common dates
    dates_a = set(df_a["date"].dt.strftime("%Y-%m-%d"))
    dates_b = set(df_b["date"].dt.strftime("%Y-%m-%d"))
    common_dates = sorted(dates_a.intersection(dates_b))
    
    if len(common_dates) < 2:
        return {
            "asset_a": {"id": asset_a, "name": ASSETS[asset_a]["name"], "timeseries": []},
            "asset_b": {"id": asset_b, "name": ASSETS[asset_b]["name"], "timeseries": []},
            "common_dates": [],
            "sample_count": 0,
            "correlation": 0,
            "reference_date": reference_date.strftime("%Y-%m-%d"),
            "range": range,
            "volatility_a": 0,
            "volatility_b": 0
        }
    
    # Filter to common dates
    df_a["date_str"] = df_a["date"].dt.strftime("%Y-%m-%d")
    df_b["date_str"] = df_b["date"].dt.strftime("%Y-%m-%d")
    
    df_a_common = df_a[df_a["date_str"].isin(common_dates)].sort_values("date").reset_index(drop=True)
    df_b_common = df_b[df_b["date_str"].isin(common_dates)].sort_values("date").reset_index(drop=True)
    
    # Compute cumulative returns (base 100)
    cumulative_a = [100.0]
    for r in df_a_common["return"].values:
        cumulative_a.append(cumulative_a[-1] * math.exp(r))
    cumulative_a = cumulative_a[1:]  # Remove initial 100
    
    cumulative_b = [100.0]
    for r in df_b_common["return"].values:
        cumulative_b.append(cumulative_b[-1] * math.exp(r))
    cumulative_b = cumulative_b[1:]
    
    # Prepare timeseries
    timeseries_a = [
        {"date": d, "value": round(v, 2)}
        for d, v in zip(df_a_common["date_str"].values, cumulative_a)
    ]
    timeseries_b = [
        {"date": d, "value": round(v, 2)}
        for d, v in zip(df_b_common["date_str"].values, cumulative_b)
    ]
    
    # Compute correlation
    returns_a = df_a_common["return"].values
    returns_b = df_b_common["return"].values
    correlation = compute_pearson_correlation(returns_a, returns_b)
    
    # Compute volatility (annualized std of returns)
    volatility_a = float(np.std(returns_a) * np.sqrt(252)) if len(returns_a) > 1 else 0
    volatility_b = float(np.std(returns_b) * np.sqrt(252)) if len(returns_b) > 1 else 0
    
    return {
        "asset_a": {"id": asset_a, "name": ASSETS[asset_a]["name"], "timeseries": timeseries_a},
        "asset_b": {"id": asset_b, "name": ASSETS[asset_b]["name"], "timeseries": timeseries_b},
        "common_dates": common_dates,
        "sample_count": len(common_dates),
        "correlation": round(correlation, 4),
        "reference_date": reference_date.strftime("%Y-%m-%d"),
        "range": range,
        "volatility_a": round(volatility_a, 4),
        "volatility_b": round(volatility_b, 4)
    }


@app.get("/api/insights")
def get_insights(range: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|10Y|MAX|YTD)$")):
    """Generate data-driven insights for the given range."""
    # Get correlation matrix data
    matrix_data = get_correlation_matrix(range)
    matrix = matrix_data["matrix"]
    asset_names = matrix_data["asset_names"]
    
    # Collect all unique pairs with their correlations
    pairs = []
    asset_ids = list(ASSETS.keys())
    
    for i, asset_a in enumerate(asset_ids):
        for j, asset_b in enumerate(asset_ids):
            if i < j:  # Only upper triangle (avoid duplicates and self-correlation)
                cell = matrix[i][j]
                pairs.append({
                    "asset_a": asset_a,
                    "asset_b": asset_b,
                    "name_a": asset_names[asset_a],
                    "name_b": asset_names[asset_b],
                    "correlation": cell["correlation"],
                    "sample_count": cell["sample_count"]
                })
    
    if not pairs:
        return {"insights": [], "range": range}
    
    # Find insights
    insights = []
    
    # 1. Highest positive correlation
    max_pos = max(pairs, key=lambda x: x["correlation"])
    if max_pos["correlation"] > 0:
        insights.append({
            "type": "highest_positive",
            "title": "가장 높은 양(+)의 상관",
            "text": f"{max_pos['asset_a']}–{max_pos['asset_b']} ({max_pos['correlation']:.3f}, n={max_pos['sample_count']})",
            "correlation": max_pos["correlation"],
            "sample_count": max_pos["sample_count"]
        })
    
    # 2. Strongest negative correlation
    min_neg = min(pairs, key=lambda x: x["correlation"])
    if min_neg["correlation"] < 0:
        insights.append({
            "type": "strongest_negative",
            "title": "가장 강한 음(-)의 상관",
            "text": f"{min_neg['asset_a']}–{min_neg['asset_b']} ({min_neg['correlation']:.3f}, n={min_neg['sample_count']})",
            "correlation": min_neg["correlation"],
            "sample_count": min_neg["sample_count"]
        })
    
    # 3. Closest to zero correlation
    closest_zero = min(pairs, key=lambda x: abs(x["correlation"]))
    insights.append({
        "type": "near_zero",
        "title": "상관이 0에 가까운 조합",
        "text": f"{closest_zero['asset_a']}–{closest_zero['asset_b']} ({closest_zero['correlation']:.3f}, n={closest_zero['sample_count']})",
        "correlation": closest_zero["correlation"],
        "sample_count": closest_zero["sample_count"]
    })
    
    return {
        "insights": insights[:3],  # Return up to 3 insights
        "range": range,
        "reference_date": matrix_data["reference_date"]
    }


# Serve frontend static files
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/")
async def serve_root():
    """Serve the main HTML file."""
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/{path:path}")
async def serve_static(path: str):
    """Serve static files."""
    file_path = FRONTEND_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(FRONTEND_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

