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

    recalculateWaccPreview();

    container.dataset.selectedScenario = selectedScenario;

    container.innerHTML = `
        <div class="dcf-assumptions-title">
            <h3 class="section-heading">DCF Assumptions</h3>

            <div class="dcf-assumptions-actions">
                <button id="edit-dcf-assumptions" class="secondary-button">
                    Edit assumptions
                </button>

                <button id="recalculate-dcf" class="primary-button">
                    Recalculate DCF
                </button>

                <button id="reset-dcf-assumptions" class="secondary-button">
                    Reset assumptions
                </button>
            </div>
        </div>

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

                            const value = getDisplayedAssumptionValue(item.key, key);

                            const formattedValue =
                                value !== null && value !== undefined
                                    ? `${(value * 100).toFixed(1)}%`
                                    : "Not available";

                            return `
                                <div class="dcf-assumption-value">
                                    <span
                                        class="assumption-display"
                                        data-assumption="${item.key}"
                                        data-scenario="${key}"
                                    >
                                        ${formattedValue}
                                    </span>

                                    <input
                                        class="assumption-input is-hidden"
                                        type="number"
                                        step="0.1"
                                        value="${value !== null && value !== undefined ? (value * 100).toFixed(1) : ""}"
                                        data-assumption="${item.key}"
                                        data-scenario="${key}"
                                    >

                                    ${assumptionStatusBadges(scenarioData, item.key)}
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

    container.classList.remove("is-editing");
    
    setupDcfAssumptionAccordion();
    setupDcfAssumptionEditing();
    setupDcfCalculationInputReset();
    setupDcfRecalculation();
}


function setupDcfAssumptionEditing() {
    const button = document.querySelector("#edit-dcf-assumptions");
    const container = document.querySelector("#dcf-assumptions-section");

    if (!button || !container) return;

    const displays = container.querySelectorAll(".assumption-display");
    const inputs = container.querySelectorAll(".assumption-input");

    // Prevent input clicks from triggering the accordion
    inputs.forEach(input => {
        input.addEventListener("click", event => {
            event.stopPropagation();
        });
    });

    button.addEventListener("click", () => {
        const isEditing = button.textContent.trim() === "Done editing";

        // Save values when leaving edit mode
        if (isEditing) {
            let hasChanges = false;

            inputs.forEach(input => {
                if (input.value.trim() === "") return;

                // Untouched input: leave the stored value alone.
                if (input.value === input.defaultValue) return;

                const newValue = Number(input.value) / 100;

                if (!Number.isFinite(newValue)) return;

                const scenario = input.dataset.scenario;
                const assumption = input.dataset.assumption;

                saveAssumptionValue(scenario, assumption, newValue);
                hasChanges = true;
            });

            container.classList.remove("is-editing");

            // Remember which explanation panels are currently open
            const expandedAssumptions = [
                ...container.querySelectorAll(".dcf-assumption-explanation:not(.is-hidden)")
            ].map(panel => panel.dataset.explanation);

            // Re-render to update values and Custom indicators
            displayDcfAssumptions(container.dataset.selectedScenario);

            // Reopen the same explanation panels
            const newContainer = document.querySelector("#dcf-assumptions-section");

            if (hasChanges) markDirty();

            expandedAssumptions.forEach(key => {
                const toggle = newContainer.querySelector(
                    `.dcf-assumption-toggle[data-assumption="${key}"]`
                );

                toggle?.click();
            });

            return;
        }

        // Enter edit mode
        container.classList.add("is-editing");

        setDcfCalculationEditMode(container, true);

        displays.forEach(display => {
            display.classList.add("is-hidden");
        });

        inputs.forEach(input => {
            input.classList.remove("is-hidden");
        });

        button.textContent = "Done editing";
    });
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



function setupDcfCalculationInputReset() {
    const button = document.querySelector("#reset-dcf-assumptions");

    if (!button) return;

    button.addEventListener("click", () => {
        const confirmed = confirm(
            "Reset all custom DCF assumptions, calculation inputs and weights?"
        );

        if (!confirmed) return;

        const dcf = currentQuantAnalysis?.dcf;
        const scenarios = dcf?.scenarios;

        if (!scenarios) {
            console.error("DCF scenario data is unavailable.");
            return;
        }

        // Reset the shared terminal growth input.
        if (dcf.terminal_growth_input) {
            dcf.terminal_growth_input.custom = null;
        }

        for (const scenarioData of Object.values(scenarios)) {
            const assumptions = scenarioData.assumptions ?? {};
            const forecastAssumptions =
                assumptions.forecast_assumptions ?? {};
            const originals = scenarioData.original_assumptions ?? {};

            // Preserve independent scenario-level terminal growth overrides.
            const customTerminalGrowth =
                scenarioData.custom_assumptions?.terminal_growth;

            // 1. Restore original WACC values.
            if (Object.hasOwn(originals, "wacc")) {
                assumptions.wacc = originals.wacc;
            }

            // 2. Reset forecast assumptions and custom calculation inputs.
            for (const section of Object.values(forecastAssumptions)) {
                delete section.forecast;
                section.scenario_is_custom = false;
                section.custom = null;

                const inputs = section.inputs;

                if (!inputs) continue;

                for (const [key, input] of Object.entries(inputs)) {
                    if (key === "weights") continue;

                    if (input && typeof input === "object") {
                        input.custom = null;
                    }
                }

                for (const weight of Object.values(inputs.weights ?? {})) {
                    weight.custom = null;
                }
            }

            // 3. Clear other custom assumptions, retaining independent
            //    terminal growth overrides.
            scenarioData.custom_assumptions = {};

            if (explainIsNum(customTerminalGrowth)) {
                scenarioData.custom_assumptions.terminal_growth =
                    customTerminalGrowth;
            }

            scenarioData.original_assumptions = {};
        }

        // The reset modifies the current analysis.
        markDirty();

        // Re-render the table and reopen previously expanded explanations.
        const container = document.querySelector("#dcf-assumptions-section");

        const expandedAssumptions = container
            ? [
                ...container.querySelectorAll(
                    ".dcf-assumption-explanation:not(.is-hidden)"
                )
            ].map(panel => panel.dataset.explanation)
            : [];

        displayDcfAssumptions(container?.dataset.selectedScenario);

        const newContainer =
            document.querySelector("#dcf-assumptions-section");

        expandedAssumptions.forEach(key => {
            newContainer
                ?.querySelector(
                    `.dcf-assumption-toggle[data-assumption="${key}"]`
                )
                ?.click();
        });
    });
}


async function recalculateDcf() {
    const button = document.querySelector("#recalculate-dcf");
    const container = document.querySelector("#dcf-assumptions-section");

    if (!button || !container) return;

    // Make sure the user has saved their edits by leaving edit mode first.
    if (container.classList.contains("is-editing")) {
        alert("Finish editing your assumptions before recalculating.");
        return;
    }

    const ticker = currentQuantAnalysis.ticker;
    const selectedScenario = container.dataset.selectedScenario || "base";

    button.disabled = true;
    button.textContent = "Recalculating...";

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/company/${ticker}/recalculate-dcf`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    dcf: currentQuantAnalysis.dcf
                })
            }
        );

        if (!response.ok) {
            throw new Error("Unable to recalculate DCF.");
        }

        const data = await response.json();

        // Extract the recalculated DCF.
        const newDcf = data.dcf ?? data.quant_analysis.dcf;

        // Update only the DCF-related parts of the current analysis.
        currentQuantAnalysis.dcf = newDcf;

        currentQuantAnalysis.valuation[
            "Discounted Cash Flow (DCF) Valuation"
        ] = newDcf.intrinsic_value_per_share;

        // Recalculation modified the current analysis.
        markDirty();

        // Refresh the DCF UI.
        displayDcfScenarios();
        displayDcfForecastChart(selectedScenario);
        displayDcfAssumptions(selectedScenario);

        displayFcffForecast(
            newDcf.scenarios[selectedScenario]
        );

        displayDcfValuation(
            newDcf.scenarios[selectedScenario]
        );


    } catch (error) {
        console.error("DCF recalculation failed:", error);

        alert(
            isSaved
                ? "DCF recalculation or saving failed. Check the console for details."
                : "DCF recalculation failed. Check the console for details."
        );

    } finally {
        // The assumptions table may have been re-rendered,
        // so retrieve the new button rather than using the old reference.
        const newButton = document.querySelector("#recalculate-dcf");

        if (newButton) {
            newButton.disabled = false;
            newButton.textContent = "Recalculate DCF";
        }
    }
}


function setupDcfRecalculation() {
    const button = document.querySelector("#recalculate-dcf");

    if (!button) return;

    button.addEventListener("click", recalculateDcf);
}
