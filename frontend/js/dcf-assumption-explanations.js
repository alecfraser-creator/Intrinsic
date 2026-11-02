// Assumptions explanations 

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

function setupDcfAssumptionAccordion() {
    const container = document.querySelector("#dcf-assumptions-section");

    if (!container) return;

    // Prevent attaching the event listener multiple times
    if (container.dataset.accordionReady) return;

    container.dataset.accordionReady = "true";

    container.addEventListener("click", event => {
        const row = event.target.closest(".dcf-assumption");

        if (!row) return;

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
            const baseScenarioData = currentQuantAnalysis.dcf.scenarios.base;

            if (!baseScenarioData) {
                console.error("Base scenario data is unavailable.");
                return;
            }

            if (assumptionKey === "revenue_growth") {
                explanation.innerHTML = explainRevenueGrowth(baseScenarioData);

            } else if (assumptionKey === "operating_margin") {
                explanation.innerHTML = explainOperatingMargin(baseScenarioData);

            } else if (assumptionKey === "tax_rate") {
                explanation.innerHTML = explainTaxRate(baseScenarioData);

            } else if (assumptionKey === "da_rate") {
                explanation.innerHTML = explainDaRate(baseScenarioData);

            } else if (assumptionKey === "capex_rate") {
                explanation.innerHTML = explainCapexRate(baseScenarioData);

            } else if (assumptionKey === "nwc_rate") {
                explanation.innerHTML = explainNwcRate(baseScenarioData);

            } else if (assumptionKey === "wacc") {
                explanation.innerHTML = explainWacc(baseScenarioData);

            } else if (assumptionKey === "terminal_growth") {
                explanation.innerHTML = explainTerminalGrowth(baseScenarioData);
            }
        }

        explanation.classList.toggle("is-hidden");
        assumptionContainer.classList.toggle("is-expanded");
    });
}


function explainRevenueGrowth(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const revenueGrowth = assumptions.forecast_assumptions.revenue_growth;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const isDefault = Object.hasOwn(defaultsUsed, "revenue_growth");

    const inputs = [
        { label: "5-year CAGR", value: revenueGrowth["5y_cagr"] },
        { label: "3-year CAGR", value: revenueGrowth["3y_cagr"] },
        { label: "TTM YoY Growth", value: revenueGrowth["yoy_growth"] }
    ];

    const availableInputs = inputs.filter(
        input => input.value !== null && input.value !== undefined
    );

    const weight = availableInputs.length > 0
        ? 100 / availableInputs.length
        : 0;

    const hasForecast = revenueGrowth.forecast !== null &&
                        revenueGrowth.forecast !== undefined;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is Revenue Growth calculated?</h4>

                <p>
                    Intrinsic estimates future revenue growth by averaging
                    three historical growth measures: the 5-year CAGR,
                    3-year CAGR and latest TTM year-over-year growth.
                    Each available measure receives equal weight.
                    Missing values are excluded from the calculation.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated assumption.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>Historical inputs</h5>

                <div class="assumption-explanation-table">
                    ${inputs.map(input => {
                        const isAvailable = input.value !== null &&
                                            input.value !== undefined;

                        return `
                            <div class="assumption-explanation-row">
                                <span>${input.label}</span>
                                <span>${formatPercent(input.value)}</span>
                                <span>${isAvailable
                                    ? `${weight.toFixed(1)}%`
                                    : "Excluded"}
                                </span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Average growth calculation</h5>

                ${availableInputs.length > 0 ? `
                    <p>
                        ${availableInputs.map(input =>
                            `(${formatPercent(input.value)} × ${weight.toFixed(1)}%)`
                        ).join(" + ")}
                    </p>
                ` : `
                    <p>
                        No historical revenue growth data is available
                        to calculate an assumption.
                    </p>
                `}

                <div class="assumption-explanation-result">
                    <span>Revenue growth assumption</span>
                    <strong>${hasForecast
                        ? formatPercent(revenueGrowth.forecast)
                        : "Not available"}
                    </strong>
                </div>
            </div>

        </div>
    `;
}


function explainOperatingMargin(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const operatingMargin = assumptions.forecast_assumptions.operating_margin;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const formatWeight = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(0)}%`
            : "—";

    const isDefault = Object.hasOwn(defaultsUsed, "operating_margin");

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is Operating Margin calculated?</h4>

                <p>
                    Intrinsic establishes its Base operating margin assumption
                    using a weighted average of historical operating margin
                    performance. This assumption is then applied to projected
                    revenue throughout the forecast period.
                </p>

                <p>
                    This is the calculated Base assumption, independent of
                    the Bear and Bull scenario adjustments.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated Base assumption.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>Historical inputs</h5>

                <div class="assumption-explanation-table">
                    <div class="assumption-explanation-row">
                        <span>6-year average</span>
                        <span>${formatPercent(operatingMargin["6y_average"])}</span>
                        <span>${formatWeight(operatingMargin.weights["6y_average"])}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>3-year average</span>
                        <span>${formatPercent(operatingMargin["3y_average"])}</span>
                        <span>${formatWeight(operatingMargin.weights["3y_average"])}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Latest year</span>
                        <span>${formatPercent(operatingMargin.latest)}</span>
                        <span>${formatWeight(operatingMargin.weights.latest)}</span>
                    </div>
                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Weighted average calculation</h5>

                <p>
                    (${formatPercent(operatingMargin["6y_average"])} × ${formatWeight(operatingMargin.weights["6y_average"])})
                    +
                    (${formatPercent(operatingMargin["3y_average"])} × ${formatWeight(operatingMargin.weights["3y_average"])})
                    +
                    (${formatPercent(operatingMargin.latest)} × ${formatWeight(operatingMargin.weights.latest)})
                </p>

                <div class="assumption-explanation-result">
                    <span>Calculated Base operating margin</span>
                    <strong>${formatPercent(operatingMargin.forecast)}</strong>
                </div>
            </div>

        </div>
    `;
}

function explainTaxRate(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const taxRate = assumptions.forecast_assumptions.tax_rate;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const formatWeight = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(0)}%`
            : "—";

    const isDefault = Object.hasOwn(defaultsUsed, "tax_rate");

    const hasTaxRate = taxRate !== null && taxRate !== undefined;

    const hasInputs = hasTaxRate &&
        taxRate["6y_average"] != null &&
        taxRate["3y_average"] != null &&
        taxRate.latest != null;

    const hasWeights = hasTaxRate &&
        taxRate.weights?.["6y_average"] != null &&
        taxRate.weights?.["3y_average"] != null &&
        taxRate.weights?.latest != null;

    const hasForecast = hasTaxRate &&
        taxRate.forecast !== null &&
        taxRate.forecast !== undefined;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is Tax Rate calculated?</h4>

                <p>
                    Intrinsic establishes its Base tax rate assumption using a
                    weighted average of historical annual tax rates.
                    Longer-term averages provide historical context, while
                    the latest available year receives additional weight.
                </p>

                <p>
                    This is the calculated Base assumption, independent of
                    the Bear and Bull scenario adjustments.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated Base assumption.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>Historical inputs</h5>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Up to 6-year average</span>
                        <span>${hasTaxRate ? formatPercent(taxRate["6y_average"]) : "Not available"}</span>
                        <span>${hasTaxRate ? formatWeight(taxRate.weights?.["6y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Up to 3-year average</span>
                        <span>${hasTaxRate ? formatPercent(taxRate["3y_average"]) : "Not available"}</span>
                        <span>${hasTaxRate ? formatWeight(taxRate.weights?.["3y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Latest year</span>
                        <span>${hasTaxRate ? formatPercent(taxRate.latest) : "Not available"}</span>
                        <span>${hasTaxRate ? formatWeight(taxRate.weights?.latest) : "—"}</span>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Weighted average calculation</h5>

                ${hasInputs && hasWeights ? `
                    <p>
                        (${formatPercent(taxRate["6y_average"])} × ${formatWeight(taxRate.weights["6y_average"])})
                        +
                        (${formatPercent(taxRate["3y_average"])} × ${formatWeight(taxRate.weights["3y_average"])})
                        +
                        (${formatPercent(taxRate.latest)} × ${formatWeight(taxRate.weights.latest)})
                    </p>
                ` : `
                    <p>
                        Insufficient historical data to display the complete calculation.
                    </p>
                `}

                <div class="assumption-explanation-result">
                    <span>Calculated Base tax rate</span>
                    <strong>${hasForecast ? formatPercent(taxRate.forecast) : "Not available"}</strong>
                </div>
            </div>

        </div>
    `;
}

function explainDaRate(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const daRate = assumptions.forecast_assumptions.da_rate;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const formatWeight = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(0)}%`
            : "—";

    const isDefault = Object.hasOwn(defaultsUsed, "da_rate");
    const hasDaRate = daRate !== null && daRate !== undefined;

    const hasInputs = hasDaRate &&
        daRate["6y_average"] != null &&
        daRate["3y_average"] != null &&
        daRate.latest != null;

    const hasWeights = hasDaRate &&
        daRate.weights?.["6y_average"] != null &&
        daRate.weights?.["3y_average"] != null &&
        daRate.weights?.latest != null;

    const hasForecast = hasDaRate &&
        daRate.forecast != null;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is D&A / Revenue calculated?</h4>

                <p>
                    Intrinsic calculates the company's annual depreciation
                    and amortization as a percentage of revenue. The Base
                    assumption is based on a weighted average of historical
                    D&A rates.
                </p>

                <p>
                    This is the calculated Base assumption, independent of
                    the Bear and Bull scenario adjustments.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated Base assumption.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>Historical inputs</h5>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Up to 6-year average</span>
                        <span>${hasDaRate ? formatPercent(daRate["6y_average"]) : "Not available"}</span>
                        <span>${hasDaRate ? formatWeight(daRate.weights?.["6y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Up to 3-year average</span>
                        <span>${hasDaRate ? formatPercent(daRate["3y_average"]) : "Not available"}</span>
                        <span>${hasDaRate ? formatWeight(daRate.weights?.["3y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Latest year</span>
                        <span>${hasDaRate ? formatPercent(daRate.latest) : "Not available"}</span>
                        <span>${hasDaRate ? formatWeight(daRate.weights?.latest) : "—"}</span>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Weighted average calculation</h5>

                ${hasInputs && hasWeights ? `
                    <p>
                        (${formatPercent(daRate["6y_average"])} × ${formatWeight(daRate.weights["6y_average"])})
                        +
                        (${formatPercent(daRate["3y_average"])} × ${formatWeight(daRate.weights["3y_average"])})
                        +
                        (${formatPercent(daRate.latest)} × ${formatWeight(daRate.weights.latest)})
                    </p>
                ` : `
                    <p>
                        Insufficient historical data to display the complete calculation.
                    </p>
                `}

                <div class="assumption-explanation-result">
                    <span>Calculated Base D&A / Revenue</span>
                    <strong>${hasForecast ? formatPercent(daRate.forecast) : "Not available"}</strong>
                </div>
            </div>

        </div>
    `;
}

function explainCapexRate(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const capexRate = assumptions.forecast_assumptions.capex_rate;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const formatWeight = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(0)}%`
            : "—";

    const isDefault = Object.hasOwn(defaultsUsed, "capex_rate");
    const hasCapexRate = capexRate !== null && capexRate !== undefined;

    const hasInputs = hasCapexRate &&
        capexRate["6y_average"] != null &&
        capexRate["3y_average"] != null &&
        capexRate.latest != null;

    const hasWeights = hasCapexRate &&
        capexRate.weights?.["6y_average"] != null &&
        capexRate.weights?.["3y_average"] != null &&
        capexRate.weights?.latest != null;

    const hasForecast = hasCapexRate && capexRate.forecast != null;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is CapEx / Revenue calculated?</h4>

                <p>
                    Intrinsic calculates the company's annual capital
                    expenditures as a percentage of revenue. The Base
                    assumption is based on a weighted average of historical
                    CapEx rates.
                </p>

                <p>
                    This is the calculated Base assumption, independent of
                    the Bear and Bull scenario adjustments.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated Base assumption.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>Historical inputs</h5>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Up to 6-year average</span>
                        <span>${hasCapexRate ? formatPercent(capexRate["6y_average"]) : "Not available"}</span>
                        <span>${hasCapexRate ? formatWeight(capexRate.weights?.["6y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Up to 3-year average</span>
                        <span>${hasCapexRate ? formatPercent(capexRate["3y_average"]) : "Not available"}</span>
                        <span>${hasCapexRate ? formatWeight(capexRate.weights?.["3y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Latest year</span>
                        <span>${hasCapexRate ? formatPercent(capexRate.latest) : "Not available"}</span>
                        <span>${hasCapexRate ? formatWeight(capexRate.weights?.latest) : "—"}</span>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Weighted average calculation</h5>

                ${hasInputs && hasWeights ? `
                    <p>
                        (${formatPercent(capexRate["6y_average"])} × ${formatWeight(capexRate.weights["6y_average"])})
                        +
                        (${formatPercent(capexRate["3y_average"])} × ${formatWeight(capexRate.weights["3y_average"])})
                        +
                        (${formatPercent(capexRate.latest)} × ${formatWeight(capexRate.weights.latest)})
                    </p>
                ` : `
                    <p>
                        Insufficient historical data to display the complete calculation.
                    </p>
                `}

                <div class="assumption-explanation-result">
                    <span>Calculated Base CapEx / Revenue</span>
                    <strong>${hasForecast ? formatPercent(capexRate.forecast) : "Not available"}</strong>
                </div>
            </div>

        </div>
    `;
}

function explainNwcRate(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const nwcRate = assumptions.forecast_assumptions.nwc_rate;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const formatWeight = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(0)}%`
            : "—";

    const isDefault = Object.hasOwn(defaultsUsed, "nwc_rate");
    const hasNwcRate = nwcRate !== null && nwcRate !== undefined;

    const hasInputs = hasNwcRate &&
        nwcRate["6y_average"] != null &&
        nwcRate["3y_average"] != null &&
        nwcRate.latest != null;

    const hasWeights = hasNwcRate &&
        nwcRate.weights?.["6y_average"] != null &&
        nwcRate.weights?.["3y_average"] != null &&
        nwcRate.weights?.latest != null;

    const hasForecast = hasNwcRate && nwcRate.forecast != null;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is NWC / Revenue calculated?</h4>

                <p>
                    Intrinsic calculates net working capital as operating
                    current assets minus operating current liabilities.
                    This amount is divided by revenue to determine the
                    company's historical working capital requirements.
                    The Base assumption is based on a weighted average
                    of historical NWC ratios.
                </p>

                <p>
                    This is the calculated Base assumption, independent of
                    the Bear and Bull scenario adjustments.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated Base assumption.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>Historical inputs</h5>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Up to 6-year average</span>
                        <span>${hasNwcRate ? formatPercent(nwcRate["6y_average"]) : "Not available"}</span>
                        <span>${hasNwcRate ? formatWeight(nwcRate.weights?.["6y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Up to 3-year average</span>
                        <span>${hasNwcRate ? formatPercent(nwcRate["3y_average"]) : "Not available"}</span>
                        <span>${hasNwcRate ? formatWeight(nwcRate.weights?.["3y_average"]) : "—"}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Latest year</span>
                        <span>${hasNwcRate ? formatPercent(nwcRate.latest) : "Not available"}</span>
                        <span>${hasNwcRate ? formatWeight(nwcRate.weights?.latest) : "—"}</span>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Weighted average calculation</h5>

                ${hasInputs && hasWeights ? `
                    <p>
                        (${formatPercent(nwcRate["6y_average"])} × ${formatWeight(nwcRate.weights["6y_average"])})
                        +
                        (${formatPercent(nwcRate["3y_average"])} × ${formatWeight(nwcRate.weights["3y_average"])})
                        +
                        (${formatPercent(nwcRate.latest)} × ${formatWeight(nwcRate.weights.latest)})
                    </p>
                ` : `
                    <p>
                        Insufficient historical data to display the complete calculation.
                    </p>
                `}

                <div class="assumption-explanation-result">
                    <span>Calculated Base NWC / Revenue</span>
                    <strong>${hasForecast ? formatPercent(nwcRate.forecast) : "Not available"}</strong>
                </div>
            </div>

        </div>
    `;
}

function explainWacc(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const details = assumptions.wacc_details;
    const defaultsUsed = scenarioData.defaults_used || {};

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const formatNumber = value =>
        value !== null && value !== undefined
            ? value.toFixed(2)
            : "Not available";

    const formatMoney = value =>
        value !== null && value !== undefined
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 2
            }).format(value)
            : "Not available";

    if (!details) {
        return `
            <div class="assumption-explanation-content">
                <div class="assumption-explanation-intro">
                    <h4>How is WACC calculated?</h4>
                    <p>WACC calculation details are unavailable.</p>
                </div>
            </div>
        `;
    }

    const costOfDebtDetails = details.cost_of_debt_details;

    const isDefault = Object.hasOwn(defaultsUsed, "wacc");
    const hasDebt = details.debt_weight > 0;

    const hasCostOfEquity = details.cost_of_equity != null;
    const hasCostOfDebt = details.cost_of_debt != null;
    const hasCalculatedWacc = details.calculated_wacc != null;

    const hasCapitalWeights =
        details.equity_weight != null &&
        details.debt_weight != null;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is WACC calculated?</h4>

                <p>
                    Weighted Average Cost of Capital (WACC) represents
                    the average return required by a company's providers
                    of capital. It combines the cost of equity and the
                    after-tax cost of debt, weighted by their respective
                    proportions of total capital.
                </p>

                <p>
                    The calculation below explains the Base WACC,
                    before any Bear or Bull scenario adjustments.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    The WACC could not be calculated from the available
                    financial data. A default value of
                    ${formatPercent(defaultsUsed.wacc)} was used instead.
                </div>
            ` : ""}

            <div class="assumption-explanation-inputs">
                <h5>1. Cost of equity (CAPM)</h5>

                <p>
                    The cost of equity is calculated using the
                    Capital Asset Pricing Model (CAPM):
                </p>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Risk-free rate</span>
                        <span>${formatPercent(details.risk_free_rate)}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Beta</span>
                        <span>${formatNumber(details.beta)}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Equity risk premium</span>
                        <span>${formatPercent(details.equity_risk_premium)}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Cost of equity</span>
                        <strong>${formatPercent(details.cost_of_equity)}</strong>
                    </div>

                </div>

                <div class="assumption-explanation-formula">
                    <h5>CAPM calculation</h5>

                    <p>
                        ${formatPercent(details.risk_free_rate)}
                        +
                        (${formatNumber(details.beta)}
                        ×
                        ${formatPercent(details.equity_risk_premium)})
                        =
                        ${hasCostOfEquity
                            ? formatPercent(details.cost_of_equity)
                            : "Not available"}
                    </p>
                </div>
            </div>

            <div class="assumption-explanation-inputs">
                <h5>2. Cost of debt</h5>

                <p>
                    The cost of debt is estimated by dividing interest
                    expense by average total debt.
                </p>

                ${costOfDebtDetails ? `
                    <div class="assumption-explanation-table">

                        <div class="assumption-explanation-row">
                            <span>Interest expense</span>
                            <span>${formatMoney(costOfDebtDetails.interest_expense)}</span>
                        </div>

                        <div class="assumption-explanation-row">
                            <span>Current debt</span>
                            <span>${formatMoney(costOfDebtDetails.current_debt)}</span>
                        </div>

                        <div class="assumption-explanation-row">
                            <span>Previous debt</span>
                            <span>${formatMoney(costOfDebtDetails.previous_debt)}</span>
                        </div>

                        <div class="assumption-explanation-row">
                            <span>Average debt</span>
                            <span>${formatMoney(costOfDebtDetails.average_debt)}</span>
                        </div>

                        <div class="assumption-explanation-row">
                            <span>Cost of debt</span>
                            <strong>${formatPercent(details.cost_of_debt)}</strong>
                        </div>

                    </div>
                ` : `
                    <div class="assumption-explanation-warning">
                        Cost of debt could not be calculated from the
                        available financial data.
                        ${hasDebt
                            ? "Because the company has a non-zero debt weight, this prevents the model from calculating WACC."
                            : "The company has no debt weight, so debt does not contribute to WACC."}
                    </div>
                `}
            </div>

            <div class="assumption-explanation-inputs">
                <h5>3. Capital structure</h5>

                <p>
                    Equity and debt are weighted according to their
                    proportions of total capital, calculated using
                    market capitalization and total debt.
                </p>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Market capitalization</span>
                        <span>${formatMoney(details.market_cap)}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Total debt</span>
                        <span>${formatMoney(details.total_debt)}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Equity weight</span>
                        <strong>${formatPercent(details.equity_weight)}</strong>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Debt weight</span>
                        <strong>${formatPercent(details.debt_weight)}</strong>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>4. Final WACC calculation</h5>

                <p>
                    WACC = Equity Weight × Cost of Equity
                    + Debt Weight × Cost of Debt × (1 − Tax Rate)
                </p>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Tax rate</span>
                        <span>${formatPercent(details.tax_rate)}</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>Calculated Base WACC</span>
                        <span>${hasCalculatedWacc
                            ? formatPercent(details.calculated_wacc)
                            : "Not available"}</span>
                    </div>

                </div>

                <div class="assumption-explanation-result">
                    <span>Base WACC used in the DCF</span>
                    <strong>${formatPercent(details.wacc)}</strong>
                </div>

                ${isDefault ? `
                    <p>
                        Since the WACC could not be calculated, the Base
                        scenario uses the default value. Bear and Bull
                        scenarios may apply their own adjustments to it.
                    </p>
                ` : ""}
            </div>

        </div>
    `;
}

function explainTerminalGrowth(scenarioData) {
    const assumptions = scenarioData.assumptions;
    const terminalGrowth = assumptions.terminal_growth;

    const formatPercent = value =>
        value !== null && value !== undefined
            ? `${(value * 100).toFixed(2)}%`
            : "Not available";

    const hasTerminalGrowth = terminalGrowth != null;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is terminal growth determined?</h4>

                <p>
                    Terminal growth represents the assumed annual growth
                    rate of free cash flow beyond the explicit forecast
                    period. It is used to estimate the company's value
                    after the final forecast year, assuming the business
                    continues operating indefinitely.
                </p>

                <p>
                    Unlike the other DCF assumptions, terminal growth
                    is manually specified rather than calculated from
                    historical financial averages. The value shown here
                    is the Base terminal growth assumption, independent
                    of any Bear or Bull scenario adjustments.
                </p>
            </div>

            <div class="assumption-explanation-inputs">
                <h5>Base assumption</h5>

                <div class="assumption-explanation-table">

                    <div class="assumption-explanation-row">
                        <span>Terminal growth rate</span>
                        <strong>${formatPercent(terminalGrowth)}</strong>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Terminal value calculation</h5>

                <p>
                    Terminal Value = FCFF in Final Forecast Year ×
                    (1 + Terminal Growth Rate) /
                    (WACC − Terminal Growth Rate)
                </p>

                <p>
                    The terminal growth rate should generally remain
                    below WACC and reflect a sustainable long-term
                    growth rate for the business.
                </p>

                <div class="assumption-explanation-result">
                    <span>Base terminal growth assumption</span>
                    <strong>${hasTerminalGrowth
                        ? formatPercent(terminalGrowth)
                        : "Not available"}</strong>
                </div>
            </div>

        </div>
    `;
}
