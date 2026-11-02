// ==========================================
// DCF
// ==========================================

function displayDcfScenarios() {
    const scenarios = currentQuantAnalysis.dcf.scenarios;
    const currentPrice = currentQuantAnalysis.profile.price;

    for (const scenario of ["bear", "base", "bull"]) {
        const intrinsicValue = scenarios[scenario].intrinsic_value_per_share;

        const valueElement = document.querySelector(`#dcf-${scenario}-value`);
        const comparisonElement = document.querySelector(`#dcf-${scenario}-comparison`);

        valueElement.textContent = `$${formatMetric(intrinsicValue)}`;

        const difference = ((intrinsicValue - currentPrice) / currentPrice) * 100;

        comparisonElement.classList.remove("positive", "negative");

        if (difference > 0) {
            comparisonElement.textContent = `${difference.toFixed(1)}% undervalued`;
            comparisonElement.classList.add("positive");
        } else if (difference < 0) {
            comparisonElement.textContent = `${Math.abs(difference).toFixed(1)}% overvalued`;
            comparisonElement.classList.add("negative");
        } else {
            comparisonElement.textContent = "Fairly valued";
        }
    }
}
function createHatchedPattern(context, baseColor, stripeColor) {
    const size = 12;

    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = size;
    patternCanvas.height = size;

    const patternContext = patternCanvas.getContext("2d");

    patternContext.fillStyle = baseColor;
    patternContext.fillRect(0, 0, size, size);

    patternContext.strokeStyle = stripeColor;
    patternContext.lineWidth = 1.5;

    patternContext.beginPath();

    // Main diagonal, corner to corner
    patternContext.moveTo(0, size);
    patternContext.lineTo(size, 0);

    // Corner pieces so the stripe continues into neighbouring tiles
    patternContext.moveTo(-size / 2, size / 2);
    patternContext.lineTo(size / 2, -size / 2);

    patternContext.moveTo(size / 2, size * 1.5);
    patternContext.lineTo(size * 1.5, size / 2);

    patternContext.stroke();

    return context.createPattern(patternCanvas, "repeat");
}
function displayDcfForecastChart(scenario) {
    const dcf = currentQuantAnalysis.dcf;
    const history = currentQuantAnalysis.history;

    const historicalFcff = dcf.historical_fcff;
    const forecast = dcf.scenarios[scenario].forecast;
    const bullForecast = dcf.scenarios.bull.forecast;

    const historicalYears = history.years.slice(1);
    const forecastYears = forecast.map(row => String(row.year));
    const allYears = [...historicalYears, ...forecastYears];
    const historicalCount = historicalYears.length;

    // Revenue data for selected scenario
    const revenueData = [
        ...history.revenue.slice(1).map(value => value / 1e9),
        ...forecast.map(row => row.revenue / 1e9)
    ];

    // Historical FCFF
    const historicalFcffValues = historicalYears.map(year => {
        const value = historicalFcff[year];
        return value !== undefined ? value / 1e9 : null;
    });

    // FCFF data for selected scenario
    const fcffData = [
        ...historicalFcffValues,
        ...forecast.map(row => row.fcff / 1e9)
    ];

    // Calculate fixed FCFF axis limits using all scenarios
    const allScenarioFcffValues = Object.values(dcf.scenarios)
        .flatMap(item => item.forecast.map(row => row.fcff / 1e9));

    const allFcffValues = [
        ...historicalFcffValues,
        ...allScenarioFcffValues
    ].filter(value => value !== null);

    const fcffMin = Math.min(0, ...allFcffValues);
    const fcffMax = Math.max(0, ...allFcffValues);

    // Add 20% extra space only at the top
    const fcffRange = fcffMax - fcffMin;
    const fcffPadding = fcffRange * 0.2;

    const adjustedFcffMin = fcffMin;
    const adjustedFcffMax = fcffMax + fcffPadding;

    // Bull case determines the fixed maximum revenue scale
    const revenueMax = Math.max(
        ...history.revenue.slice(1).map(value => value / 1e9),
        ...bullForecast.map(row => row.revenue / 1e9)
    );

    // Align the zero baselines of both axes
    const negativeRatio = Math.abs(adjustedFcffMin) /
        (adjustedFcffMax - adjustedFcffMin);

    const revenueMin = -(revenueMax * negativeRatio) /
        (1 - negativeRatio);

    const canvas = document.querySelector("#dcf-forecast-chart");
    const context = canvas.getContext("2d");

    // Create forecast patterns
    const revenueForecastPattern = createHatchedPattern(
        context,
        "#c8a45c",
        "rgb(0, 0, 0)"
    );

    const fcffForecastPattern = createHatchedPattern(
        context,
        "#5b9bd5",
        "rgb(0, 0, 0)"
    );

    // Solid for historical years, hatched for forecast years
    const revenueColors = allYears.map((_, i) =>
        i < historicalCount ? "#c8a45c" : revenueForecastPattern
    );

    const fcffColors = allYears.map((_, i) =>
        i < historicalCount ? "#5b9bd5" : fcffForecastPattern
    );

    if (dcfForecastChart) {
        dcfForecastChart.destroy();
    }

    dcfForecastChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: allYears,
            datasets: [
                {
                    label: "Revenue",
                    data: revenueData,
                    yAxisID: "y",
                    backgroundColor: revenueColors,
                    borderColor: "#c8a45c",
                    borderWidth: 0,
                    borderRadius: 4
                },
                {
                    label: "FCFF",
                    data: fcffData,
                    yAxisID: "y1",
                    backgroundColor: fcffColors,
                    borderColor: "#5b9bd5",
                    borderWidth: 0,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                x: {
                    stacked: false
                },
                y: {
                    type: "linear",
                    position: "left",
                    min: revenueMin,
                    max: revenueMax,
                    title: {
                        display: true,
                        text: "Revenue (USD billions)",
                        color: "#c8a45c"
                    },
                    ticks: {
                        color: "#b8b3a8",
                        callback: (value, index, ticks) => {
                            if (index === 0 || index === ticks.length - 1) {
                                return "";
                            }

                            return `$${value}B`;
                        }
                    },
                    grid: {
                        color: "#2a2926"
                    }
                },
                y1: {
                    type: "linear",
                    position: "right",
                    min: adjustedFcffMin,
                    max: adjustedFcffMax,
                    title: {
                        display: true,
                        text: "FCFF (USD billions)",
                        color: "#5b9bd5"
                    },
                    ticks: {
                        color: "#b8b3a8",
                        callback: (value, index, ticks) => {
                            if (index === 0 || index === ticks.length - 1) {
                                return "";
                            }

                            return `$${value}B`;
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    borderRadius: 4,
                    labels: {
                        color: "#eae7dffc",
                        font: {
                            size: 12
                        },
                        padding: 15,
                        generateLabels: (chart) => [
                            {
                                text: "Revenue",
                                fontColor: "#ebe7df",
                                fillStyle: "#c8a45c",
                                strokeStyle: "#c8a45c",
                                lineWidth: 0,
                                hidden: !chart.isDatasetVisible(0),
                                datasetIndex: 0
                            },
                            {
                                text: "FCFF",
                                fontColor: "#ebe7df",
                                fillStyle: "#5b9bd5",
                                strokeStyle: "#5b9bd5",
                                lineWidth: 0,
                                hidden: !chart.isDatasetVisible(1),
                                datasetIndex: 1
                            }
                        ]
                    }
                }
            }
        }
    });
}
function displayDcfAssumptions(selectedScenario) {
    const scenarios = currentQuantAnalysis.dcf.scenarios;
    const scenarioKeys = ["bear", "base", "bull"];

    const assumptionDefinitions = [
        { key: "revenue_growth", label: "Revenue growth" },
        { key: "operating_margin", label: "Operating margin" },
        { key: "tax_rate", label: "Tax rate" },
        { key: "da_rate", label: "D&A / Revenue" },
        { key: "capex_rate", label: "CapEx / Revenue" },
        { key: "nwc_rate", label: "NWC / Revenue" },
        { key: "wacc", label: "WACC" },
        { key: "terminal_growth", label: "Terminal growth" }
    ];

    const container = document.querySelector("#dcf-assumptions-section");

    if (!container) {
        console.error("DCF assumptions container not found.");
        return;
    }
    container.dataset.selectedScenario = selectedScenario;

    container.innerHTML = `
        <h3 class="section-heading">DCF Assumptions</h3>

        <div class="dcf-assumptions-grid selected-${selectedScenario}">
            <div class="dcf-assumptions-header">
                <span>Assumption</span>
                <span>Bear</span>
                <span>Base</span>
                <span>Bull</span>
            </div>

            ${assumptionDefinitions.map(item => `
                <div class="dcf-assumption-container">

                    <div class="dcf-assumption">
                        <div class="dcf-assumption-label">
                            <button class="dcf-assumption-toggle"
                                data-assumption="${item.key}">
                                <span>${item.label}</span>
                                <span class="dcf-assumption-chevron">⌄</span>
                            </button>
                        </div>

                        ${scenarioKeys.map(key => {
                            const scenarioData = scenarios[key];
                            const assumptions = scenarioData.assumptions;
                            const forecast = assumptions.forecast_assumptions || {};
                            const defaultsUsed = scenarioData.defaults_used || {};

                            const value = ["wacc", "terminal_growth"].includes(item.key)
                                ? assumptions[item.key]
                                : forecast[item.key]?.forecast;

                            const isDefault = Object.hasOwn(defaultsUsed, item.key);

                            const formattedValue =
                                value !== null && value !== undefined
                                    ? `${(value * 100).toFixed(1)}%`
                                    : "Not available";

                            return `
                                <div class="dcf-assumption-value">
                                    <span>${formattedValue}</span>

                                    ${isDefault ? `
                                        <span class="dcf-assumption-status is-default"
                                            title="Default value used: ${(defaultsUsed[item.key] * 100).toFixed(1)}%">
                                            Default
                                        </span>
                                    ` : ""}
                                </div>
                            `;
                        }).join("")}

                    </div>

                    <div class="dcf-assumption-explanation is-hidden"
                        data-explanation="${item.key}">
                    </div>

                </div>
            `).join("")}
        </div>
    `;

    setupDcfAssumptionAccordion();
}
function setupFcffCalculationAccordion() {
    const sections = [
        {
            toggle: "#dcf-fcff-calculation-section .fcff-section-toggle",
            content: "#dcf-fcff-calculation-content"
        },
        {
            toggle: "#dcf-valuation-calculation-section .fcff-section-toggle",
            content: "#dcf-valuation-calculation-content"
        }
    ];

    for (const section of sections) {
        const toggle = document.querySelector(section.toggle);
        const content = document.querySelector(section.content);

        if (!toggle || !content || toggle.dataset.initialized) continue;

        toggle.addEventListener("click", () => {
            toggle.classList.toggle("is-active");
            content.classList.toggle("is-hidden");
        });

        toggle.dataset.initialized = "true";
    }
}
function displayFcffForecast(scenarioData) {
    const container = document.querySelector("#dcf-fcff-calculation-content");

    if (!container) {
        console.error("FCFF calculation container not found.");
        return;
    }

    container.innerHTML = explainFcffForecast(scenarioData);
}
function displayDcfValuation(scenarioData) {
    const container = document.querySelector(
        "#dcf-valuation-calculation-content"
    );

    if (!container) {
        console.error("DCF valuation calculation container not found.");
        return;
    }

    container.innerHTML = explainDcfValuation(scenarioData);
}
