
// ==========================================================================
// DCF assumption explanations
//
// Calculation inputs -> weights -> contributions -> preview result -> usage
//
// The explanation panel always displays the Base scenario.
// Calculation-input edits are stored locally in `custom`.
// The preview updates immediately.
// The actual DCF valuation remains unchanged until recalculation.
// ==========================================================================


// ---------- Panel helpers ----------

function openAssumptionExplanation(title, content) {
    const panel = document.querySelector("#assumption-explanation-panel");
    const titleElement = document.querySelector("#assumption-explanation-title");
    const contentElement = document.querySelector("#assumption-explanation-content");

    if (!panel || !titleElement || !contentElement) {
        console.error("Assumption explanation panel elements not found.");
        return;
    }

    titleElement.textContent = title;
    contentElement.innerHTML = content;
    panel.classList.remove("is-hidden");
}


function closeAssumptionExplanation() {
    const panel = document.querySelector("#assumption-explanation-panel");

    if (!panel) {
        console.error("Assumption explanation panel not found.");
        return;
    }

    panel.classList.add("is-hidden");
}


// ---------- Accordion ----------

const ASSUMPTION_EXPLAINERS = {
    revenue_growth: data => explainWeightedAverage("revenue_growth", data),
    operating_margin: data => explainWeightedAverage("operating_margin", data),
    tax_rate: data => explainWeightedAverage("tax_rate", data),
    da_rate: data => explainWeightedAverage("da_rate", data),
    capex_rate: data => explainWeightedAverage("capex_rate", data),
    nwc_rate: data => explainWeightedAverage("nwc_rate", data),
    wacc: explainWacc,
    terminal_growth: explainTerminalGrowth
};


// Apply the current edit state to an explanation.
function applyCalculationEditMode(explanation, isEditing) {
    explanation.querySelectorAll(".dcf-calculation-value").forEach(element => {
        element.classList.toggle("is-hidden", isEditing);
    });

    explanation.querySelectorAll(".dcf-calculation-input").forEach(element => {
        element.classList.toggle("is-hidden", !isEditing);
    });
}


// Called by the main Edit assumptions button.
function setDcfCalculationEditMode(container, isEditing) {
    if (!container) return;

    container.classList.toggle("is-editing", isEditing);

    container.querySelectorAll(".dcf-assumption-explanation").forEach(explanation => {
        applyCalculationEditMode(explanation, isEditing);
    });
}


function setupDcfAssumptionAccordion() {
    const container = document.querySelector("#dcf-assumptions-section");

    if (!container || container.dataset.accordionReady) return;

    container.dataset.accordionReady = "true";

    container.addEventListener("click", event => {
        const row = event.target.closest(".dcf-assumption");

        if (!row) return;

        // Do not toggle the accordion when interacting with an input.
        if (event.target.closest("input")) return;

        const assumptionContainer = row.closest(".dcf-assumption-container");
        const toggle = row.querySelector(".dcf-assumption-toggle");

        if (!assumptionContainer || !toggle) return;

        const assumptionKey = toggle.dataset.assumption;

        const explanation = assumptionContainer.querySelector(
            `[data-explanation="${assumptionKey}"]`
        );

        if (!explanation) return;

        const isOpening = explanation.classList.contains("is-hidden");

        if (isOpening) {
            const baseScenarioData = currentQuantAnalysis?.dcf?.scenarios?.base;

            if (!baseScenarioData) {
                console.error("Base scenario data is unavailable.");
                return;
            }

            const explain = ASSUMPTION_EXPLAINERS[assumptionKey];

            if (explain) {
                explanation.innerHTML = explain(baseScenarioData);

                // Newly generated explanations inherit the current edit state.
                applyCalculationEditMode(
                    explanation,
                    container.classList.contains("is-editing")
                );
            }
        }

        explanation.classList.toggle("is-hidden");
        assumptionContainer.classList.toggle("is-expanded");
    });

    setupDcfCalculationInputEditing();
}


// ---------- Formatting ----------

const explainIsNum = value =>
    typeof value === "number" && Number.isFinite(value);


const explainFmt = {
    missing: "—",

    percent: (value, digits = 2) =>
        explainIsNum(value)
            ? `${(value * 100).toFixed(digits)}%`
            : explainFmt.missing,

    weight: value =>
        explainIsNum(value)
            ? `${parseFloat((value * 100).toFixed(1))}%`
            : explainFmt.missing,

    number: value =>
        explainIsNum(value) ? value.toFixed(2) : explainFmt.missing,

    money: value =>
        explainIsNum(value)
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 2
            }).format(value)
            : explainFmt.missing
};


// ---------- Flow layout helpers ----------

function flowRow(label, cells = [], { className = "", input = "" } = {}) {
    const inputAttr = input ? ` data-input="${input}"` : "";

    const cellsHtml = cells.map(cell =>
        typeof cell === "string"
            ? `<span>${cell}</span>`
            : `<span data-field="${cell.field}">${cell.text}</span>`
    ).join("");

    return `
        <div class="assumption-flow-row ${className}"${inputAttr}>
            <span>${label}</span>${cellsHtml}
        </div>
    `;
}


// Row whose value is missing is flagged, so the exact gap is visible.
function flowValueRow(label, value, format, { className = "", input = "" } = {}) {
    const missing = !explainIsNum(value);

    return flowRow(label, [format(value)], {
        className: `${className} ${missing ? "is-missing" : ""}`.trim(),
        input
    });
}


// One-line note naming what is missing and what happens because of it.
function flowMissingNote({ inputs = [], result, consequence = "" }) {
    const missing = inputs.filter(item => !explainIsNum(item.value))
        .map(item => item.label);

    let text = "";

    if (missing.length > 0) {
        text = `Missing: ${missing.join(", ")}`;
    } else if (result !== undefined && !explainIsNum(result)) {
        text = "Result unavailable";
    }

    if (!text) return "";

    return flowRow(
        consequence ? `${text} — ${consequence}` : text,
        [],
        { className: "is-missing is-note" }
    );
}


function flowStep({ title = "", formula = "", cols = 1, head = null, rows }) {
    return `
        <div class="assumption-flow-step" style="--cols: ${cols}">
            ${title ? `
                <div class="assumption-flow-title">
                    <span>${title}</span>
                    ${formula ? `<code>${formula}</code>` : ""}
                </div>
            ` : ""}
            ${head ? flowRow(head[0], head.slice(1), { className: "is-head" }) : ""}
            ${rows.join("")}
        </div>
    `;
}


function flowUsage(formula) {
    return `
        <div class="assumption-flow-usage">
            <span>Used in</span>
            <code>${formula}</code>
        </div>
    `;
}


function flowShell(assumptionKey, body) {
    return `
        <div class="assumption-explanation-content"
             data-assumption="${assumptionKey}"
             data-scenario="base">
            <div class="assumption-flow-scope">Base case</div>
            ${body}
        </div>
    `;
}


const FLOW_DEFAULT_BADGE =
    `<span class="dcf-assumption-status is-default">Default</span>`;


// ---------- Weighted-average assumptions ----------

const STANDARD_HISTORY_INPUTS = [
    { key: "6y_average", label: "6Y average" },
    { key: "3y_average", label: "3Y average" },
    { key: "latest", label: "Latest year" }
];


const WEIGHTED_AVERAGE_ASSUMPTIONS = {
    revenue_growth: {
        label: "Revenue growth",
        symbol: "g",
        inputs: [
            { key: "5y_cagr", label: "5Y CAGR" },
            { key: "3y_cagr", label: "3Y CAGR" },
            { key: "yoy_growth", label: "TTM YoY" }
        ],
        equalWeights: true,
        usage: r => `Revenue(t) = Revenue(t−1) × (1 + ${r})`
    },

    operating_margin: {
        label: "Operating margin",
        symbol: "margin",
        inputs: STANDARD_HISTORY_INPUTS,
        usage: r => `EBIT = Revenue × ${r}`
    },

    tax_rate: {
        label: "Tax rate",
        symbol: "t",
        inputs: STANDARD_HISTORY_INPUTS,
        usage: r => `NOPAT = EBIT × (1 − ${r})`
    },

    da_rate: {
        label: "D&A / Revenue",
        symbol: "d",
        inputs: STANDARD_HISTORY_INPUTS,
        usage: r => `D&A = Revenue × ${r}  (added back to NOPAT)`
    },

    capex_rate: {
        label: "CapEx / Revenue",
        symbol: "c",
        inputs: STANDARD_HISTORY_INPUTS,
        usage: r => `CapEx = Revenue × ${r}  (deducted from FCFF)`
    },

    nwc_rate: {
        label: "NWC / Revenue",
        symbol: "n",
        inputs: STANDARD_HISTORY_INPUTS,
        usage: r => `NWC = Revenue × ${r}  →  ΔNWC = NWC(t) − NWC(t−1)`
    }
};


// Returns the effective value of an individual calculation input.
function getEffectiveInputValue(input) {
    if (!input) return null;

    return input.custom !== null && input.custom !== undefined
        ? input.custom
        : input.calculated;
}


function explainWeightedSum(rows) {
    const contributions = rows
        .map(row => row.contribution)
        .filter(explainIsNum);

    return contributions.length > 0
        ? contributions.reduce((sum, value) => sum + value, 0)
        : null;
}


// ---------- Build weighted-average model ----------

function buildWeightedAverageModel(assumptionKey, scenarioData) {
    const config = WEIGHTED_AVERAGE_ASSUMPTIONS[assumptionKey];

    const section =
        scenarioData.assumptions?.forecast_assumptions?.[assumptionKey] ?? {};

    const inputs = section.inputs ?? {};
    const weights = inputs.weights ?? {};

    const availableCount = config.inputs.filter(input =>
        explainIsNum(inputs[input.key]?.calculated)
    ).length;

    const rows = config.inputs.map(input => {
        const inputData = inputs[input.key] ?? {};
        const weightData = weights[input.key] ?? {};

        const calculatedValue = inputData.calculated;
        const displayedValue = getEffectiveInputValue(inputData);

        const calculatedWeight = config.equalWeights
            ? (
                explainIsNum(calculatedValue) && availableCount > 0
                    ? 1 / availableCount
                    : null
            )
            : weightData.calculated;

        const customWeight = weightData.custom;

        const weight = getEffectiveInputValue({
            calculated: calculatedWeight,
            custom: customWeight
        });

        return {
            key: input.key,
            label: input.label,
            value: displayedValue,
            calculatedValue,
            custom: inputData.custom,
            calculatedWeight,
            customWeight,
            weight,
            contribution: null
        };
    });

    // Calculate contributions using effective values and weights.
    rows.forEach(row => {
        const calculationValue = getEffectiveInputValue({
            calculated: row.calculatedValue,
            custom: row.custom
        });

        const calculationWeight = getEffectiveInputValue({
            calculated: row.calculatedWeight,
            custom: row.customWeight
        });

        row.contribution =
            explainIsNum(calculationValue) &&
            explainIsNum(calculationWeight)
                ? calculationValue * calculationWeight
                : null;
    });

    const calculated = section.calculated;
    const computed = explainWeightedSum(rows);

    return {
        key: assumptionKey,
        label: config.label,
        symbol: config.symbol,
        usage: config.usage,
        rows,
        computed,
        result: explainIsNum(computed) ? computed : calculated,
        equalWeights: Boolean(config.equalWeights),
        isDefault: Object.hasOwn(
            scenarioData.defaults_used || {},
            assumptionKey
        )
    };
}


// ---------- Displayed assumption values ----------

// Mirrors the backend's Bear/Bull adjustments applied to the Base value.
const SCENARIO_ADJUSTMENTS = {
    bear: {
        revenue_growth: -0.03,
        operating_margin: -0.025,
        capex_rate: 0.01,
        terminal_growth: -0.005
    },
    base: {
        terminal_growth: 0
    },
    bull: {
        revenue_growth: 0.03,
        operating_margin: 0.025,
        capex_rate: -0.01,
        terminal_growth: 0.005
    }
};


// Value stored in the data (forecast override > custom > scenario > calculated).
function getStoredAssumptionValue(scenarioData, assumptionKey) {
    const assumptions = scenarioData.assumptions ?? {};

    if (["wacc", "terminal_growth"].includes(assumptionKey)) {
        return assumptions[assumptionKey];
    }

    const section = assumptions.forecast_assumptions?.[assumptionKey];

    return (
        section?.custom ??
        section?.forecast ??
        (section?.scenario_is_custom ? section?.scenario_value : null) ??
        section?.scenario_value ??
        section?.calculated
    );
}


function isScenarioAssumptionCustom(scenarioData, assumptionKey) {
    const section =
        scenarioData.assumptions?.forecast_assumptions?.[assumptionKey];

    return Boolean(section?.scenario_is_custom) ||
        Object.hasOwn(scenarioData.custom_assumptions || {}, assumptionKey);
}


// True when the user changed any underlying input or weight of this assumption.
function hasCalculationEdits(assumptionKey) {
    const base = currentQuantAnalysis?.dcf?.scenarios?.base;
    const inputs =
        base?.assumptions?.forecast_assumptions?.[assumptionKey]?.inputs;

    if (!inputs) return false;

    const isSet = item => item?.custom !== null && item?.custom !== undefined;

    return Object.entries(inputs).some(([key, item]) =>
        key === "weights"
            ? Object.values(item ?? {}).some(isSet)
            : isSet(item)
    );
}


// Bear/Base/Bull values implied by edited inputs, or null when nothing is edited.
function getAssumptionPreviewValues(assumptionKey) {
    const scenarios = currentQuantAnalysis?.dcf?.scenarios;

    if (!scenarios?.base || !WEIGHTED_AVERAGE_ASSUMPTIONS[assumptionKey]) {
        return null;
    }

    if (!hasCalculationEdits(assumptionKey)) return null;

    const model = buildWeightedAverageModel(assumptionKey, scenarios.base);

    if (!explainIsNum(model.result)) return null;

    const baseValue = model.result;

    if (!explainIsNum(baseValue)) return null;

    const values = {};

    for (const scenarioKey of ["bear", "base", "bull"]) {
        const scenarioData = scenarios[scenarioKey];

        let value = isScenarioAssumptionCustom(scenarioData, assumptionKey)
            ? getStoredAssumptionValue(scenarioData, assumptionKey)
            : baseValue + (SCENARIO_ADJUSTMENTS[scenarioKey][assumptionKey] ?? 0);

        if (assumptionKey === "capex_rate" && explainIsNum(value)) {
            value = Math.max(0, value);
        }

        values[scenarioKey] = value;
    }

    return values;
}



function getDisplayedAssumptionValue(assumptionKey, scenarioKey) {
    const scenarioData =
        currentQuantAnalysis?.dcf?.scenarios?.[scenarioKey];

    if (!scenarioData) return null;

    // Shared terminal growth with scenario-specific overrides.
    if (assumptionKey === "terminal_growth") {
        const terminalGrowthInput =
            currentQuantAnalysis.dcf.terminal_growth_input;

        const sharedGrowth =
            terminalGrowthInput?.custom ??
            terminalGrowthInput?.calculated;

        const customGrowth =
            scenarioData.custom_assumptions?.terminal_growth;

        if (explainIsNum(customGrowth)) {
            return customGrowth;
        }

        if (!explainIsNum(sharedGrowth)) return null;

        return sharedGrowth +
            (SCENARIO_ADJUSTMENTS[scenarioKey]?.terminal_growth ?? 0);
    }

    const preview = getAssumptionPreviewValues(assumptionKey);

    if (preview && explainIsNum(preview[scenarioKey])) {
        return preview[scenarioKey];
    }

    // Use the freshly calculated weighted result when no custom
    // calculation inputs remain.
    if (WEIGHTED_AVERAGE_ASSUMPTIONS[assumptionKey]) {
        const model = buildWeightedAverageModel(
            assumptionKey,
            currentQuantAnalysis.dcf.scenarios.base
        );

        if (explainIsNum(model.result)) {
            const baseValue = isScenarioAssumptionCustom(
                currentQuantAnalysis.dcf.scenarios.base,
                assumptionKey
            )
                ? getStoredAssumptionValue(
                    currentQuantAnalysis.dcf.scenarios.base,
                    assumptionKey
                )
                : model.result;

            if (explainIsNum(baseValue)) {
                let value = isScenarioAssumptionCustom(
                    scenarioData,
                    assumptionKey
                )
                    ? getStoredAssumptionValue(scenarioData, assumptionKey)
                    : baseValue +
                      (SCENARIO_ADJUSTMENTS[scenarioKey][assumptionKey] ?? 0);

                if (assumptionKey === "capex_rate") {
                    value = Math.max(0, value);
                }

                return value;
            }
        }
    }

    return getStoredAssumptionValue(scenarioData, assumptionKey);
}




// ---------- Saving manual values (table and panels) ----------

const DIRECT_ASSUMPTIONS = ["wacc", "terminal_growth"];


// `decimals` is the precision the user could see when typing the value.
function saveAssumptionValue(scenarioKey, assumptionKey, newValue, decimals = 1) {
    const scenarioData = currentQuantAnalysis?.dcf?.scenarios?.[scenarioKey];

    if (!scenarioData || !explainIsNum(newValue)) return;

    const assumptions = scenarioData.assumptions;
    const isDirect = DIRECT_ASSUMPTIONS.includes(assumptionKey);
    const section = assumptions.forecast_assumptions?.[assumptionKey];

    if (!isDirect && !section) return;

    const currentValue = isDirect
        ? assumptions[assumptionKey]
        : (section.calculated ?? section.forecast);

    scenarioData.custom_assumptions ||= {};
    scenarioData.original_assumptions ||= {};

    if (!Object.hasOwn(scenarioData.original_assumptions, assumptionKey)) {
        scenarioData.original_assumptions[assumptionKey] = currentValue;
    }

    const originalValue = Number(
        (scenarioData.original_assumptions[assumptionKey] * 100).toFixed(decimals)
    ) / 100;

    const isOriginal = newValue === originalValue;

    const storedValue = isOriginal
        ? scenarioData.original_assumptions[assumptionKey]
        : newValue;

    if (isDirect) {
        assumptions[assumptionKey] = storedValue;
    } else {
        section.custom = isOriginal ? null : newValue;
    }

    if (isOriginal) {
        delete scenarioData.custom_assumptions[assumptionKey];
        delete scenarioData.original_assumptions[assumptionKey];
    } else {
        scenarioData.custom_assumptions[assumptionKey] = newValue;
    }
}


// Puts back the value from before the first edit (no-op when never edited).
function restoreAssumptionValue(scenarioKey, assumptionKey) {
    const scenarioData = currentQuantAnalysis?.dcf?.scenarios?.[scenarioKey];
    const originals = scenarioData?.original_assumptions;

    if (!originals || !Object.hasOwn(originals, assumptionKey)) return;

    if (DIRECT_ASSUMPTIONS.includes(assumptionKey)) {
        scenarioData.assumptions[assumptionKey] = originals[assumptionKey];
    } else {
        const section =
            scenarioData.assumptions.forecast_assumptions?.[assumptionKey];

        if (section) section.forecast = originals[assumptionKey];
    }

    delete scenarioData.custom_assumptions?.[assumptionKey];
    delete originals[assumptionKey];
}


// Default / Custom badges of a table cell.
function assumptionStatusBadges(scenarioData, assumptionKey) {
    const defaultsUsed = scenarioData.defaults_used || {};

    const isDirect = DIRECT_ASSUMPTIONS.includes(assumptionKey);

    const section = scenarioData.assumptions
        ?.forecast_assumptions?.[assumptionKey];

    const isCustom = isDirect
        ? Object.hasOwn(scenarioData.custom_assumptions || {}, assumptionKey)
        : section?.custom !== null && section?.custom !== undefined;

    const isDefault = Object.hasOwn(defaultsUsed, assumptionKey) && !isCustom;

    return `${isDefault ? `
        <span class="dcf-assumption-status is-default"
            title="Default value used: ${(defaultsUsed[assumptionKey] * 100).toFixed(1)}%">
            Default
        </span>
    ` : ""}${isCustom ? `
        <span class="dcf-assumption-status is-custom">
            Custom
        </span>
    ` : ""}`;
}


// Re-sync one table cell (text, input and badges) without redrawing the table,
// so values typed in other cells while editing are not lost.
function refreshAssumptionCell(assumptionKey, scenarioKey) {
    const container = document.querySelector("#dcf-assumptions-section");
    const scenarioData = currentQuantAnalysis?.dcf?.scenarios?.[scenarioKey];

    if (!container || !scenarioData) return;

    const value = getDisplayedAssumptionValue(assumptionKey, scenarioKey);
    const selector =
        `[data-assumption="${assumptionKey}"][data-scenario="${scenarioKey}"]`;

    const display = container.querySelector(`.assumption-display${selector}`);
    const field = container.querySelector(`.assumption-input${selector}`);

    if (display) {
        display.textContent = explainIsNum(value)
            ? `${(value * 100).toFixed(1)}%`
            : "Not available";
    }

    if (field) {
        const text = explainIsNum(value) ? (value * 100).toFixed(1) : "";
        field.value = text;
        field.defaultValue = text;
    }

    const cell = (display ?? field)?.closest(".dcf-assumption-value");

    if (cell) {
        cell.querySelectorAll(".dcf-assumption-status").forEach(badge => badge.remove());
        cell.insertAdjacentHTML(
            "beforeend",
            assumptionStatusBadges(scenarioData, assumptionKey)
        );
    }
}


// Rebuild every open explanation panel (WACC feeds the terminal-growth spread,
// so both must refresh together). Keeps the current edit mode.
function refreshOpenExplanations(container) {
    const scenarioData = currentQuantAnalysis?.dcf?.scenarios?.base;

    if (!container || !scenarioData) return;

    const isEditing = container.classList.contains("is-editing");

    container
        .querySelectorAll(".dcf-assumption-explanation:not(.is-hidden)")
        .forEach(panel => {
            const explain = ASSUMPTION_EXPLAINERS[panel.dataset.explanation];

            if (!explain) return;

            panel.innerHTML = explain(scenarioData);
            applyCalculationEditMode(panel, isEditing);
        });
}


// ---------- Update DCF assumptions ----------


function updateDcfAssumptionPreviews(assumptionKey) {
    const container = document.querySelector("#dcf-assumptions-section");

    if (!container || !currentQuantAnalysis?.dcf?.scenarios) return;

    const keys = assumptionKey
        ? [assumptionKey]
        : [
            ...Object.keys(WEIGHTED_AVERAGE_ASSUMPTIONS),
            "terminal_growth"
        ];

    for (const key of keys) {
        for (const scenarioKey of ["bear", "base", "bull"]) {
            let value;

            if (key === "terminal_growth") {
                const terminalGrowthInput =
                    currentQuantAnalysis.dcf.terminal_growth_input;

                const sharedGrowth =
                    terminalGrowthInput?.custom ??
                    terminalGrowthInput?.calculated;

                const scenarioData =
                    currentQuantAnalysis.dcf.scenarios[scenarioKey];

                const customGrowth =
                    scenarioData.custom_assumptions?.terminal_growth;

                const adjustment = {
                    bear: -0.005,
                    base: 0,
                    bull: 0.005
                }[scenarioKey];

                value = explainIsNum(customGrowth)
                    ? customGrowth
                    : explainIsNum(sharedGrowth)
                        ? sharedGrowth + adjustment
                        : null;
            } else {
                value = getDisplayedAssumptionValue(key, scenarioKey);
            }

            const selector =
                `[data-assumption="${key}"][data-scenario="${scenarioKey}"]`;

            const display = container.querySelector(
                `.assumption-display${selector}`
            );

            if (display) {
                display.textContent = explainIsNum(value)
                    ? `${(value * 100).toFixed(1)}%`
                    : "Not available";
            }

            const field = container.querySelector(
                `.assumption-input${selector}`
            );

            // Leave inputs the user is typing in untouched.
            if (field && field.value === field.defaultValue) {
                const text = explainIsNum(value)
                    ? (value * 100).toFixed(1)
                    : "";

                field.value = text;
                field.defaultValue = text;
            }
        }
    }
}


function getEffectiveWaccInput(inputs, key) {
    const assumption = inputs[key];

    if (!assumption) return null;

    return assumption.custom ?? assumption.calculated ?? null;
}


function recalculateWaccPreview() {
    const scenarios = currentQuantAnalysis?.dcf?.scenarios;

    if (!scenarios) return;

    const base = scenarios.base;
    const assumptions = base.assumptions;
    const inputs = assumptions.forecast_assumptions || {};
    const details = assumptions.wacc_details || {};

    const getValue = key =>
        getEffectiveWaccInput(inputs, key);

    const riskFreeRate = getValue("risk_free_rate");
    const beta = getValue("beta");
    const equityRiskPremium = getValue("equity_risk_premium");

    // Cost of equity: CAPM
    const calculatedCostOfEquity =
        [riskFreeRate, beta, equityRiskPremium].every(explainIsNum)
            ? riskFreeRate + beta * equityRiskPremium
            : null;

    const costOfEquity =
        inputs.cost_of_equity?.custom ?? calculatedCostOfEquity;

    // Average debt
    const currentDebt = getValue("current_debt");
    const previousDebt = getValue("previous_debt");

    const calculatedAverageDebt =
        explainIsNum(currentDebt)
            ? explainIsNum(previousDebt)
                ? (currentDebt + previousDebt) / 2
                : currentDebt
            : null;

    const averageDebt =
        inputs.average_debt?.custom ?? calculatedAverageDebt;

    // Cost of debt
    const interestExpense = getValue("interest_expense");

    const calculatedCostOfDebt =
        explainIsNum(interestExpense) &&
        explainIsNum(averageDebt) &&
        averageDebt > 0
            ? Math.abs(interestExpense) / averageDebt
            : null;

    const costOfDebt =
        inputs.cost_of_debt?.custom ?? calculatedCostOfDebt;

    // Capital structure
    const marketCap = details.market_cap;
    const totalDebt = details.total_debt;
    const taxRate = getValue("tax_rate");

    let equityWeight = null;
    let debtWeight = null;
    let afterTaxCostOfDebt = null;
    let calculatedWacc = null;

    if (
        explainIsNum(marketCap) &&
        explainIsNum(totalDebt) &&
        marketCap > 0 &&
        totalDebt >= 0
    ) {
        const totalCapital = marketCap + totalDebt;

        if (totalCapital > 0) {
            equityWeight = marketCap / totalCapital;
            debtWeight = totalDebt / totalCapital;

            if (totalDebt === 0) {
                calculatedWacc = costOfEquity;
            } else if (
                explainIsNum(costOfEquity) &&
                explainIsNum(costOfDebt) &&
                explainIsNum(taxRate)
            ) {
                afterTaxCostOfDebt = costOfDebt * (1 - taxRate);

                calculatedWacc =
                    equityWeight * costOfEquity +
                    debtWeight * afterTaxCostOfDebt;
            }
        }
    }

    // Update derived calculation values used by the explanation.
    Object.assign(details, {
        risk_free_rate: riskFreeRate,
        beta,
        equity_risk_premium: equityRiskPremium,
        cost_of_equity: costOfEquity,
        current_debt: currentDebt,
        previous_debt: previousDebt,
        average_debt: averageDebt,
        interest_expense: interestExpense,
        cost_of_debt: costOfDebt,
        market_cap: marketCap,
        total_debt: totalDebt,
        tax_rate: taxRate,
        equity_weight: equityWeight,
        debt_weight: debtWeight,
        after_tax_cost_of_debt: afterTaxCostOfDebt,
        calculated_wacc: calculatedWacc
    });

    const derivedValues = {
        cost_of_equity: costOfEquity,
        average_debt: averageDebt,
        tax_rate: taxRate,
        cost_of_debt: costOfDebt,
        equity_weight: equityWeight,
        debt_weight: debtWeight,
        after_tax_cost_of_debt: afterTaxCostOfDebt,
        equity_contribution: (
            explainIsNum(equityWeight) && explainIsNum(costOfEquity)
                ? equityWeight * costOfEquity
                : null
        ),
        debt_contribution: (
            explainIsNum(debtWeight) && explainIsNum(afterTaxCostOfDebt)
                ? debtWeight * afterTaxCostOfDebt
                : null
        ),
        calculated_wacc: calculatedWacc
    };

    for (const [key, value] of Object.entries(derivedValues)) {
        inputs[key] ||= { calculated: null, custom: null };
        inputs[key].calculated = value;
    }

    // Propagate recalculated WACC assumptions to all scenarios.
    const adjustments = {
        bear: 0.015,
        base: 0,
        bull: -0.01
    };

    for (const [scenarioKey, adjustment] of Object.entries(adjustments)) {
        const scenario = scenarios[scenarioKey];

        if (!scenario) continue;

        const scenarioAssumptions = scenario.assumptions;

        // Update WACC calculation details.
        scenarioAssumptions.wacc_details ||= {};

        Object.assign(
            scenarioAssumptions.wacc_details,
            details
        );

        // Update calculated values without overwriting custom inputs.
        scenarioAssumptions.forecast_assumptions ||= {};

        const scenarioInputs = scenarioAssumptions.forecast_assumptions;

        for (const [key, value] of Object.entries(derivedValues)) {
            scenarioInputs[key] ||= {
                calculated: null,
                custom: null
            };

            scenarioInputs[key].calculated = value;
        }

        const hasCustomWacc =
            Object.hasOwn(scenario.custom_assumptions || {}, "wacc");

        const hasCalculatedWacc = explainIsNum(calculatedWacc);
        const defaultWacc = scenario.defaults_used?.wacc ?? 0.10;

        // Update WACC without overwriting a custom scenario value.
        if (!hasCustomWacc) {
            scenarioAssumptions.wacc = hasCalculatedWacc
                ? calculatedWacc + adjustment
                : defaultWacc + adjustment;
        }

        // Keep the default value available, but only flag it when active.
        scenario.defaults_used ||= {};

        if (hasCalculatedWacc) {
            delete scenario.defaults_used.wacc;
        } else {
            scenario.defaults_used.wacc = defaultWacc;
        }
    }

    // Refresh currently open explanation panels.
    refreshOpenExplanations(
        document.querySelector("#dcf-assumptions-section")
    );
}


// ---------- Render weighted-average explanation ----------

function renderCalculationInput(assumptionKey, inputKey, value, isCustom = false) {
    const displayValue = explainIsNum(value)
        ? explainFmt.percent(value)
        : explainFmt.missing;

    const inputValue = explainIsNum(value)
        ? (value * 100).toFixed(2)
        : "";

    const customBadge = isCustom
        ? '<span class="dcf-assumption-status is-custom">Custom</span>'
        : '';

    return `
        <span class="dcf-calculation-value">
            ${displayValue}
            ${customBadge}
        </span>
        <input
            type="number"
            class="dcf-calculation-input is-hidden"
            data-assumption="${assumptionKey}"
            data-input="${inputKey}"
            value="${inputValue}"
            step="0.01"
        >
    `;
}


function renderDirectAssumptionInput(
    assumptionKey,
    value,
    isCustom = false,
    kind = "direct"
) {
    const customBadge = isCustom
        ? '<span class="dcf-assumption-status is-custom">Custom</span>'
        : '';

    return `
        <span class="dcf-calculation-value">
            ${explainFmt.percent(value)}
            ${customBadge}
        </span>
        <input
            type="number"
            class="dcf-calculation-input is-hidden"
            data-assumption="${assumptionKey}"
            data-kind="${kind}"
            value="${explainIsNum(value) ? (value * 100).toFixed(2) : ""}"
            step="0.01"
        >
    `;
}


function renderWeightInput(assumptionKey, inputKey, row) {
    const value = row.weight;

    const customBadge =
        row.customWeight !== null && row.customWeight !== undefined
            ? '<span class="dcf-assumption-status is-custom">Custom</span>'
            : '';

    return `
        <span class="dcf-calculation-value">
            ${explainFmt.weight(value)}
            ${customBadge}
        </span>
        <input
            type="number"
            class="dcf-calculation-input is-hidden"
            data-assumption="${assumptionKey}"
            data-input="${inputKey}"
            data-kind="weight"
            value="${explainIsNum(value) ? (value * 100).toFixed(1) : ""}"
            step="0.1"
        >
    `;
}


function renderWeightedAverage(model) {
    const rowsHtml = model.rows.map(row => flowRow(
        row.label,
        [
            {
                field: "value",
                text: renderCalculationInput(
                    model.key,
                    row.key,
                    row.value,
                    row.custom !== null && row.custom !== undefined
                )
            },
            {
                field: "weight",
                text: renderWeightInput(
                    model.key,
                    row.key,
                    row
                )
            },
            {
                field: "contribution",
                text: explainFmt.percent(row.contribution)
            }
        ],
        {
            input: row.key,
            className: explainIsNum(row.calculatedValue) ? "" : "is-missing"
        }
    ));

    const weightSum = model.rows
        .filter(row => explainIsNum(row.contribution))
        .reduce((sum, row) => {
            return sum + (explainIsNum(row.weight) ? row.weight : 0);
        }, 0);

    const hasWeights = model.rows.some(row =>
        explainIsNum(row.contribution)
    );

    const missingNote = flowMissingNote({
        inputs: model.rows.map(row => ({ label: row.label, value: row.value })),
        consequence: model.equalWeights
            ? "excluded from the average"
            : "default value used"
    });

    if (missingNote) rowsHtml.push(missingNote);

    rowsHtml.push(flowRow(
        model.isDefault
            ? `${model.label} ${FLOW_DEFAULT_BADGE}`
            : model.label,
        [
            "",
            hasWeights ? explainFmt.weight(weightSum) : explainFmt.missing,
            explainFmt.percent(model.result)
        ],
        { className: "is-total" }
    ));

    const usageValue = explainIsNum(model.result)
        ? explainFmt.percent(model.result)
        : model.symbol;

    return flowShell(model.key, `
        ${flowStep({
            cols: 3,
            head: ["Input", "Value", "× Weight", "= Weighted"],
            rows: rowsHtml
        })}
        ${flowUsage(model.usage(usageValue))}
    `);
}


// ---------- Render WACC inputs ----------

function renderWaccInput(inputKey, inputData, format = "percent") {
    inputData ??= {
        calculated: null,
        custom: null
    };

    const value = getEffectiveInputValue(inputData);

    const isCustom =
        inputData.custom !== null &&
        inputData.custom !== undefined;

    let displayValue = explainFmt.missing;
    let inputValue = "";

    if (explainIsNum(value)) {
        if (format === "percent") {
            displayValue = explainFmt.percent(value);
            inputValue = (value * 100).toFixed(2);
        } else if (format === "money") {
            displayValue = explainFmt.money(value);
            inputValue = value;
        } else {
            displayValue = explainFmt.number(value);
            inputValue = value;
        }
    }

    const customBadge = isCustom
        ? '<span class="dcf-assumption-status is-custom">Custom</span>'
        : "";

    return `
        <span class="dcf-calculation-value">
            ${displayValue}
            ${customBadge}
        </span>
        <input
            type="number"
            class="dcf-calculation-input is-hidden"
            data-assumption="${inputKey}"
            data-kind="wacc"
            value="${inputValue}"
            step="${format === "percent" ? "0.01" : "any"}"
            placeholder="Enter value"
        >
    `;
}


// Creates a WACC assumption object if the backend did not provide one.
// All WACC values use the same calculated/custom structure.
function ensureWaccInput(inputs, key, calculatedValue = null) {
    if (!inputs[key]) {
        inputs[key] = {
            calculated: calculatedValue,
            custom: null
        };
    }

    return inputs[key];
}

function explainWeightedAverage(assumptionKey, scenarioData) {
    return renderWeightedAverage(
        buildWeightedAverageModel(assumptionKey, scenarioData)
    );
}


// ---------- Save calculation-input edits locally ----------


function setupDcfCalculationInputEditing() {
    const container = document.querySelector("#dcf-assumptions-section");

    if (!container || container.dataset.calculationEditingReady) return;

    container.dataset.calculationEditingReady = "true";

    container.addEventListener("change", event => {
        const input = event.target.closest(".dcf-calculation-input");

        if (!input) return;

        const scenarioData = currentQuantAnalysis?.dcf?.scenarios?.base;

        if (!scenarioData) {
            console.error("Base scenario data is unavailable.");
            return;
        }

        const assumptionKey = input.dataset.assumption;
        const inputKey = input.dataset.input;
        const kind = input.dataset.kind;

        // Shared terminal growth input.
        if (kind === "shared") {
            const terminalGrowthInput =
                currentQuantAnalysis.dcf.terminal_growth_input;

            if (!terminalGrowthInput) {
                console.error("Shared terminal growth input is unavailable.");
                return;
            }

            const value = input.value.trim() === ""
                ? null
                : Number(input.value) / 100;

            if (value !== null && !Number.isFinite(value)) return;

            const calculated = terminalGrowthInput.calculated;

            const isOriginalValue =
                value === null ||
                (
                    explainIsNum(calculated) &&
                    value.toFixed(4) === calculated.toFixed(4)
                );

            terminalGrowthInput.custom =
                isOriginalValue ? null : value;

            refreshOpenExplanations(container);
            return;
        }

        // WACC and other direct scenario assumptions.
        if (kind === "direct") {
            const directValue = input.value.trim() === ""
                ? null
                : Number(input.value) / 100;

            if (directValue !== null && !Number.isFinite(directValue)) return;

            if (directValue === null) {
                restoreAssumptionValue("base", assumptionKey);
            } else {
                saveAssumptionValue("base", assumptionKey, directValue, 2);
            }

            refreshAssumptionCell(assumptionKey, "base");
            refreshOpenExplanations(container);
            return;
        }

        // Every WACC component is stored in forecast_assumptions.
        if (kind === "wacc") {
            scenarioData.assumptions.forecast_assumptions ||= {};

            const forecastAssumptions =
                scenarioData.assumptions.forecast_assumptions;

            forecastAssumptions[assumptionKey] ??= {
                calculated: null,
                custom: null
            };

            const assumption = forecastAssumptions[assumptionKey];

            const percentKeys = [
                "risk_free_rate",
                "equity_risk_premium",
                "cost_of_debt",
                "tax_rate",
                "cost_of_equity",
                "equity_weight",
                "debt_weight",
                "equity_contribution",
                "after_tax_cost_of_debt",
                "debt_contribution",
                "calculated_wacc"
            ];

            const numberKeys = ["beta"];

            const format = percentKeys.includes(assumptionKey)
                ? "percent"
                : numberKeys.includes(assumptionKey)
                    ? "number"
                    : "money";

            let value = input.value.trim() === ""
                ? null
                : Number(input.value);

            if (value !== null && !Number.isFinite(value)) return;

            // Convert percentage points back to decimals.
            if (value !== null && format === "percent") {
                value /= 100;
            }

            // Compare against the original calculated value.
            const calculated = assumption.calculated;

            const isOriginalValue =
                value === null ||
                (
                    explainIsNum(calculated) &&
                    value === calculated
                );

            assumption.custom = isOriginalValue ? null : value;

            // Tax rate also affects the FCFF forecast.
            if (assumptionKey === "tax_rate") {
                updateDcfAssumptionPreviews("tax_rate");
            }

            refreshOpenExplanations(container);
            return;
        }

        // Existing weighted-average input editing.
        const assumption =
            scenarioData.assumptions?.forecast_assumptions?.[assumptionKey];

        if (!assumption) return;

        const value = input.value.trim() === ""
            ? null
            : Number(input.value) / 100;

        if (value !== null && !Number.isFinite(value)) return;

        // Get the original calculated value.
        let calculated;

        if (kind === "weight") {
            const model = buildWeightedAverageModel(
                assumptionKey,
                scenarioData
            );

            const row = model.rows.find(row => row.key === inputKey);

            calculated = row?.calculatedWeight;
        } else {
            calculated = assumption.inputs?.[inputKey]?.calculated;
        }

        // Compare at the precision displayed in the input.
        const decimals = kind === "weight" ? 1 : 2;

        const isOriginalValue =
            value === null ||
            (
                explainIsNum(calculated) &&
                value.toFixed(decimals + 2) ===
                    calculated.toFixed(decimals + 2)
            );

        assumption.inputs ??= {};

        if (kind === "weight") {
            assumption.inputs.weights ??= {};

            assumption.inputs.weights[inputKey] ??= {
                calculated: null,
                custom: null
            };

            assumption.inputs.weights[inputKey].custom =
                isOriginalValue ? null : value;

        } else {
            const calculationInput = assumption.inputs[inputKey];

            if (!calculationInput) return;

            calculationInput.custom =
                isOriginalValue ? null : value;
        }

        // Rebuild the current explanation.
        const explanation = input.closest(".dcf-assumption-explanation");

        if (!explanation) return;

        const explain = ASSUMPTION_EXPLAINERS[assumptionKey];

        if (!explain) return;

        explanation.innerHTML = explain(scenarioData);

        // Update Bear, Base and Bull previews.
        updateDcfAssumptionPreviews(assumptionKey);

        // Keep the newly rendered explanation in edit mode.
        applyCalculationEditMode(explanation, true);
    });
}


// ---------- WACC ----------

function explainWacc(scenarioData) {
    const fmt = explainFmt;
    const rawDetails = scenarioData.assumptions?.wacc_details;
    const details = rawDetails ?? {};

    // Primary storage for all editable WACC values.
    const inputs =
        scenarioData.assumptions?.forecast_assumptions ?? {};

    const defaultsUsed = scenarioData.defaults_used || {};
    const debtDetails = {
        ...details.cost_of_debt_details,
        interest_expense: details.interest_expense ?? details.cost_of_debt_details?.interest_expense,
        current_debt: details.current_debt ?? details.cost_of_debt_details?.current_debt,
        previous_debt: details.previous_debt ?? details.cost_of_debt_details?.previous_debt,
        average_debt: details.average_debt ?? details.cost_of_debt_details?.average_debt
    };
    const isDefault = Object.hasOwn(defaultsUsed, "wacc");

    const fallback = "WACC falls back to its default";

    // Calculated intermediate values.
    const afterTaxCostOfDebt =
        explainIsNum(details.cost_of_debt) && explainIsNum(details.tax_rate)
            ? details.cost_of_debt * (1 - details.tax_rate)
            : null;

    const equityContribution =
        explainIsNum(details.equity_weight) &&
        explainIsNum(details.cost_of_equity)
            ? details.equity_weight * details.cost_of_equity
            : null;

    const debtContribution = details.debt_weight === 0
        ? 0
        : (
            explainIsNum(details.debt_weight) &&
            explainIsNum(afterTaxCostOfDebt)
                ? details.debt_weight * afterTaxCostOfDebt
                : null
        );

    const usedWacc = scenarioData.assumptions?.wacc;

    const isCustomWacc = Object.hasOwn(
        scenarioData.custom_assumptions || {},
        "wacc"
    );

    // Ensure each editable WACC value has a storage object.
    const editableRow = (label, key, format = "percent", calculatedValue = null) => {
        const inputData = ensureWaccInput(inputs, key, calculatedValue);

        return flowRow(label, [
            {
                field: "value",
                text: renderWaccInput(key, inputData, format)
            }
        ]);
    };

    // Same as editableRow, but returns the input HTML directly.
    const editableValue = (key, format = "percent", calculatedValue = null) => {
        const inputData = ensureWaccInput(inputs, key, calculatedValue);

        return renderWaccInput(key, inputData, format);
    };


    // 1. Cost of equity
    const costOfEquityStep = flowStep({
        title: "1 · Cost of equity",
        formula: "Rf + β × ERP",
        rows: [
            editableRow(
                "Risk-free rate (Rf)",
                "risk_free_rate",
                "percent",
                details.risk_free_rate
            ),

            editableRow(
                "Beta (β)",
                "beta",
                "number",
                details.beta
            ),

            editableRow(
                "Equity risk premium (ERP)",
                "equity_risk_premium",
                "percent",
                details.equity_risk_premium
            ),

            flowMissingNote({
                inputs: [
                    { label: "Rf", value: details.risk_free_rate },
                    { label: "β", value: details.beta },
                    { label: "ERP", value: details.equity_risk_premium }
                ],
                result: details.cost_of_equity,
                consequence: fallback
            }),

            editableRow(
                "Cost of equity",
                "cost_of_equity",
                "percent",
                details.cost_of_equity
            )
        ].filter(Boolean)
    });


    // 2. Cost of debt
    const costOfDebtRows = [
        editableRow(
            "Interest expense",
            "interest_expense",
            "money",
            debtDetails.interest_expense
        ),

        editableRow(
            "Current debt",
            "current_debt",
            "money",
            debtDetails.current_debt
        ),

        editableRow(
            "Previous debt",
            "previous_debt",
            "money",
            debtDetails.previous_debt
        ),

        editableRow(
            "Average debt",
            "average_debt",
            "money",
            debtDetails.average_debt
        ),

        flowMissingNote({
            inputs: [
                { label: "interest expense", value: debtDetails.interest_expense },
                { label: "current debt", value: debtDetails.current_debt },
                { label: "previous debt", value: debtDetails.previous_debt },
                { label: "average debt", value: debtDetails.average_debt }
            ],
            result: details.cost_of_debt,
            consequence: fallback
        }),

        editableRow(
            "Cost of debt",
            "cost_of_debt",
            "percent",
            details.cost_of_debt
        )
    ].filter(Boolean);

    const costOfDebtStep = flowStep({
        title: "2 · Cost of debt",
        formula: "Interest ÷ average debt",
        rows: costOfDebtRows
    });


    // 3. Capital structure
    const capitalStructureStep = flowStep({
        title: "3 · Capital structure",
        formula: "E ÷ (E + D),  D ÷ (E + D)",
        rows: [
            editableRow(
                "Market capitalization (E)",
                "market_cap",
                "money",
                details.market_cap
            ),

            editableRow(
                "Total debt (D)",
                "total_debt",
                "money",
                details.total_debt
            ),

            flowMissingNote({
                inputs: [
                    { label: "market capitalization", value: details.market_cap },
                    { label: "total debt", value: details.total_debt }
                ],
                result: details.equity_weight,
                consequence: fallback
            }),

            editableRow(
                "Equity weight",
                "equity_weight",
                "percent",
                details.equity_weight
            ),

            editableRow(
                "Debt weight",
                "debt_weight",
                "percent",
                details.debt_weight
            )
        ].filter(Boolean)
    });


    // 4. WACC
    const waccRows = [
        flowRow("Tax rate (t)", [
            {
                field: "value",
                text: editableValue("tax_rate", "percent", details.tax_rate)
            }
        ], { className: "is-tax-rate" }),

        flowRow("Equity", [
            editableValue("equity_weight", "percent", details.equity_weight),
            editableValue("cost_of_equity", "percent", details.cost_of_equity),
            editableValue("equity_contribution", "percent", equityContribution)
        ]),

        flowRow("Debt, after tax", [
            editableValue("debt_weight", "percent", details.debt_weight),
            editableValue("after_tax_cost_of_debt", "percent", afterTaxCostOfDebt),
            editableValue("debt_contribution", "percent", debtContribution)
        ]),

        flowMissingNote({
            inputs: [
                { label: "tax rate", value: details.tax_rate },
                { label: "cost of equity", value: details.cost_of_equity },
                { label: "equity weight", value: details.equity_weight },
                { label: "after-tax cost of debt", value: afterTaxCostOfDebt },
                { label: "debt weight", value: details.debt_weight }
            ],
            consequence: fallback
        }),

        flowRow("Calculated WACC", [
            "",
            "",
            editableValue(
                "calculated_wacc",
                "percent",
                details.calculated_wacc
            )
        ], { className: "is-total" }),

        flowRow(
            isDefault && !isCustomWacc
                ? `WACC used in DCF ${FLOW_DEFAULT_BADGE}`
                : "WACC used in DCF",
            [
                "",
                "",
                renderDirectAssumptionInput("wacc", usedWacc, isCustomWacc)
            ],
            { className: "is-result", input: "wacc" }
        )
    ];

    for (let i = waccRows.length - 1; i >= 0; i--) {
        if (!waccRows[i]) waccRows.splice(i, 1);
    }

    if (!rawDetails) {
        waccRows.unshift(flowRow(
            "WACC details unavailable — " + fallback,
            [],
            { className: "is-missing is-note" }
        ));
    }

    const waccStep = flowStep({
        title: "4 · WACC",
        formula: "E% × Ke + D% × Kd × (1 − t)",
        cols: 3,
        head: ["", "Weight", "Cost", "Weighted"],
        rows: waccRows
    });

    const discountRate = explainIsNum(usedWacc)
        ? fmt.percent(usedWacc)
        : "WACC";

    return flowShell("wacc", `
        ${costOfEquityStep}
        ${costOfDebtStep}
        ${capitalStructureStep}
        ${waccStep}
        ${flowUsage(`Discount factor = 1 ÷ (1 + ${discountRate})<sup>t</sup>`)}
    `);
}


// ---------- Terminal growth ----------

function explainTerminalGrowth(scenarioData) {
    const fmt = explainFmt;

    const terminalGrowthInput =
        currentQuantAnalysis?.dcf?.terminal_growth_input;

    const growth =
        terminalGrowthInput?.custom ??
        terminalGrowthInput?.calculated;

    const wacc = scenarioData.assumptions?.wacc;

    const isCustomGrowth = explainIsNum(terminalGrowthInput?.custom);

    const spread =
        explainIsNum(growth) && explainIsNum(wacc)
            ? wacc - growth
            : null;

    const growthText = explainIsNum(growth)
        ? fmt.percent(growth)
        : "g";

    const waccText = explainIsNum(wacc)
        ? fmt.percent(wacc)
        : "WACC";

    return flowShell("terminal_growth", `
        ${flowStep({
            title: "Spread",
            formula: "WACC − g",
            rows: [
                flowRow("Terminal growth (g) — manual input", [
                    {
                        field: "value",
                        text: renderDirectAssumptionInput(
                            "terminal_growth",
                            growth,
                            isCustomGrowth,
                            "shared"
                        )
                    }
                ], { input: "terminal_growth" }),

                flowRow("WACC", [fmt.percent(wacc)]),

                flowRow("WACC − g", [fmt.percent(spread)], {
                    className: `is-total ${
                        explainIsNum(spread) && spread <= 0
                            ? "is-invalid"
                            : ""
                    }`
                })
            ]
        })}
        ${flowUsage(
            `Terminal value = FCFF<sub>N</sub> × (1 + ${growthText}) ÷ (${waccText} − ${growthText})`
        )}
    `);
}