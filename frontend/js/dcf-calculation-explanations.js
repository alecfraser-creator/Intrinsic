// fcff  and valuation calculation explanantion

function explainFcffForecast(scenarioData) {
    const forecast = scenarioData?.forecast;

    if (!Array.isArray(forecast) || forecast.length === 0) {
        return `
            <div class="fcff-explanation-content">
                <p>FCFF forecast data is not available.</p>
            </div>
        `;
    }

    const formatAmount = value => {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "—";
        }

        const absValue = Math.abs(value);

        if (absValue >= 1e12) {
            return `${(value / 1e12).toFixed(2)}T`;
        }

        if (absValue >= 1e9) {
            return `${(value / 1e9).toFixed(2)}B`;
        }

        if (absValue >= 1e6) {
            return `${(value / 1e6).toFixed(2)}M`;
        }

        return value.toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    };

    const formatPercent = value => {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "—";
        }

        return `${(value * 100).toFixed(2)}%`;
    };

    const formatSignedAmount = value => {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "—";
        }

        if (value > 0) {
            return `+${formatAmount(value)}`;
        }

        return formatAmount(value);
    };

    const rows = [
        {
            label: "Revenue",
            getValue: year => formatAmount(year.revenue)
        },
        {
            label: "Revenue growth",
            getValue: year => formatPercent(year.revenue_growth)
        },
        {
            label: "Operating margin",
            getValue: year => formatPercent(year.operating_margin)
        },
        {
            label: "EBIT",
            getValue: year => formatAmount(year.ebit)
        },
        {
            label: "Tax rate",
            getValue: year => formatPercent(year.tax_rate)
        },
        {
            label: "NOPAT",
            getValue: year => formatAmount(year.nopat)
        },
        {
            label: "D&A",
            getValue: year => formatSignedAmount(year.da)
        },
        {
            label: "CapEx",
            getValue: year => formatSignedAmount(-year.capex)
        },
        {
            label: "Change in NWC",
            getValue: year => formatSignedAmount(-year.change_nwc)
        },
        {
            label: "Projected FCFF",
            className: "fcff-total-row",
            getValue: year => formatAmount(year.fcff)
        }
    ];

    const tableRows = rows.map(row => `
        <div class="fcff-calculation-row ${row.className || ""}">
            <span class="fcff-calculation-label">${row.label}</span>

            ${forecast.map(year => `
                <span class="fcff-calculation-value">
                    ${row.getValue(year)}
                </span>
            `).join("")}
        </div>
    `).join("");

    return `
        <div class="fcff-explanation-content">

            <div class="fcff-explanation-intro">
                <h4>How is free cash flow to the firm calculated?</h4>

                <p>
                    Intrinsic projects the company's free cash flow to the firm
                    (FCFF) by starting with operating profit after taxes,
                    then adjusting for non-cash expenses, capital investments
                    and changes in operating working capital.
                </p>

                <p>
                    The calculation uses the selected scenario's forecast
                    assumptions. Each year's FCFF is calculated independently
                    using the projected financial figures shown below.
                </p>
            </div>

            <div class="fcff-calculation-formula">
                <h5>FCFF formula</h5>

                <p>
                    FCFF = NOPAT + D&A − CapEx − Change in NWC
                </p>

                <p>
                    NOPAT represents operating profit after taxes.
                    D&A is added back because it is a non-cash expense,
                    while CapEx and increases in working capital represent
                    cash outflows.
                </p>
            </div>

            <div class="fcff-calculation-breakdown">
                <h5>Forecast calculation</h5>

                <p>
                    All figures are expressed in the same currency as
                    the company's financial statements.
                </p>

                <div class="fcff-calculation-table">

                    <div class="fcff-calculation-row fcff-calculation-header">
                        <span>Component</span>

                        ${forecast.map(year => `
                            <span>${year.year}</span>
                        `).join("")}
                    </div>

                    ${tableRows}

                </div>
            </div>

            <div class="fcff-explanation-details">

                <h5>Understanding the components</h5>

                <div class="fcff-explanation-item">
                    <strong>NOPAT</strong>
                    <p>
                        Net Operating Profit After Taxes is calculated by
                        applying the forecast tax rate to EBIT.
                    </p>
                    <p>
                        NOPAT = EBIT × (1 − Tax Rate)
                    </p>
                </div>

                <div class="fcff-explanation-item">
                    <strong>Depreciation and amortization</strong>
                    <p>
                        D&A is added back to NOPAT because it reduces
                        accounting profit without representing a cash
                        outflow in the current period. It is forecast
                        as a percentage of revenue.
                    </p>
                </div>

                <div class="fcff-explanation-item">
                    <strong>Capital expenditures</strong>
                    <p>
                        CapEx represents investments in long-term assets
                        and is deducted from cash flow. It is forecast
                        as a percentage of revenue.
                    </p>
                </div>

                <div class="fcff-explanation-item">
                    <strong>Change in net working capital</strong>
                    <p>
                        Net working capital is calculated as operating
                        current assets minus operating current liabilities.
                        Its forecast is based on the historical weighted
                        average NWC-to-revenue ratio.
                    </p>
                    <p>
                        An increase in NWC consumes cash and reduces FCFF.
                        A decrease releases cash and increases FCFF.
                    </p>
                </div>

            </div>

        </div>
    `;
}

function explainDcfValuation(scenarioData) {

    if (!scenarioData) {
        return `<p>DCF valuation data is unavailable.</p>`;
    }

    const {
        present_values,
        pv_forecast,
        terminal_fcff,
        terminal_value,
        pv_terminal_value,
        terminal_value_percentage,
        enterprise_value,
        equity_value,
        net_cash,
        intrinsic_value_per_share,
        assumptions
    } = scenarioData;

    const {
        wacc,
        terminal_growth,
        cash,
        total_debt,
        shares_outstanding
    } = assumptions;

    // FORMATTERS

    function formatAmount(value) {
        if (value == null || !Number.isFinite(Number(value))) return "N/A";

        const number = Number(value);
        const absolute = Math.abs(number);

        if (absolute >= 1e12) {
            return `${(number / 1e12).toFixed(2)}T`;
        }

        if (absolute >= 1e9) {
            return `${(number / 1e9).toFixed(2)}B`;
        }

        if (absolute >= 1e6) {
            return `${(number / 1e6).toFixed(2)}M`;
        }

        if (absolute >= 1e3) {
            return `${(number / 1e3).toFixed(2)}K`;
        }

        return number.toFixed(2);
    }

    function formatPercent(value) {
        if (value == null || !Number.isFinite(Number(value))) return "N/A";
        return `${(Number(value) * 100).toFixed(2)}%`;
    }

    function formatShares(value) {
        if (value == null || !Number.isFinite(Number(value))) return "N/A";

        const number = Number(value);
        const absolute = Math.abs(number);

        if (absolute >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
        if (absolute >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
        if (absolute >= 1e3) return `${(number / 1e3).toFixed(2)}K`;

        return number.toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    }

    function formatFactor(value) {
        if (value == null || !Number.isFinite(Number(value))) return "N/A";
        return `${Number(value).toFixed(4)}x`;
    }

    function calculationRow(label, values, extraClass = "") {
        return `
            <div class="fcff-calculation-row ${extraClass}">
                <span class="fcff-calculation-label">${label}</span>
                ${values.map(value => `
                    <span class="fcff-calculation-value">${value}</span>
                `).join("")}
            </div>
        `;
    }

    // PRESENT VALUE OF FORECAST FCFF

    const forecastRows = (present_values || []).map(item => {
        return `
            <div class="fcff-calculation-row">
                <span class="fcff-calculation-label">
                    Year ${item.discount_period}
                </span>
                <span class="fcff-calculation-value">
                    ${formatAmount(item.fcff)}
                </span>
                <span class="fcff-calculation-value">
                    ${formatFactor(item.discount_factor)}
                </span>
                <span class="fcff-calculation-value">
                    ${formatAmount(item.present_value)}
                </span>
            </div>
        `;
    }).join("");

    // TERMINAL VALUE

    const terminalFcffLastYear =
        present_values?.[present_values.length - 1]?.fcff;

    return `
        <div class="fcff-explanation-content">

            <!-- INTRODUCTION -->

            <div class="fcff-explanation-intro">
                <h3>How the DCF valuation is calculated</h3>
                <p>
                    The DCF model estimates the company's intrinsic value
                    by calculating the present value of its projected free
                    cash flows and its terminal value. It then adjusts
                    enterprise value for net cash or debt and divides the
                    result by shares outstanding.
                </p>
            </div>

            <!-- PRESENT VALUE OF FORECAST -->

            <div class="fcff-calculation-breakdown">

                <h3>1. Present value of forecast cash flows</h3>

                <p>
                    Each year's projected free cash flow is discounted
                    back to today's value using the weighted average
                    cost of capital (WACC).
                </p>

                <div class="fcff-calculation-formula">
                    <strong>Present Value = FCFF ÷ (1 + WACC)<sup>t</sup></strong>
                    <small>
                        t represents the number of years into the future.
                    </small>
                </div>

                <div class="fcff-calculation-table">

                    <div class="fcff-calculation-row fcff-calculation-header">
                        <span>Year</span>
                        <span>Forecast FCFF</span>
                        <span>Discount factor</span>
                        <span>Present value</span>
                    </div>

                    ${forecastRows}

                    ${calculationRow(
                        "Total present value",
                        [
                            "",
                            "",
                            formatAmount(pv_forecast)
                        ],
                        "fcff-total-row"
                    )}

                </div>

                <div class="fcff-explanation-details">
                    <p>
                        <strong>WACC:</strong> ${formatPercent(wacc)}
                    </p>
                    <p>
                        A higher WACC reduces the present value of future
                        cash flows, while a lower WACC increases it.
                    </p>
                </div>

            </div>

            <!-- TERMINAL VALUE -->

            <div class="fcff-calculation-breakdown">

                <h3>2. Terminal value</h3>

                <p>
                    The terminal value estimates the value of all cash flows
                    generated after the explicit forecast period. It assumes
                    that FCFF grows at a constant rate indefinitely.
                </p>

                <div class="fcff-calculation-formula">
                    <strong>
                        Terminal Value = FCFF₅ × (1 + g) ÷ (WACC − g)
                    </strong>
                    <small>
                        g represents the perpetual growth rate.
                    </small>
                </div>

                <div class="fcff-explanation-details">

                    <p>
                        <strong>Final forecast FCFF:</strong>
                        ${formatAmount(terminalFcffLastYear)}
                    </p>

                    <p>
                        <strong>Terminal growth rate:</strong>
                        ${formatPercent(terminal_growth)}
                    </p>

                    <p>
                        <strong>Terminal year FCFF:</strong>
                        ${formatAmount(terminal_fcff)}
                    </p>

                    <p>
                        <strong>Terminal value:</strong>
                        ${formatAmount(terminal_value)}
                    </p>

                </div>

                <h4>Discounting the terminal value</h4>

                <p>
                    Since the terminal value is calculated at the end of
                    the forecast period, it must also be discounted back
                    to today's value.
                </p>

                <div class="fcff-calculation-formula">
                    <strong>
                        PV of Terminal Value =
                        Terminal Value ÷ (1 + WACC)⁵
                    </strong>
                </div>

                <div class="fcff-explanation-details">
                    <p>
                        <strong>Present value of terminal value:</strong>
                        ${formatAmount(pv_terminal_value)}
                    </p>
                </div>

            </div>

            <!-- ENTERPRISE AND EQUITY VALUE -->

            <div class="fcff-calculation-breakdown">

                <h3>3. Enterprise value and equity value</h3>

                <p>
                    Enterprise value is the sum of the present value of
                    forecast cash flows and the present value of terminal
                    value. To obtain equity value, net cash or debt is
                    added to enterprise value.
                </p>

                <div class="fcff-calculation-formula">
                    <strong>
                        Enterprise Value = PV of Forecast FCFF + PV of Terminal Value
                    </strong>
                </div>

                <div class="fcff-explanation-details">

                    <p>
                        <strong>PV of forecast FCFF:</strong>
                        ${formatAmount(pv_forecast)}
                    </p>

                    <p>
                        <strong>PV of terminal value:</strong>
                        ${formatAmount(pv_terminal_value)}
                    </p>

                    <p>
                        <strong>Enterprise value:</strong>
                        ${formatAmount(enterprise_value)}
                    </p>

                </div>

                <div class="fcff-calculation-formula">
                    <strong>
                        Equity Value = Enterprise Value + Cash − Total Debt
                    </strong>
                </div>

                <div class="fcff-explanation-details">

                    <p>
                        <strong>Cash:</strong>
                        ${formatAmount(cash)}
                    </p>

                    <p>
                        <strong>Total debt:</strong>
                        ${formatAmount(total_debt)}
                    </p>

                    <p>
                        <strong>Net cash / (debt):</strong>
                        ${formatAmount(net_cash)}
                    </p>

                    <p>
                        <strong>Equity value:</strong>
                        ${formatAmount(equity_value)}
                    </p>

                </div>

            </div>

            <!-- INTRINSIC VALUE PER SHARE -->

            <div class="fcff-calculation-breakdown">

                <h3>4. Intrinsic value per share</h3>

                <p>
                    Finally, equity value is divided by the number of
                    outstanding shares to estimate the intrinsic value
                    of one share.
                </p>

                <div class="fcff-calculation-formula">
                    <strong>
                        Intrinsic Value Per Share =
                        Equity Value ÷ Shares Outstanding
                    </strong>
                </div>

                <div class="fcff-explanation-details">

                    <p>
                        <strong>Equity value:</strong>
                        ${formatAmount(equity_value)}
                    </p>

                    <p>
                        <strong>Shares outstanding:</strong>
                        ${formatShares(shares_outstanding)}
                    </p>

                    <p>
                        <strong>Intrinsic value per share:</strong>
                        ${formatAmount(intrinsic_value_per_share)}
                    </p>

                </div>

            </div>

            <!-- TERMINAL VALUE DEPENDENCY -->

            <div class="fcff-explanation-details">

                <h3>Terminal value contribution</h3>

                <p>
                    The terminal value represents
                    <strong>${formatPercent(terminal_value_percentage)}</strong>
                    of total enterprise value.
                </p>

                <p>
                    This indicates how much the valuation depends on cash
                    flows beyond the explicit forecast period. A high
                    percentage means the valuation is particularly
                    sensitive to assumptions such as WACC and perpetual
                    growth.
                </p>

            </div>

        </div>
    `;
}
