/**
 * Asset Correlation Lab - Frontend Application
 */

// ============================================
// State Management
// ============================================
const state = {
    assets: [],
    currentRange: '1Y',
    selectedAssetA: 'SPY',
    selectedAssetB: 'QQQ',
    correlationMatrix: null,
    comparisonChart: null,
    isDarkMode: true,
};

// ============================================
// Theme Toggle
// ============================================
function initTheme() {
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
        state.isDarkMode = false;
        document.documentElement.classList.add('light-mode');
        updateThemeUI();
    }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    
    if (state.isDarkMode) {
        document.documentElement.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    }
    
    updateThemeUI();
    
    // Update chart colors if chart exists
    if (state.comparisonChart) {
        updateComparisonChart();
    }
}

function updateThemeUI() {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    
    if (state.isDarkMode) {
        icon.textContent = '🌙';
        label.textContent = 'Dark';
    } else {
        icon.textContent = '☀️';
        label.textContent = 'Light';
    }
}

function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
}

// ============================================
// API Functions
// ============================================
const API_BASE = '/api';

async function fetchAssets() {
    const response = await fetch(`${API_BASE}/assets`);
    if (!response.ok) throw new Error('Failed to fetch assets');
    return response.json();
}

async function fetchCorrelationMatrix(range) {
    const response = await fetch(`${API_BASE}/correlation-matrix?range=${range}`);
    if (!response.ok) throw new Error('Failed to fetch correlation matrix');
    return response.json();
}

async function fetchComparison(assetA, assetB, range) {
    const response = await fetch(`${API_BASE}/comparison?asset_a=${assetA}&asset_b=${assetB}&range=${range}`);
    if (!response.ok) throw new Error('Failed to fetch comparison');
    return response.json();
}

async function fetchInsights(range) {
    const response = await fetch(`${API_BASE}/insights?range=${range}`);
    if (!response.ok) throw new Error('Failed to fetch insights');
    return response.json();
}

// ============================================
// Color Utilities
// ============================================
function getCorrelationColor(value) {
    // Map correlation (-1 to 1) to color
    const pos = { r: 46, g: 204, b: 113 };   // #2ecc71
    const neg = { r: 231, g: 76, b: 60 };    // #e74c3c
    const neutral = { r: 30, g: 30, b: 35 }; // near black
    
    let r, g, b, a;
    
    if (value >= 0) {
        // Interpolate from neutral to positive
        const t = value;
        r = Math.round(neutral.r + (pos.r - neutral.r) * t);
        g = Math.round(neutral.g + (pos.g - neutral.g) * t);
        b = Math.round(neutral.b + (pos.b - neutral.b) * t);
        a = 0.3 + 0.7 * Math.abs(value);
    } else {
        // Interpolate from neutral to negative
        const t = Math.abs(value);
        r = Math.round(neutral.r + (neg.r - neutral.r) * t);
        g = Math.round(neutral.g + (neg.g - neutral.g) * t);
        b = Math.round(neutral.b + (neg.b - neutral.b) * t);
        a = 0.3 + 0.7 * Math.abs(value);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getCorrelationTextColor(value) {
    return Math.abs(value) > 0.5 ? '#ffffff' : 'rgba(230, 237, 243, 0.9)';
}

// ============================================
// Matrix Rendering
// ============================================
function renderCorrelationMatrix(data) {
    const container = document.getElementById('correlation-matrix');
    const { assets, asset_names, matrix, reference_date } = data;
    
    // Update reference date
    document.getElementById('matrix-ref-date').textContent = `기준일: ${reference_date}`;
    
    // Set grid template
    const gridSize = assets.length + 1;
    container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add empty corner cell
    const corner = document.createElement('div');
    corner.className = 'matrix-cell header';
    container.appendChild(corner);
    
    // Add header row
    assets.forEach(asset => {
        const header = document.createElement('div');
        header.className = 'matrix-cell header';
        header.textContent = asset;
        container.appendChild(header);
    });
    
    // Add data rows
    matrix.forEach((row, i) => {
        // Row header
        const rowHeader = document.createElement('div');
        rowHeader.className = 'matrix-cell header';
        rowHeader.textContent = assets[i];
        container.appendChild(rowHeader);
        
        // Data cells
        row.forEach((cell, j) => {
            const cellElement = document.createElement('div');
            
            if (i === j) {
                // Diagonal cell
                cellElement.className = 'matrix-cell diagonal';
                cellElement.textContent = '1.00';
            } else {
                cellElement.className = 'matrix-cell';
                cellElement.textContent = cell.correlation.toFixed(2);
                cellElement.style.backgroundColor = getCorrelationColor(cell.correlation);
                cellElement.style.color = getCorrelationTextColor(cell.correlation);
                
                // Add click handler
                cellElement.addEventListener('click', () => {
                    selectAssetPair(cell.asset_a, cell.asset_b);
                });
                
                // Add hover handlers for tooltip
                cellElement.addEventListener('mouseenter', (e) => {
                    showTooltip(e, cell, asset_names);
                });
                cellElement.addEventListener('mousemove', (e) => {
                    moveTooltip(e);
                });
                cellElement.addEventListener('mouseleave', () => {
                    hideTooltip();
                });
            }
            
            container.appendChild(cellElement);
        });
    });
}

// ============================================
// Tooltip
// ============================================
function showTooltip(event, cell, assetNames) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <div class="tooltip-pair">${assetNames[cell.asset_a]} vs ${assetNames[cell.asset_b]}</div>
        <div class="tooltip-row">
            <span>Correlation</span>
            <span>${cell.correlation.toFixed(3)}</span>
        </div>
        <div class="tooltip-row">
            <span>Sample count</span>
            <span>${cell.sample_count}</span>
        </div>
    `;
    tooltip.classList.add('visible');
    moveTooltip(event);
}

function moveTooltip(event) {
    const tooltip = document.getElementById('tooltip');
    const x = event.clientX + 15;
    const y = event.clientY + 15;
    
    // Keep tooltip within viewport
    const rect = tooltip.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 20;
    const maxY = window.innerHeight - rect.height - 20;
    
    tooltip.style.left = `${Math.min(x, maxX)}px`;
    tooltip.style.top = `${Math.min(y, maxY)}px`;
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('visible');
}

// ============================================
// Asset Selection
// ============================================
function selectAssetPair(assetA, assetB) {
    state.selectedAssetA = assetA;
    state.selectedAssetB = assetB;
    
    // Update selectors
    document.getElementById('asset-a-select').value = assetA;
    document.getElementById('asset-b-select').value = assetB;
    
    // Scroll to chart
    document.getElementById('chart').scrollIntoView({ behavior: 'smooth' });
    
    // Update chart
    updateComparisonChart();
}

function populateAssetSelectors() {
    const selectA = document.getElementById('asset-a-select');
    const selectB = document.getElementById('asset-b-select');
    
    selectA.innerHTML = '';
    selectB.innerHTML = '';
    
    state.assets.forEach(asset => {
        const optionA = document.createElement('option');
        optionA.value = asset.id;
        optionA.textContent = asset.name;
        if (asset.id === state.selectedAssetA) optionA.selected = true;
        selectA.appendChild(optionA);
        
        const optionB = document.createElement('option');
        optionB.value = asset.id;
        optionB.textContent = asset.name;
        if (asset.id === state.selectedAssetB) optionB.selected = true;
        selectB.appendChild(optionB);
    });
    
    // Add change listeners
    selectA.addEventListener('change', (e) => {
        state.selectedAssetA = e.target.value;
        updateComparisonChart();
    });
    
    selectB.addEventListener('change', (e) => {
        state.selectedAssetB = e.target.value;
        updateComparisonChart();
    });
}

// ============================================
// Comparison Chart
// ============================================
async function updateComparisonChart() {
    const { selectedAssetA, selectedAssetB, currentRange } = state;
    
    try {
        const data = await fetchComparison(selectedAssetA, selectedAssetB, currentRange);
        
        // Update meta information
        document.getElementById('chart-ref-date').textContent = data.reference_date;
        document.getElementById('chart-sample-count').textContent = `${data.sample_count} days`;
        document.getElementById('chart-correlation').textContent = data.correlation.toFixed(3);
        
        // Update stat cards
        document.getElementById('stat-a-name').textContent = data.asset_a.name;
        document.getElementById('stat-b-name').textContent = data.asset_b.name;
        document.getElementById('stat-a-vol').textContent = `${(data.volatility_a * 100).toFixed(1)}%`;
        document.getElementById('stat-b-vol').textContent = `${(data.volatility_b * 100).toFixed(1)}%`;
        
        // Calculate cumulative returns
        if (data.asset_a.timeseries.length > 0) {
            const finalA = data.asset_a.timeseries[data.asset_a.timeseries.length - 1].value;
            const returnA = ((finalA - 100) / 100 * 100).toFixed(1);
            document.getElementById('stat-a-return').textContent = `${returnA >= 0 ? '+' : ''}${returnA}%`;
            document.getElementById('stat-a-return').style.color = returnA >= 0 ? 'var(--pos)' : 'var(--neg)';
        }
        
        if (data.asset_b.timeseries.length > 0) {
            const finalB = data.asset_b.timeseries[data.asset_b.timeseries.length - 1].value;
            const returnB = ((finalB - 100) / 100 * 100).toFixed(1);
            document.getElementById('stat-b-return').textContent = `${returnB >= 0 ? '+' : ''}${returnB}%`;
            document.getElementById('stat-b-return').style.color = returnB >= 0 ? 'var(--pos)' : 'var(--neg)';
        }
        
        // Render chart
        renderComparisonChart(data);
        
    } catch (error) {
        console.error('Error updating comparison chart:', error);
    }
}

function getChartColors() {
    const isDark = state.isDarkMode;
    return {
        accentA: isDark ? '#4aa3ff' : '#2563eb',
        accentB: isDark ? '#2ecc71' : '#16a34a',
        text: isDark ? '#e6edf3' : '#1e293b',
        textSecondary: isDark ? '#c9d1d9' : '#475569',
        textMuted: isDark ? 'rgba(230, 237, 243, 0.5)' : 'rgba(30, 41, 59, 0.6)',
        grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
        tooltipBg: isDark ? 'rgba(22, 27, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    };
}

function renderComparisonChart(data) {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    const colors = getChartColors();
    
    // Destroy existing chart
    if (state.comparisonChart) {
        state.comparisonChart.destroy();
    }
    
    const labels = data.asset_a.timeseries.map(d => d.date);
    const dataA = data.asset_a.timeseries.map(d => d.value);
    const dataB = data.asset_b.timeseries.map(d => d.value);
    
    state.comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: data.asset_a.name,
                    data: dataA,
                    borderColor: colors.accentA,
                    backgroundColor: colors.accentA + '1a',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: colors.accentA,
                },
                {
                    label: data.asset_b.name,
                    data: dataB,
                    borderColor: colors.accentB,
                    backgroundColor: colors.accentB + '1a',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: colors.accentB,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: colors.text,
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 12
                        },
                        boxWidth: 12,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.text,
                    bodyColor: colors.textSecondary,
                    borderColor: colors.tooltipBorder,
                    borderWidth: 1,
                    padding: 12,
                    titleFont: {
                        family: "'JetBrains Mono', monospace",
                        size: 12,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: "'JetBrains Mono', monospace",
                        size: 11
                    },
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: colors.grid,
                        drawBorder: false
                    },
                    ticks: {
                        color: colors.textMuted,
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 10
                        },
                        maxTicksLimit: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: colors.grid,
                        drawBorder: false
                    },
                    ticks: {
                        color: colors.textMuted,
                        font: {
                            family: "'JetBrains Mono', monospace",
                            size: 10
                        },
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

// ============================================
// Insights
// ============================================
async function updateInsights() {
    try {
        const data = await fetchInsights(state.currentRange);
        renderInsights(data.insights);
    } catch (error) {
        console.error('Error fetching insights:', error);
    }
}

function renderInsights(insights) {
    const container = document.getElementById('insights-grid');
    container.innerHTML = '';
    
    const icons = {
        highest_positive: { icon: '📈', class: 'positive' },
        strongest_negative: { icon: '📉', class: 'negative' },
        near_zero: { icon: '⚖️', class: 'neutral' }
    };
    
    insights.forEach(insight => {
        const iconData = icons[insight.type] || { icon: '📊', class: 'neutral' };
        
        const card = document.createElement('div');
        card.className = 'insight-card';
        card.innerHTML = `
            <div class="insight-icon ${iconData.class}">${iconData.icon}</div>
            <div class="insight-title">${insight.title}</div>
            <div class="insight-text">${insight.text}</div>
        `;
        container.appendChild(card);
    });
}

// ============================================
// Range Selector Setup
// ============================================
function setupRangeSelectors() {
    // Matrix range selector
    const matrixBtns = document.querySelectorAll('#matrix-range-selector .range-btn');
    matrixBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            matrixBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentRange = btn.dataset.range;
            updateAllData();
        });
    });
    
    // Chart range selector
    const chartBtns = document.querySelectorAll('#chart-range-selector .range-btn');
    chartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chartBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentRange = btn.dataset.range;
            
            // Sync matrix range selector
            matrixBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.range === state.currentRange);
            });
            
            updateAllData();
        });
    });
}

// ============================================
// Scroll Function
// ============================================
function scrollToMatrix() {
    document.getElementById('matrix').scrollIntoView({ behavior: 'smooth' });
}

// Make it globally available
window.scrollToMatrix = scrollToMatrix;

// ============================================
// Update All Data
// ============================================
async function updateAllData() {
    try {
        // Update correlation matrix
        const matrixData = await fetchCorrelationMatrix(state.currentRange);
        state.correlationMatrix = matrixData;
        renderCorrelationMatrix(matrixData);
        
        // Update comparison chart
        await updateComparisonChart();
        
        // Update insights
        await updateInsights();
        
    } catch (error) {
        console.error('Error updating data:', error);
    }
}

// ============================================
// Initialization
// ============================================
async function init() {
    try {
        // Initialize theme first (before any rendering)
        initTheme();
        setupThemeToggle();
        
        // Fetch initial assets
        state.assets = await fetchAssets();
        
        // Populate asset selectors
        populateAssetSelectors();
        
        // Setup range selectors
        setupRangeSelectors();
        
        // Load initial data
        await updateAllData();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--neg);">
                <div style="text-align: center;">
                    <h2>Error Loading Application</h2>
                    <p>Please ensure the backend server is running.</p>
                    <code style="color: var(--muted);">uvicorn backend.main:app --reload</code>
                </div>
            </div>
        `;
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

