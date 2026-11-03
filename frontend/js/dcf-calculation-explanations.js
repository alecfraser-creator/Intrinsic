// ==========================================================================
// DCF calculation explanations
//
//   FCFF forecast    revenue -> EBIT -> NOPAT -> FCFF            (one column per year)
//   DCF valuation    inputs -> PV of FCFF -> terminal value -> enterprise value
//                    -> equity value -> value per share
//
// Same structure as the assumption explanations:
//   build*Model()   pure data, no HTML
//   render*()       HTML only, no calculations
// Layout helpers (flowRow / flowStep / flowUsage) and explainIsNum come from
// dcf-assumption-explanations.js, which must be loaded before this file.
//
// Editable-later hooks: assumption-driven rows carry data-input="<key>" and each
// per-year cell carries data-field="<year>".
// ==========================================================================


// ---------- Formatting ----------

// Numbers may arrive as strings; null / "" / non-numeric -> null.
const calcNum = value => {
    if (value === null || value === undefined || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const calcFmt = {
    missing: "—",

    // 1.23T / 4.56B / 7.89M / 1.23K
    amount(value) {
        const number = calcNum(value);
        if (number === null) return calcFmt.missing;

        const absolute = Math.abs(number);

        if (absolute >= 1e12) return `${(number / 1e12).toFixed(2)}T`;
        if (absolute >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
        if (absolute >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
        if (absolute >= 1e3) return `${(number / 1e3).toFixed(2)}K`;

        return number.toFixed(2);
    },

    // Same as amount, with an explicit "+" on positive values
    signed(value) {
        const number = calcNum(value);
        if (number === null) return calcFmt.missing;

        return number > 0 ? `+${calcFmt.amount(number)}` : calcFmt.amount(number);
    },

    percent(value) {
        const number = calcNum(value);
        return number === null ? calcFmt.missing : `${(number * 100).toFixed(2)}%`;
    },

    factor(value) {
        const number = calcNum(value);
        return number === null ? calcFmt.missing : `${number.toFixed(4)}x`;
    },

    shares(value) {
        const number = calcNum(value);
        if (number === null) return calcFmt.missing;

        const absolute = Math.abs(number);

        if (absolute >= 1e9) return `${(number / 1e9).toFixed(2)}B`;
        if (absolute >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
        if (absolute >= 1e3) return `${(number / 1e3).toFixed(2)}K`;

        return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
    },

    perShare(value) {
        const number = calcNum(value);

        return number === null
            ? calcFmt.missing
            : number.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    }
};

// Row label with a muted formula underneath
const calcLabel = (label, formula) =>
    formula ? `${label}<small>${formula}</small>` : label;

const CALC_ROW_CLASS = {
    input: "is-input",
    calc: "",
    subtotal: "is-subtotal",
    total: "is-total"
};

function calcUnavailable(message) {
    return `
        <div class="calc-flow">
            ${flowStep({
                rows: [flowRow(message, [], { className: "is-missing" })]
            })}
        </div>
    `;
}


// ---------- FCFF forecast ----------

// kind: input = comes from the assumptions table, calc = computed from other rows,
// subtotal / total = result of the rows above. `negate` flips the sign so the table
// shows the cash impact (CapEx and NWC increases are outflows).
const FCFF_ROWS = [
    { key: "revenue_growth", label: "Revenue growth", formula: "assumption", kind: "input", format: "percent" },
    { key: "revenue", label: "Revenue", formula: "Prior × (1 + growth)", kind: "calc", format: "amount" },
    { key: "operating_margin", label: "Operating margin", formula: "assumption", kind: "input", format: "percent" },
    { key: "ebit", label: "EBIT", formula: "Revenue × margin", kind: "subtotal", format: "amount" },
    { key: "tax_rate", label: "Tax rate", formula: "assumption", kind: "input", format: "percent" },
    { key: "nopat", label: "NOPAT", formula: "EBIT × (1 − tax)", kind: "subtotal", format: "amount" },
    { key: "da", label: "D&amp;A", formula: "Revenue × D&amp;A rate", kind: "calc", format: "signed" },
    { key: "capex", label: "CapEx", formula: "Revenue × CapEx rate", kind: "calc", format: "signed", negate: true },
    { key: "change_nwc", label: "Change in NWC", formula: "NWC(t) − NWC(t−1)", kind: "calc", format: "signed", negate: true },
    { key: "fcff", label: "FCFF", formula: "", kind: "total", format: "amount" }
];

function buildFcffModel(scenarioData) {
    const forecast = scenarioData?.forecast;

    if (!Array.isArray(forecast) || forecast.length === 0) return null;

    return {
        years: forecast.map(year => year.year),
        wacc: scenarioData.assumptions?.wacc,
        rows: FCFF_ROWS.map(definition => ({
            ...definition,
            cells: forecast.map(year => {
                const value = calcNum(year[definition.key]);

                return {
                    year: year.year,
                    value: definition.negate && value !== null ? -value : value
                };
            })
        }))
    };
}

function renderFcffForecast(model) {
    const rowsHtml = model.rows.map(row => flowRow(
        calcLabel(row.label, row.formula),
        row.cells.map(cell => ({
            field: String(cell.year),
            text: calcFmt[row.format](cell.value)
        })),
        {
            className: CALC_ROW_CLASS[row.kind],
            input: row.kind === "input" ? row.key : ""
        }
    ));

    const waccText = explainIsNum(model.wacc) ? calcFmt.percent(model.wacc) : "WACC";

    return `
        <div class="calc-flow" data-calculation="fcff">
            <div class="calc-flow-scroll">
                ${flowStep({
                    title: "FCFF forecast",
                    formula: "FCFF = NOPAT + D&amp;A − CapEx − ΔNWC",
                    cols: model.years.length,
                    head: ["", ...model.years.map(String)],
                    rows: rowsHtml
                })}
            </div>
            ${flowUsage(`PV = FCFF ÷ (1 + ${waccText})<sup>t</sup>`)}
        </div>
    `;
}

function explainFcffForecast(scenarioData) {
    const model = buildFcffModel(scenarioData);

    return model
        ? renderFcffForecast(model)
        : calcUnavailable("FCFF forecast data is not available");
}


// ---------- DCF valuation ----------

function buildDcfValuationModel(scenarioData) {
    if (!scenarioData) return null;

    const assumptions = scenarioData.assumptions ?? {};
    const presentValues = scenarioData.present_values ?? [];
    const lastYear = presentValues[presentValues.length - 1];

    return {
        // inputs (from the assumptions)
        wacc: assumptions.wacc,
        terminalGrowth: assumptions.terminal_growth,
        cash: assumptions.cash,
        totalDebt: assumptions.total_debt,
        sharesOutstanding: assumptions.shares_outstanding,

        // 1. present value of the forecast
        years: presentValues.map(item => ({
            period: item.discount_period,
            fcff: item.fcff,
            discountFactor: item.discount_factor,
            presentValue: item.present_value
        })),
        pvForecast: scenarioData.pv_forecast,

        // 2. terminal value
        finalFcff: lastYear?.fcff,
        terminalFcff: scenarioData.terminal_fcff,
        terminalValue: scenarioData.terminal_value,
        terminalDiscountFactor: lastYear?.discount_factor,
        terminalPeriod: lastYear?.discount_period ?? (presentValues.length || null),
        pvTerminalValue: scenarioData.pv_terminal_value,

        // 3. enterprise and equity value
        enterpriseValue: scenarioData.enterprise_value,
        terminalShare: scenarioData.terminal_value_percentage,
        equityValue: scenarioData.equity_value,

        // 4. per share
        intrinsicValuePerShare: scenarioData.intrinsic_value_per_share
    };
}

function renderDcfValuation(model) {
    const fmt = calcFmt;

    const waccText = explainIsNum(model.wacc) ? fmt.percent(model.wacc) : "WACC";
    const growthText = explainIsNum(model.terminalGrowth)
        ? fmt.percent(model.terminalGrowth)
        : "g";

    // Inputs
    const inputsStep = flowStep({
        title: "Inputs",
        rows: [
            flowRow("WACC", [fmt.percent(model.wacc)], { input: "wacc" }),
            flowRow("Terminal growth (g)", [fmt.percent(model.terminalGrowth)], { input: "terminal_growth" }),
            flowRow("Cash", [fmt.amount(model.cash)], { input: "cash" }),
            flowRow("Total debt", [fmt.amount(model.totalDebt)], { input: "total_debt" }),
            flowRow("Shares outstanding", [fmt.shares(model.sharesOutstanding)], { input: "shares_outstanding" })
        ]
    });

    // 1. Present value of forecast FCFF
    const forecastRows = model.years.map(item => flowRow(
        `Year ${item.period}`,
        [
            fmt.amount(item.fcff),
            fmt.factor(item.discountFactor),
            fmt.amount(item.presentValue)
        ]
    ));

    forecastRows.push(flowRow(
        "PV of forecast FCFF",
        ["", "", fmt.amount(model.pvForecast)],
        { className: "is-total" }
    ));

    const forecastStep = flowStep({
        title: "1 · Present value of forecast FCFF",
        formula: `FCFF ÷ (1 + ${waccText})<sup>t</sup>`,
        cols: 3,
        head: ["Year", "FCFF", "× Factor", "= PV"],
        rows: forecastRows
    });

    // 2. Terminal value
    const terminalStep = flowStep({
        title: "2 · Terminal value",
        formula: `FCFF<sub>N</sub> × (1 + ${growthText}) ÷ (${waccText} − ${growthText})`,
        rows: [
            flowRow("Final forecast FCFF (FCFF<sub>N</sub>)", [fmt.amount(model.finalFcff)]),
            flowRow(
                calcLabel("Terminal-year FCFF", "FCFF<sub>N</sub> × (1 + g)"),
                [fmt.amount(model.terminalFcff)]
            ),
            flowRow(
                calcLabel("Terminal value", "Terminal-year FCFF ÷ (WACC − g)"),
                [fmt.amount(model.terminalValue)],
                { className: "is-subtotal" }
            ),
            flowRow(
                calcLabel(
                    `Discount factor (year ${model.terminalPeriod ?? "N"})`,
                    "1 ÷ (1 + WACC)<sup>N</sup>"
                ),
                [fmt.factor(model.terminalDiscountFactor)]
            ),
            flowRow(
                calcLabel("PV of terminal value", "Terminal value × factor"),
                [fmt.amount(model.pvTerminalValue)],
                { className: "is-total" }
            )
        ]
    });

    // 3. Enterprise value -> equity value
    const equityStep = flowStep({
        title: "3 · Enterprise value to equity value",
        formula: "EV + Cash − Debt",
        rows: [
            flowRow("PV of forecast FCFF", [fmt.amount(model.pvForecast)]),
            flowRow("PV of terminal value", [fmt.signed(model.pvTerminalValue)]),
            flowRow("Enterprise value", [fmt.amount(model.enterpriseValue)], { className: "is-subtotal" }),
            flowRow("Terminal value share of EV", [fmt.percent(model.terminalShare)], { className: "is-input" }),
            flowRow("Cash", [fmt.signed(model.cash)]),
            flowRow("Total debt", [fmt.signed(calcNum(model.totalDebt) === null ? null : -calcNum(model.totalDebt))]),
            flowRow("Equity value", [fmt.amount(model.equityValue)], { className: "is-total" })
        ]
    });

    // 4. Value per share
    const perShareStep = flowStep({
        title: "4 · Intrinsic value per share",
        formula: "Equity value ÷ Shares",
        rows: [
            flowRow("Equity value", [fmt.amount(model.equityValue)]),
            flowRow("÷ Shares outstanding", [fmt.shares(model.sharesOutstanding)]),
            flowRow("Intrinsic value per share", [fmt.perShare(model.intrinsicValuePerShare)], { className: "is-total" })
        ]
    });

    return `
        <div class="calc-flow" data-calculation="dcf-valuation">
            ${inputsStep}
            <div class="calc-flow-scroll">${forecastStep}</div>
            ${terminalStep}
            ${equityStep}
            ${perShareStep}
        </div>
    `;
}

function explainDcfValuation(scenarioData) {
    const model = buildDcfValuationModel(scenarioData);

    return model
        ? renderDcfValuation(model)
        : calcUnavailable("DCF valuation data is unavailable");
}