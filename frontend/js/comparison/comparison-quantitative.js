
// ==========================================
// COMPARISON RENDERING
// Input: [{ type, analysis }, { type, analysis }]  (company one, company two)
// ==========================================

const COMPARISON_SLOTS = ["one", "two"];

// ---- Formatters ----
const usd = (scale, unit) => (v) =>
    v != null ? `$${formatMetric(v / scale, unit)}` : "N/A";

const plain = (unit) => (v) => formatMetric(v, unit);

// ---- Comparison metrics ----
const COMPARISON_METRICS = [
    // Financial strength
    { id: "cash",              get: q => q.financial_strength.cash,              format: usd(1e9, "B") },
    { id: "total-debt",        get: q => q.financial_strength.total_debt,        format: usd(1e9, "B") },
    { id: "net-debt",          get: q => q.financial_strength.net_debt,          format: usd(1e9, "B") },
    { id: "debt-equity",       get: q => q.financial_strength.debt_to_equity,    format: plain("x") },
    { id: "current-ratio",     get: q => q.financial_strength.current_ratio,     format: plain("x") },
    { id: "interest-coverage", get: q => q.financial_strength.interest_coverage, format: plain("x") },

    // Profitability and growth
    { id: "revenue-cagr-5y",   get: q => q.profitability["Revenue 5Y CAGR"],     format: plain("%") },
    { id: "revenue-cagr-3y",   get: q => q.profitability["Revenue 3Y CAGR"],     format: plain("%") },
    { id: "revenue-yoy",       get: q => q.profitability["Revenue YoY Growth"],  format: plain("%") },
    { id: "eps-cagr-5y",       get: q => q.profitability["EPS 5Y CAGR"],         format: plain("%") },
    { id: "eps-cagr-3y",       get: q => q.profitability["EPS 3Y CAGR"],         format: plain("%") },
    { id: "eps-yoy",           get: q => q.profitability["EPS YoY Growth"],      format: plain("%") },
    { id: "gross-margin",      get: q => q.profitability["Gross Margin"],        format: plain("%") },
    { id: "operating-margin",  get: q => q.profitability["Operating Margin"],    format: plain("%") },
    { id: "free-cash-flow",    get: q => q.profitability["Free Cashflow"],       format: usd(1e9, "B") },
    { id: "fcf-margin",        get: q => q.profitability["FCF Margin"],          format: plain("%") },
    { id: "fcf-yoy",           get: q => q.profitability["FCF YoY Growth"],      format: plain("%") },
    { id: "roe",               get: q => q.profitability["ROE"],                 format: plain("%") },
    { id: "roic",              get: q => q.profitability["ROIC"],                format: plain("%") },

    // Valuation multiples
    { id: "pe-ratio",          get: q => q.valuation["P/E"],                     format: plain("x") },
    { id: "p-fcf",             get: q => q.valuation["P/FCF"],                   format: plain("x") },
    { id: "ev-ebitda",         get: q => q.valuation["EV/EBITDA"],               format: plain("x") },
    { id: "p-b",               get: q => q.valuation["P/B"],                     format: plain("x") },
];

// ---- Historical charts ----
const COMPARISON_HISTORY_CHARTS = [
    { canvas: "comparison-historical-revenue-chart",          key: "revenue" },
    { canvas: "comparison-historical-eps-chart",              key: "eps" },
    { canvas: "comparison-historical-gross-margin-chart",     key: "gross_margin" },
    { canvas: "comparison-historical-operating-margin-chart", key: "operating_margin" },
    { canvas: "comparison-historical-fcf-chart",              key: "fcf" },
    { canvas: "comparison-historical-fcf-margin-chart",        key: "fcf_margin" },
    { canvas: "comparison-historical-pe-chart",               key: "pe" },
    { canvas: "comparison-historical-p-fcf-chart",            key: "p_fcf" },
    { canvas: "comparison-historical-ev-ebitda-chart",        key: "ev_ebitda" },
    { canvas: "comparison-historical-p-b-chart",              key: "p_b" },
];

const comparisonCharts = {};

// ---- Helpers ----
function setComparisonValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function comparisonColors() {
    const style = getComputedStyle(
        document.getElementById("comparison-view") || document.body
    );

    return COMPARISON_SLOTS.map(slot =>
        style.getPropertyValue(`--comparison-color-${slot}`).trim() ||
        (slot === "one" ? "#c9a227" : "#5aa9e6")
    );
}

// ==========================================
// Main entry point
// ==========================================
function displayComparison(data, pricePeriod = "1y") {
    const analyses = data.slice(0, 2).map(item => item.analysis);

    // Keep the current analyses available for period-button clicks
    window.currentComparison = analyses;

    analyses.forEach((analysis, i) => {
        const q = analysis.quant_analysis;

        const set = (key, value) =>
            setComparisonValue(
                `comparison-company-${COMPARISON_SLOTS[i]}-${key}`,
                value
            );

        // Overview
        set("name", q.profile.name ?? "N/A");
        set("ticker", q.ticker ?? "N/A");

        const lastSaved = analysis.updated_at;

        set(
            "last-saved",
            formatTimestamp(lastSaved)
                ? new Date(lastSaved).toLocaleDateString("en-GB")
                : "N/A"
        );

        set("share-price", `$${formatMetric(q.profile.price)}`);

        set(
            "market-cap",
            q.profile.market_cap != null
                ? `$${formatMetric(q.profile.market_cap / 1e12, "T")}`
                : "N/A"
        );

        set("ceo", q.profile.ceo ?? "N/A");

        // Metric cards
        COMPARISON_METRICS.forEach(m => {
            set(m.id, m.format(m.get(q)));
        });
    });

    displayComparisonPriceChart(analyses, pricePeriod);

    COMPARISON_HISTORY_CHARTS.forEach(({ canvas, key }) => {
        displayComparisonHistoryChart(canvas, key, analyses);
    });
}

// ==========================================
// Historical metric charts
// ==========================================
function displayComparisonHistoryChart(canvasId, key, analyses) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = comparisonColors();
    const histories = analyses.map(a => a.quant_analysis.history);

    const years = [
        ...new Set(histories.flatMap(h => h.years))
    ].sort();

    const datasets = histories.map((h, i) => {
        const byYear = Object.fromEntries(
            h.years.map((y, idx) => [y, h[key]?.[idx] ?? null])
        );

        return {
            label: analyses[i].quant_analysis.ticker,
            data: years.map(y => byYear[y] ?? null),
            borderColor: colors[i],
            backgroundColor: colors[i],
            tension: 0.25,
            spanGaps: true,
        };
    });

    comparisonCharts[canvasId]?.destroy();

    comparisonCharts[canvasId] = new Chart(canvas, {
        type: "line",
        data: {
            labels: years,
            datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        },
    });
}

// ==========================================
// Price chart
// Rebased to percentage change over selected period
// ==========================================
function displayComparisonPriceChart(analyses, period = "1y") {
    const canvas = document.getElementById("comparison-price-chart");
    if (!canvas) return;

    const colors = comparisonColors();
    const years = period === "5y" ? 5 : 1;

    const datasets = analyses.map((a, i) => {
        const candles = (
            a.historical_data ??
            a.quant_analysis.historical_data ??
            []
        ).filter(c => c.c > 0);

        if (!candles.length) {
            return {
                label: a.quant_analysis.ticker,
                data: [],
                borderColor: colors[i],
                pointRadius: 0,
                borderWidth: 1.5,
            };
        }

        const cutoff = candles[candles.length - 1].t - years * 365 * 86400;

        const priceWindow = candles.filter(c => c.t >= cutoff);
        const base = priceWindow[0]?.c;

        return {
            label: a.quant_analysis.ticker,
            data: base
                ? priceWindow.map(c => ({
                    x: c.t * 1000,
                    y: (c.c / base - 1) * 100
                }))
                : [],
            borderColor: colors[i],
            pointRadius: 0,
            borderWidth: 1.5,
        };
    });

    comparisonCharts["comparison-price-chart"]?.destroy();

    comparisonCharts["comparison-price-chart"] = new Chart(canvas, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            parsing: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                x: {
                    type: "linear",
                    ticks: {
                        callback: v =>
                            new Date(v).toLocaleDateString(undefined, {
                                month: "short",
                                year: "2-digit"
                            })
                    },
                },
                y: {
                    ticks: {
                        callback: v => `${v.toFixed(0)}%`
                    }
                },
            },
            plugins: {
                legend: { display: false }
            },
        },
    });
}

// ==========================================
// Price chart period buttons
// ==========================================
document.querySelectorAll(".comparison-price-chart-period").forEach(button => {
    button.addEventListener("click", () => {
        selectedComparisonPricePeriod = button.dataset.period;

        document.querySelectorAll(".comparison-price-chart-period").forEach(btn => {
            btn.classList.toggle(
                "active",
                btn.dataset.period === selectedComparisonPricePeriod
            );
        });

        if (window.currentComparison) {
            displayComparisonPriceChart(
                window.currentComparison,
                selectedComparisonPricePeriod
            );
        }
    });
});

// ==========================================
// Exit comparison mode
// ==========================================
exitComparisonButton.addEventListener("click", () => {
    selectedAnalyses.clear();

    document.body.classList.remove("comparison-mode");

    normalView.classList.remove("is-hidden");
    comparisonView.classList.add("is-hidden");

    window.currentComparison = null;

    watchlistComparisonSelection(false);
});
