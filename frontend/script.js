// ==========================================
// GLOBAL STATE
// ==========================================

let currentQuantAnalysis = null;
let savedQuantAnalysis = null;
let currentQualAnalysis = {
    business_overview: {
        "business-model": "",
        "revenue-streams": "",
        "geographic-exposure": ""
    },
    competitive_advantage: {
        "competitive-advantages": "",
        "moat-durability": "",
        "competitors-threats": ""
    },
    management_capital_allocation: {
        "management-track-record": "",
        "insider-alignment": "",
        "capital-allocation": ""
    },
    financial_quality: {
        "earnings-quality": "",
        "cyclicality-resilience": "",
        "accounting-concerns": ""
    },
    growth_prospects: {
        "growth-drivers": "",
        "market-opportunity": "",
        "reinvestment-opportunities": ""
    },
    risks_red_flags: {
        "business-risks": "",
        "external-threats": "",
        "red-flags": ""
    },
    investment_thesis: {
        "investment-case": "",
        "market-misunderstanding": "",
        "attractive-price": "",
        "thesis-invalidation": ""
    }
};
const qualitativeFieldMap = {
    business_overview: [
        "business-model",
        "revenue-streams",
        "geographic-exposure"
    ],
    competitive_advantage: [
        "competitive-advantages",
        "moat-durability",
        "competitors-threats"
    ],
    management_capital_allocation: [
        "management-track-record",
        "insider-alignment",
        "capital-allocation"
    ],
    financial_quality: [
        "earnings-quality",
        "cyclicality-resilience",
        "accounting-concerns"
    ],
    growth_prospects: [
        "growth-drivers",
        "market-opportunity",
        "reinvestment-opportunities"
    ],
    risks_red_flags: [
        "business-risks",
        "external-threats",
        "red-flags"
    ],
    investment_thesis: [
        "investment-case",
        "market-misunderstanding",
        "attractive-price",
        "thesis-invalidation"
    ]
};
let lastFinancialsRefresh = null;


// ==========================================
// DOM ELEMENTS
// ==========================================

// Tabs and pannels

 
const tabs = {
    quantitative: {
        tab: document.getElementById("quantitative-tab"),
        panel: document.getElementById("quantitative-panel")
    },
    qualitative: {
        tab: document.getElementById("qualitative-tab"),
        panel: document.getElementById("qualitative-panel")
    }, 
    valuation: {
        tab: document.getElementById("valuation-tab"),
        panel: document.getElementById("valuation-panel")
    }
    
};


// Search and analysis
const searchForm = document.querySelector("#search-form");
const tickerInput = document.querySelector("#ticker-input");
const analyzeButton = document.querySelector("#analyze-button");
const welcomeMessage = document.querySelector("#welcome-message");
const statusMessage = document.querySelector("#status-message");

//Quantitative analysis
const refreshfFinancials = document.querySelector("#refresh-financials");
const analysisContent = document.querySelector("#analysis-content");
const historicalCharts = {};

// Watchlist
const watchlistCompanies = document.querySelector("#watchlist-companies");
const watchlistEmpty = document.querySelector(".watchlist-empty");
const watchlistElement = document.querySelector(".watchlist-item");
const watchlistHeader = document.querySelector(".watchlist-header");
const watchlistAdd = document.getElementById("watchlist-add");

// Watchlist controls in the analysis
const saveCompany = document.querySelector("#save_watchlist");
const watchlistActions = document.querySelector("#watchlist-actions");
const updateCompany = document.querySelector("#update_analysis");
const removeCompany = document.querySelector("#remove_watchlist");

// Metric info buttons
const metricInfoButtons = document.querySelectorAll(".metric-info");
const metricExplanations = {
    /* ---------- Financial Strength ---------- */

        "cash":
            `What is cash?
    Cash measures the liquid funds and investments Intrinsic counts as available to the company, based on its latest quarterly balance sheet.

    Our formula:
    Cash = cash and cash equivalents + short-term investments + non-current marketable securities. For short-term investments, Intrinsic uses the first reported line among marketable securities (current), short-term investments, or available-for-sale debt securities (current), rather than adding them together. Missing components count as zero. Restricted cash and long-term investments are excluded, except that a cash-plus-restricted-cash line may be used if a plain cash line is unavailable. If cash and cash equivalents itself is missing, the result is N/A.

    What it means:
    A higher cash balance generally gives a company more financial flexibility and a larger buffer against unexpected expenses. Intrinsic includes certain investments in its cash figure, so this is broader than cash sitting in bank accounts alone. It is not necessarily all immediately available for spending, particularly when securities have restrictions or liquidity risks.`,

        "total-debt":
            `What is total debt?
    Total debt measures the company's reported borrowing obligations, using its latest quarterly balance sheet.

    Our formula:
    Total debt = current maturities of long-term debt + short-term borrowings + commercial paper + long-term debt excluding the current portion. Commercial paper is excluded when its reported amount is no greater than short-term borrowings, on the assumption that it may already be included. Missing debt lines count as zero. Operating lease liabilities are excluded, while finance leases are included only when reported within the debt lines used by Intrinsic.

    What it means:
    Higher total debt means the company has more borrowing to repay or refinance. Compare debt with cash, cash flow and the company's ability to cover interest payments. Intrinsic's figure excludes operating lease liabilities and may be affected by how a company classifies or reports overlapping debt categories, so it may not capture every economic obligation.`,

        "net-debt":
            `What is net debt?
    Net debt measures the company's debt after subtracting the cash and investments included in Intrinsic's cash calculation.

    Our formula:
    Net debt = total debt − cash. Total debt and cash use Intrinsic's definitions and the latest quarterly balance sheet.

    What it means:
    Positive net debt means the company's total debt exceeds its included cash and investments. Negative net debt means it holds more included cash and investments than debt. This helps compare debt burdens across companies of different sizes, but it does not mean all reported cash can necessarily be used immediately to repay debt.`,

        "debt-equity":
            `What is debt / equity?
    Debt / equity measures the amount of borrowing relative to the shareholders' equity recorded on the balance sheet.

    Our formula:
    Debt / equity = total debt ÷ shareholders' equity, using the latest quarter. Intrinsic uses equity attributable to the parent company's shareholders, excluding minority interests when that line is available. The result is N/A if equity is zero or negative.

    What it means:
    For example, 0.8x means Intrinsic calculates $0.80 of debt for every $1 of included shareholders' equity. Higher values indicate greater leverage under this definition. Negative or zero equity makes the ratio unsuitable, and heavy buybacks or accumulated losses can shrink equity and inflate the ratio. Appropriate levels vary significantly by industry.`,

        "current-ratio":
            `What is the current ratio?
    The current ratio measures whether a company has enough reported short-term assets to cover its short-term liabilities.

    Our formula:
    Current ratio = current assets ÷ current liabilities, using the latest quarter.

    What it means:
    A ratio of 1.5x means the company reports $1.50 in current assets for every $1 of current liabilities. Below 1.0x, current liabilities exceed current assets, which may indicate short-term financial pressure. However, companies that collect cash quickly and pay suppliers later, such as some supermarkets and subscription businesses, can operate successfully with lower ratios. The ratio alone does not show how quickly assets can be converted into cash.`,

        "interest-coverage":
            `What is interest coverage?
    Interest coverage measures how many times a company's operating income covers its reported interest expense.

    Our formula:
    Interest coverage = operating income (EBIT) ÷ interest expense, with both figures summed over the last four quarters. Intrinsic returns N/A if the interest expense line is unavailable or any of the four quarters is missing.

    What it means:
    A result of 5x means operating income is five times the included interest expense. Below roughly 2x, interest payments may leave little room for a decline in earnings; above roughly 5x generally provides more headroom. These are rules of thumb, not universal thresholds. N/A does not necessarily mean the company has no debt or pays no interest; the necessary data may simply be unavailable.`,

        /* ---------- Revenue Growth ---------- */

        "revenue-cagr-5y":
            `What is the 5-year revenue CAGR?
    The 5-year compound annual growth rate (CAGR) estimates the average annual rate at which revenue grew between two fiscal years, smoothing out the changes in between.

    Our formula:
    CAGR = ((latest fiscal-year revenue ÷ revenue five fiscal years earlier) ^ (1/5) − 1) × 100. Intrinsic returns N/A if either endpoint is zero or negative, or if the required fiscal-year data is missing.

    What it means:
    A result of 10% means revenue grew at an equivalent compounded rate of 10% per year between the two endpoints; it does not mean revenue increased by 10% in every year. Because Intrinsic uses only the endpoints, the figure can hide sharp fluctuations or an unusual starting or ending year. Compare it with the 3-year CAGR to assess whether more recent growth is faster or slower.`,

        "revenue-cagr-3y":
            `What is the 3-year revenue CAGR?
    The 3-year compound annual growth rate (CAGR) estimates the average annual rate of revenue growth across a more recent three-year period.

    Our formula:
    CAGR = ((latest fiscal-year revenue ÷ revenue three fiscal years earlier) ^ (1/3) − 1) × 100. Intrinsic returns N/A if either endpoint is zero or negative, or if the required fiscal-year data is missing.

    What it means:
    A result of 10% means revenue grew at an equivalent compounded rate of 10% per year between the two endpoints. Compared with Intrinsic's 5-year CAGR, this shorter window can reveal a change in the company's growth trajectory sooner, but it is also more sensitive to unusual years. A higher 3-year CAGR may indicate accelerating growth; a lower one may indicate a slowdown.`,

        "revenue-yoy":
            `What is year-over-year revenue growth?
    Year-over-year (YoY) revenue growth measures how the company's latest twelve months of revenue compare with the preceding twelve months.

    Our formula:
    Growth = (revenue of the latest four quarters ÷ revenue of the preceding four quarters − 1) × 100. Intrinsic requires eight quarters of revenue data.

    What it means:
    A result of 10% means revenue over the latest four quarters was 10% higher than in the preceding four quarters. This rolling measure is more recent than the annual-fiscal-year CAGRs, but it can still be affected by seasonality, acquisitions, divestitures or unusual quarters. Compare it with the 3-year and 5-year CAGRs to understand whether recent growth is accelerating or slowing.`,

        /* ---------- EPS Growth ---------- */

        "eps-cagr-5y":
            `What is the 5-year EPS CAGR?
    The 5-year compound annual growth rate (CAGR) estimates the average annual growth in diluted earnings per share (EPS) between two fiscal years.

    Our formula:
    CAGR = ((latest fiscal-year diluted EPS ÷ diluted EPS five fiscal years earlier) ^ (1/5) − 1) × 100. Intrinsic adjusts EPS for stock splits when the split is tagged in SEC filings. It returns N/A if either endpoint is zero or negative, or if required fiscal-year data is missing.

    What it means:
    A positive result indicates that diluted EPS increased between the two endpoints on a compounded basis. EPS can grow faster than revenue when margins improve, taxes decline or share buybacks reduce the share count. However, Intrinsic's result depends on reported EPS and the split information it can identify; unusual earnings, restatements or unrecognized split adjustments can affect comparisons.`,

        "eps-cagr-3y":
            `What is the 3-year EPS CAGR?
    The 3-year compound annual growth rate (CAGR) estimates the average annual growth in diluted earnings per share (EPS) over a more recent three-year period.

    Our formula:
    CAGR = ((latest fiscal-year diluted EPS ÷ diluted EPS three fiscal years earlier) ^ (1/3) − 1) × 100. Intrinsic adjusts EPS for stock splits when the split is tagged in SEC filings. It returns N/A if either endpoint is zero or negative, or if required fiscal-year data is missing.

    What it means:
    A higher 3-year CAGR than the 5-year CAGR may indicate that EPS growth has accelerated recently; a lower result may indicate a slowdown. Compare EPS growth with revenue growth to understand whether earnings are benefiting from improved profitability or changes in share count. The calculation is sensitive to its starting and ending EPS values and can be distorted by unusual earnings or incomplete split adjustments.`,

        "eps-yoy":
            `What is year-over-year EPS growth?
    Year-over-year (YoY) EPS growth compares the latest twelve months of diluted earnings per share with the preceding twelve months.

    Our formula:
    Growth = (EPS from the latest four quarters ÷ EPS from the preceding four quarters − 1) × 100, where each period's EPS is the sum of four quarterly diluted EPS figures. Intrinsic returns N/A if either period's total EPS is zero or negative.

    What it means:
    A positive result indicates that the sum of quarterly diluted EPS increased relative to the preceding twelve months. The calculation can be distorted by one-off write-downs, tax changes, unusually weak comparison periods or stock-split adjustments. Because Intrinsic sums reported quarterly EPS, its result may differ from annual EPS growth calculated using annual net income and annual weighted-average diluted shares.`,

        /* ---------- Margins and Cash Flow ---------- */

        "gross-margin":
            `What is gross margin?
    Gross margin measures the share of revenue remaining after deducting the direct costs associated with the goods or services sold.

    Our formula:
    Gross margin = (revenue − cost of revenue) ÷ revenue × 100, with revenue and cost of revenue summed over the last four quarters. Intrinsic returns N/A if the required cost-of-revenue line is unavailable.

    What it means:
    A 40% gross margin means $0.40 of each $1 of revenue remains after the included direct costs, before operating expenses, interest and taxes. Higher margins can reflect pricing power, a favorable product mix or lower production costs. Compare companies within the same industry, since business models differ substantially; some businesses, including certain financial institutions, do not report cost of revenue in a comparable way.`,

        "operating-margin":
            `What is operating margin?
    Operating margin measures the share of revenue remaining after the company's reported operating expenses, before interest and taxes.

    Our formula:
    Operating margin = operating income (EBIT) ÷ revenue × 100, with both figures summed over the last four quarters.

    What it means:
    A 15% operating margin means the company generated $0.15 in operating income for each $1 of revenue under Intrinsic's calculation. A rising margin can indicate improving cost efficiency or pricing power, while a falling margin can signal increasing costs or pricing pressure. The result depends on how the company classifies operating expenses, so compare similar businesses and examine the trend over time.`,

        "free-cash-flow":
            `What is free cash flow?
    Free cash flow (FCF) measures the cash a company generates from operations after accounting for spending on property, plant and equipment.

    Our formula:
    FCF = cash from operating activities − capital expenditure, with both figures summed over the last four quarters. Capital expenditure is the reported spending to acquire property, plant and equipment. Acquisitions and purchases of investments are not subtracted. Intrinsic returns N/A if either required figure is missing for any of the four quarters.

    What it means:
    Positive FCF means operating cash flow exceeded the included capital expenditure during the period. This cash can potentially support debt repayment, dividends, buybacks or reinvestment. FCF can fluctuate with working capital, investment cycles and the timing of payments, and Intrinsic's definition does not deduct acquisitions or investment purchases. Positive FCF therefore does not mean all business spending has been covered.`,

        "fcf-margin":
            `What is FCF margin?
    Free-cash-flow margin measures how much free cash flow a company generates for each dollar of revenue.

    Our formula:
    FCF margin = free cash flow ÷ revenue × 100, with both figures summed over the last four quarters.

    What it means:
    A 15% FCF margin means Intrinsic calculates $0.15 of free cash flow for each $1 of revenue. Higher margins indicate that more revenue is converting into cash after the included capital expenditure. Asset-light businesses often have higher margins than capital-intensive manufacturers or retailers, so comparisons are most useful between similar companies. The result also inherits the limitations of Intrinsic's FCF calculation.`,

        "fcf-yoy":
            `What is year-over-year FCF growth?
    Year-over-year (YoY) free-cash-flow growth compares the latest twelve months of FCF with the preceding twelve months.

    Our formula:
    Growth = (FCF of the latest four quarters ÷ FCF of the preceding four quarters − 1) × 100. Intrinsic returns N/A if either period's FCF is zero or negative.

    What it means:
    A positive result indicates that FCF increased relative to the preceding twelve months, but a high percentage does not necessarily mean the increase is sustainable. FCF can change sharply because of working-capital movements, payment timing or large capital investments. Since Intrinsic excludes acquisitions and investment purchases from capital expenditure, interpret this growth rate alongside the underlying cash-flow figures and business context.`,

        /* ---------- Returns ---------- */

        "roe":
            `What is return on equity?
    Return on equity (ROE) measures the profit generated relative to the shareholders' equity invested in the business.

    Our formula:
    ROE = net income ÷ average equity × 100. Net income is profit attributable to the parent company's shareholders, summed over the last four quarters. Average equity = (equity now + equity four quarters ago) ÷ 2. Intrinsic returns N/A if average equity is zero or negative.

    What it means:
    A 15% ROE means the company generated profit equivalent to 15% of the average equity used in Intrinsic's calculation. Higher ROE can reflect strong profitability, but it can also be inflated by heavy borrowing, share buybacks or a small equity base. Intrinsic uses only the two equity endpoints rather than a daily or quarterly average, so large balance-sheet changes during the period can affect the result. Assess it alongside debt / equity and profitability trends.`,

        "roic":
            `What is return on invested capital?
    Return on invested capital (ROIC) estimates the after-tax operating return generated relative to the capital represented by shareholders' equity and debt.

    Our formula:
    ROIC = NOPAT ÷ average invested capital × 100. NOPAT = operating income (EBIT, summed over the last four quarters) × (1 − tax rate), where tax rate = income tax expense ÷ pre-tax income over the same four quarters. Average invested capital = ((equity + total debt) now + (equity + total debt) four quarters ago) ÷ 2. Intrinsic does not subtract cash from invested capital or cap the tax rate.

    What it means:
    A higher ROIC suggests that the company generates more after-tax operating profit relative to the capital included in this formula. Sustained ROIC above the company's cost of capital generally indicates that it creates value on new investments. Intrinsic's calculation can be distorted by unusual tax expenses, low or negative pre-tax income, or changes in debt and equity. Cash remains in the capital base, so this version may differ from ROIC calculations that subtract excess cash. Compare it with an appropriate estimate of the company's cost of capital rather than relying on a universal threshold.`,

        /* ---------- Valuation Multiples ---------- */

        "pe-ratio":
            `What is the P/E ratio?
    The price-to-earnings (P/E) ratio measures how much investors pay for each dollar of a company's recent earnings per share.

    Our formula:
    P/E = current share price ÷ diluted EPS of the last four quarters, where EPS is the sum of the four quarterly diluted EPS figures. Intrinsic returns N/A if this EPS is zero or negative.

    What it means:
    A P/E of 20x means the share price is 20 times the included trailing EPS. A higher P/E may reflect expectations of stronger future growth, lower perceived risk or an expensive valuation; it does not by itself establish which explanation is correct. Intrinsic uses summed quarterly EPS, so its ratio may differ from one based on annual reported EPS. Loss-making companies cannot be meaningfully compared using this P/E calculation. Compare the result with the company's history and similar businesses.`,

        "p-fcf":
            `What is the P/FCF ratio?
    The price-to-free-cash-flow (P/FCF) ratio measures how much investors pay for each dollar of the company's recent free cash flow.

    Our formula:
    P/FCF = market capitalization ÷ free cash flow of the last four quarters. Intrinsic calculates market capitalization as current share price × shares outstanding reported in SEC data. FCF uses Intrinsic's operating cash flow minus capital expenditure definition. The ratio is N/A if FCF is zero or negative.

    What it means:
    A P/FCF of 20x means the market capitalization is 20 times the included trailing FCF. Its reciprocal corresponds to an FCF yield of 5%, assuming the same market capitalization and FCF figures. A lower multiple can indicate a cheaper valuation, but may also reflect weak growth, risk or temporarily elevated cash flow. The result depends on the reported share count and the consistency of the underlying cash-flow data.`,

        "ev-ebitda":
            `What is EV/EBITDA?
    Enterprise value to EBITDA compares the value of the company's operations, accounting for included debt and cash, with its operating earnings before interest, taxes, depreciation and amortization.

    Our formula:
    EV/EBITDA = (market capitalization + total debt − cash) ÷ (EBIT + depreciation and amortization). EBIT and depreciation and amortization are summed over the last four quarters, with depreciation and amortization taken from the cash-flow statement. Market capitalization uses current share price × SEC-reported shares outstanding. Intrinsic returns N/A if EBITDA is zero or negative.

    What it means:
    A multiple of 10x means enterprise value is ten times the included trailing EBITDA. Because the numerator accounts for debt and cash, this can help compare companies with different financing structures. However, Intrinsic's enterprise value uses its own total-debt and cash definitions, and EBITDA is not the same as cash flow because it excludes capital expenditure and working-capital changes. Compare businesses within the same industry and consider their investment requirements.`,

        "p-b":
            `What is the P/B ratio?
    The price-to-book (P/B) ratio compares a company's market value with the shareholders' equity recorded on its balance sheet.

    Our formula:
    P/B = market capitalization ÷ shareholders' equity, using the latest quarter and equity attributable to the parent company's shareholders. Market capitalization is current share price × SEC-reported shares outstanding. Intrinsic returns N/A if equity is zero or negative.

    What it means:
    A P/B of 2x means the market capitalization is twice the included accounting equity. A lower multiple can indicate a cheaper valuation relative to book value, but it can also reflect concerns about asset quality or future profitability. P/B is often more informative for asset-heavy businesses, such as banks and insurers, than for asset-light companies whose internally developed intangible assets may not be fully reflected in book equity.`,

        /* ---------- Intrinsic Value ---------- */

        "normalized-earnings-value":
            `What is normalized earnings value?
    Normalized earnings value estimates a value per share by combining the company's typical recent diluted EPS with its typical historical P/E multiple.

    Our formula:
    Normalized value per share = median diluted EPS × median historical annual P/E. Intrinsic calculates median EPS from positive annual diluted EPS figures over the last five fiscal years, and median P/E from positive historical annual P/E ratios over the last five years.

    What it means:
    This is a historical reference estimate, not a forecast or a guarantee of fair value. It assumes that the selected median earnings and median P/E are representative of the company's current earning power and valuation. If the business has changed significantly, its past profitability or valuation may no longer be relevant. Because only positive observations are included, the medians also exclude loss-making periods and may not represent the full range of the company's performance.`,

        "dcf-value":
            `What is discounted cash flow value?
    Discounted cash flow (DCF) estimates a value per share by projecting future free cash flow and discounting those projected amounts to their present value.

    Our formula:
    Intrinsic estimates annual FCF growth as g = (latest annual FCF ÷ oldest annual FCF) ^ (1 ÷ (number of annual figures − 1)) − 1, using up to the last five annual FCF figures. It projects the latest four-quarter FCF for five years: FCF(t) = FCF today × (1 + g)^t. Each year's cash flow is discounted at 10%: PV(t) = FCF(t) ÷ 1.10^t. Terminal value = FCF(5) × 1.03 ÷ (0.10 − 0.03), discounted by dividing by 1.10^5. Value per share = (sum of PV for years 1–5 + discounted terminal value − total debt + cash) ÷ shares outstanding. Intrinsic returns N/A if any annual FCF figure used is zero or negative.

    What it means:
    The result estimates what the projected cash flows would be worth today under Intrinsic's assumptions. The model uses a fixed 10% discount rate and 3% perpetual growth rate, and extrapolates the historical annual FCF growth rate for five years without a cap. If historical FCF growth is unusually high or volatile, the projection can become unrealistic. Terminal value can account for a large share of the estimate, making the result very sensitive to its assumptions. Intrinsic also adds its calculated cash figure and subtracts its calculated total debt, so those definitions affect the final value. Treat the output as a rough scenario-dependent reference, not a precise price target.`
};
const metricInfoOverlay = document.querySelector("#metric-info-overlay");
const metricInfoModal = document.querySelector("#metric-info-modal");
const metricInfoTitle = document.querySelector("#metric-info-title");
const metricInfoContent = document.querySelector("#metric-info-content");
const closeMetricInfoButton = document.querySelector("#close-metric-info");

// DCF
const dcfScenarioButtons = document.querySelectorAll(".dcf-scenario");
let dcfForecastChart = null;
 

/* ---------- Popover ---------- */
 
let activeInfo = null; // { button, popover, stopDismiss }
 
function closeMetricInfo() {
    if (!activeInfo) return;
 
    const { button, popover, stopDismiss } = activeInfo;
    activeInfo = null;
 
    stopDismiss();
    popover.remove();
    button.setAttribute("aria-expanded", "false");
}
 
function buildMetricPopover(info) {
    const popover = document.createElement("div");
    popover.className = "metric-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", info.title);
 
    const title = document.createElement("h4");
    title.className = "metric-popover-title";
    title.textContent = info.title;
    popover.appendChild(title);
 
    const sections = [
        ["What it is", info.what],
        ["How it's calculated here", info.how],
        ["How to read it", info.read]
    ];
 
    for (const [label, content] of sections) {
        const heading = document.createElement("p");
        heading.className = "metric-popover-label";
        heading.textContent = label;
        popover.appendChild(heading);
 
        if (Array.isArray(content)) {
            const list = document.createElement("ol");
            list.className = "metric-popover-steps";
            for (const step of content) {
                const item = document.createElement("li");
                item.textContent = step;
                list.appendChild(item);
            }
            popover.appendChild(list);
        } else {
            const text = document.createElement("p");
            text.className = "metric-popover-text";
            text.textContent = content;
            popover.appendChild(text);
        }
    }
 
    return popover;
}
 
function positionMetricPopover(popover, button) {
    const margin = 8;
    const rect = button.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
 
    // Centered under the button, clamped to the viewport horizontally
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
 
    // Below the button, unless it doesn't fit and there is room above
    let top = rect.bottom + margin;
    if (top + height > window.innerHeight && rect.top - margin - height > 0) {
        top = rect.top - margin - height;
    }
 
    popover.style.left = `${left + window.scrollX}px`;
    popover.style.top = `${top + window.scrollY}px`;
}
 
function openMetricInfo(button) {
    const info = METRIC_INFO[button.dataset.metric];
 
    if (!info) {
        console.warn(`No explanation defined for metric "${button.dataset.metric}".`);
        return;
    }
 
    closeMetricInfo();
 
    const popover = buildMetricPopover(info);
    document.body.appendChild(popover);
    positionMetricPopover(popover, button);
    button.setAttribute("aria-expanded", "true");
 
    // Clicks on the popover or on any info button don't count as "outside":
    // the click handler below decides whether to toggle or switch to another metric.
    const insideInfo = {
        contains: (target) =>
            popover.contains(target) ||
            (target instanceof Element && target.closest(".metric-info") !== null)
    };
 
    const stopDismiss = enableDismiss(insideInfo, closeMetricInfo);
 
    activeInfo = { button, popover, stopDismiss };
}
 
document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
 
    const button = event.target.closest(".metric-info");
    if (!button) return;
 
    event.preventDefault();
 
    // Clicking the same button again closes the popover
    if (activeInfo && activeInfo.button === button) {
        closeMetricInfo();
        return;
    }
 
    openMetricInfo(button);
});
 
window.addEventListener("resize", closeMetricInfo);
 
for (const button of document.querySelectorAll(".metric-info")) {
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
}
 

// Loading overlay
const overlay = document.getElementById("loadingOverlay");


// ==========================================
// REUSABLE HELPERS
// ==========================================

/*
Reusable helper: calls onClose when the user presses Esc or clicks outside `element`.
- canDismiss: optional function, return false to temporarily block dismissing (e.g. while loading).
- Returns a cleanup function that stops listening without calling onClose.
*/
function enableDismiss(element, onClose, canDismiss = () => true) {
    function cleanup() {
        document.removeEventListener("mousedown", onOutsideClick);
        document.removeEventListener("keydown", onEscape);
    }

    function dismiss() {
        if (!canDismiss()) return;
        cleanup();
        onClose();
    }

    function onOutsideClick(event) {
        if (!element.contains(event.target)) dismiss();
    }

    function onEscape(event) {
        if (event.key === "Escape") dismiss();
    }

    // mousedown (not click) so the click that opened the element doesn't immediately close it
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);

    return cleanup;
}


function formatMetric(value, suffix = "") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "N/A";
    }

    return `${value.toFixed(2)}${suffix}`;
}


function displayValue(elementId, value) {
    document.querySelector(`#${elementId}`).textContent = value;
}


function formatTimestamp(timestamp) {
    if (!timestamp) {
        return null;
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });
}


// ==========================================
// 4. API REQUESTS
// ==========================================

async function fetchAnalysis(ticker) {
    const response = await fetch(
        `http://127.0.0.1:8000/company/${ticker}`
    );

    if (!response.ok) {
        throw new Error("Unable to retrieve company data.");
    }

    const data = await response.json();
    return data;
}


async function addCompany(ticker, quantAnalysis, qualAnalysis, lastFinancialsRefresh) {
    const response = await fetch(
        `http://127.0.0.1:8000/watchlist/${ticker}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                quant_analysis: quantAnalysis,
                last_financials_refresh: lastFinancialsRefresh,
                qual_analysis: qualAnalysis
            })
        }
    );

    if (!response.ok) {
        throw new Error("Unable to add company to watchlist.");
    }

    const data = await response.json();
    displayTimestamps(data);
    await loadWatchlist();
}


async function deleteCompany(ticker) {
    const response = await fetch(
        `http://127.0.0.1:8000/watchlist/${ticker}`,
        {
            method: "DELETE"
        }
    );

    if (!response.ok) {
        throw new Error("Unable to delete company from watchlist");
    }

    await loadWatchlist();
}

// ==========================================
// TAB SWITCHING LOGIC
// ==========================================

function switchAnalysisTab(tab) {
    for (const key of Object.keys(tabs)) {
        const isActive = key === tab;

        tabs[key].panel.classList.toggle("is-hidden", !isActive);

        tabs[key].tab.classList.toggle("is-active", isActive);

        tabs[key].tab.setAttribute("aria-selected", String(isActive));
    }
}

// ==========================================
// WATCHLIST DATA AND RENDERING
// ==========================================

async function loadWatchlist() {
    watchlistCompanies.replaceChildren();

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/watchlist`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve watchlist data.");
        }

        const watchlist = await response.json();

        if (watchlist.length === 0) {
            watchlistCompanies.appendChild(watchlistEmpty);
            watchlistEmpty.textContent = "Your watchlist is empty. Analyze a company and add it to your watchlist to keep its analysis saved here.";
        }
        else {
            for (const company of watchlist) {
                const ticker = company.ticker;
                const name = company.name;
                const companyElement = document.createElement("div");
                const companyElementDelete = document.createElement("button");

                companyElement.classList.add("watchlist-item");
                companyElement.textContent = `${ticker} - ${name}`;

                companyElement.addEventListener("click", async () => {
                    welcomeMessage.classList.add("is-hidden");
                    statusMessage.classList.add("is-hidden");

                    const data = await fetchAnalysis(ticker);
                    currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
                    populateQualAnalysis();
                    displayAnalysis(data);
                });

                companyElementDelete.classList.add("watchlistItem-delete");
                companyElementDelete.innerHTML = '<i data-lucide="trash-2"></i>';

                companyElementDelete.addEventListener("click", async (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    const confirmed = confirm(
                        "Are you sure you want to remove this company from your watchlist? This will delete all your past analyses"
                    );

                    if (!confirmed) {
                        return;
                    }

                    try {
                        await deleteCompany(ticker);

                        saveCompany.classList.remove("is-hidden");
                        watchlistActions.classList.add("is-hidden");

                    } catch (error) {
                        statusMessage.textContent =
                            "Unable to delete company data.";
                        statusMessage.classList.remove("is-hidden");
                        console.error(error);
                    }
                });

                companyElement.appendChild(companyElementDelete);
                watchlistCompanies.appendChild(companyElement);
            }

            lucide.createIcons();
        }

    } catch (error) {
        console.error(error);
    }
}


// ==========================================
// COMPANY ANALYSIS RENDERING
// ==========================================

function displayAnalysis(data) {
    currentQuantAnalysis = data.quant_analysis;
    currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
    lastFinancialsRefresh = data.last_financials_refresh;

    
    displayTimestamps(data);

    tickerInput.value = currentQuantAnalysis.ticker;

    if (data.in_watchlist) {
        saveCompany.classList.add("is-hidden");
        watchlistActions.classList.remove("is-hidden");
    } else {
        saveCompany.classList.remove("is-hidden");
        watchlistActions.classList.add("is-hidden");
    }

    analysisContent.classList.remove("is-hidden");
    statusMessage.classList.add("is-hidden");


    // --------------------------------------
    // Company overview
    // --------------------------------------

    displayValue("company-name", currentQuantAnalysis.profile.name ?? "N/A");
    displayValue("company-ticker", currentQuantAnalysis.ticker ?? "N/A");
    displayValue("share-price", `$${formatMetric(currentQuantAnalysis.profile.price)}`);

    displayValue(
        "market-cap",
        currentQuantAnalysis.profile.market_cap != null
            ? `$${formatMetric(currentQuantAnalysis.profile.market_cap / 1e12, "T")}`
            : "N/A"
    );

    displayValue("company-ceo", currentQuantAnalysis.profile.ceo ?? "N/A");


    // --------------------------------------
    // Financial strength
    // --------------------------------------

    displayValue(
        "cash",
        currentQuantAnalysis.financial_strength.cash != null
            ? `$${formatMetric(currentQuantAnalysis.financial_strength.cash / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "total-debt",
        currentQuantAnalysis.financial_strength.total_debt != null
            ? `$${formatMetric(currentQuantAnalysis.financial_strength.total_debt / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "net-debt",
        currentQuantAnalysis.financial_strength.net_debt != null
            ? `$${formatMetric(currentQuantAnalysis.financial_strength.net_debt / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "debt-equity",
        formatMetric(currentQuantAnalysis.financial_strength.debt_to_equity, "x")
    );

    displayValue(
        "current-ratio",
        formatMetric(currentQuantAnalysis.financial_strength.current_ratio, "x")
    );

    displayValue(
        "interest-coverage",
        formatMetric(currentQuantAnalysis.financial_strength.interest_coverage, "x")
    );


    // --------------------------------------
    // Profitability and growth
    // --------------------------------------

    displayValue(
        "revenue-cagr-5y",
        formatMetric(currentQuantAnalysis.profitability["Revenue 5Y CAGR"], "%")
    );

    displayValue(
        "revenue-cagr-3y",
        formatMetric(currentQuantAnalysis.profitability["Revenue 3Y CAGR"], "%")
    );

    displayValue(
        "revenue-yoy",
        formatMetric(currentQuantAnalysis.profitability["Revenue YoY Growth"], "%")
    );

    displayValue(
        "eps-cagr-5y",
        formatMetric(currentQuantAnalysis.profitability["EPS 5Y CAGR"], "%")
    );

    displayValue(
        "eps-cagr-3y",
        formatMetric(currentQuantAnalysis.profitability["EPS 3Y CAGR"], "%")
    );

    displayValue(
        "eps-yoy",
        formatMetric(currentQuantAnalysis.profitability["EPS YoY Growth"], "%")
    );

    displayValue(
        "gross-margin",
        formatMetric(currentQuantAnalysis.profitability["Gross Margin"], "%")
    );

    displayValue(
        "operating-margin",
        formatMetric(currentQuantAnalysis.profitability["Operating Margin"], "%")
    );

    displayValue(
        "free-cash-flow",
        currentQuantAnalysis.profitability["Free Cashflow"] != null
            ? `$${formatMetric(currentQuantAnalysis.profitability["Free Cashflow"] / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "fcf-margin",
        formatMetric(currentQuantAnalysis.profitability["FCF Margin"], "%")
    );

    displayValue(
        "fcf-yoy",
        formatMetric(currentQuantAnalysis.profitability["FCF YoY Growth"], "%")
    );

    displayValue("roe", formatMetric(currentQuantAnalysis.profitability["ROE"], "%"));
    displayValue("roic", formatMetric(currentQuantAnalysis.profitability["ROIC"], "%"));


    // --------------------------------------
    // Valuation multiples
    // --------------------------------------

    displayValue("pe-ratio", formatMetric(currentQuantAnalysis.valuation["P/E"], "x"));
    displayValue("p-fcf", formatMetric(currentQuantAnalysis.valuation["P/FCF"], "x"));

    displayValue(
        "ev-ebitda",
        formatMetric(currentQuantAnalysis.valuation["EV/EBITDA"], "x")
    );

    displayValue("p-b", formatMetric(currentQuantAnalysis.valuation["P/B"], "x"));


    // --------------------------------------
    // Intrinsic value estimates
    // --------------------------------------

    displayHistoricalRevenueChart(currentQuantAnalysis.history);
    displayHistoricalEPSChart(currentQuantAnalysis.history);
    displayHistoricalGrossMarginChart(currentQuantAnalysis.history);
    displayHistoricalOperatingMarginChart(currentQuantAnalysis.history);
    displayHistoricalFCFChart(currentQuantAnalysis.history);
    displayHistoricalFCFMarginChart(currentQuantAnalysis.history);
    displayHistoricalPEChart(currentQuantAnalysis.history);
    displayHistoricalPFCFChart(currentQuantAnalysis.history);
    displayHistoricalEVEBITDAChart(currentQuantAnalysis.history);
    displayHistoricalPBChart(currentQuantAnalysis.history);

    // --------------------------------------
    // DCF
    // --------------------------------------
    displayDcfScenarios();
    displayDcfForecastChart("base");
    const selectedScenario = document.querySelector(".dcf-scenario.is-active")?.dataset.scenario || "base";

    displayDcfAssumptions(selectedScenario);
}

function displayTimestamps(data) {
    const savedAt = document.getElementById("analysis-last-saved");
    const refreshedAt = document.getElementById("financials-last-refreshed");

    savedAt.textContent = `Last saved: ${formatTimestamp(data.updated_at) ?? "Not saved yet"}`;
refreshedAt.textContent = `Last refreshed: ${formatTimestamp(data.last_financials_refresh) ?? "Not refreshed yet"}`;
}

function displayHistoricalRevenueChart(history) {
    const revenueChart = document.querySelector("#historical-revenue-chart")
    
    if (historicalCharts.revenue) {
        historicalCharts.revenue.destroy();
    }
    historicalCharts.revenue = new Chart(revenueChart, {
    type: "bar",
    
    data: {
        labels: history.years,
        datasets: [{
            label: "Revenue",
            data: history.revenue,
            backgroundColor: "#c8a45c",
            hoverBackgroundColor: "#d8b872",
            borderRadius: 2,
        }]
    },
    options: {
    responsive: true,
    maintainAspectRatio: true,

    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    return (context.parsed.y / 1e9).toFixed(1) + "B";
                }
            }
        }
    },

    scales: {
        x: {
            grid: {
                display: false
            },
            border: {
                display: false
            },
            ticks: {
                color: "#9a958a",
                font: {
                    family: "Inter, sans-serif",
                    size: 11
                }
            }
        },

        y: {
            beginAtZero: true,
            grid: {
                color: "#2a2926"
            },
            border: {
                display: false
            },
            ticks: {
                color: "#9a958a",
                font: {
                    family: "Inter, sans-serif",
                    size: 11
                },
                callback: function(value) {
                    return (value / 1e9).toFixed(0) + "B";
                }
            }
        }
    }
}
});
}
function displayHistoricalEPSChart(history) {
    const epsChart = document.querySelector("#historical-eps-chart");
    if (historicalCharts.eps) {
        historicalCharts.eps.destroy();
    }
    historicalCharts.eps = new Chart(epsChart, {
        type: "bar",

        data: {
            labels: history.years,
            datasets: [{
                label: "EPS",
                data: history.eps,
                backgroundColor: "#c8a45c",
                hoverBackgroundColor: "#d8b872",
                borderRadius: 2,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return "$" + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return "$" + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalGrossMarginChart(history) {
    const grossMarginChart = document.querySelector("#historical-gross-margin-chart");

    if (historicalCharts.grossMargin) {
        historicalCharts.grossMargin.destroy();
    }
    historicalCharts.grossMargin = new Chart(grossMarginChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "Gross Margin",
                data: history.gross_margin,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "%";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalOperatingMarginChart(history) {
    const operatingMarginChart = document.querySelector("#historical-operating-margin-chart");

    if (historicalCharts.operatingMargin) {
        historicalCharts.operatingMargin.destroy();
    }
    historicalCharts.operatingMargin = new Chart(operatingMarginChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "Operating Margin",
                data: history.operating_margin,
                borderColor: "#7fb58a",
                backgroundColor: "#7fb58a",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#7fb58a",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "%";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalFCFChart(history) {
    const fcfChart = document.querySelector("#historical-fcf-chart");

    if (historicalCharts.fcf) {
        historicalCharts.fcf.destroy();
    }
    historicalCharts.fcf = new Chart(fcfChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "Free Cash Flow",
                data: history.fcf,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return "$" + (context.parsed.y / 1e9).toFixed(1) + "B";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return (value / 1e9).toFixed(0) + "B";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalFCFMarginChart(history) {
    const fcfMarginChart = document.querySelector("#historical-fcf-margin-chart");

    if (historicalCharts.fcfMargin) {
        historicalCharts.fcfMargin.destroy();
    }
    historicalCharts.fcfMargin = new Chart(fcfMarginChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "FCF Margin",
                data: history.fcf_margin,
                borderColor: "#7fb58a",
                backgroundColor: "#7fb58a",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#7fb58a",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "%";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalPEChart(history) {
    const peChart = document.querySelector("#historical-pe-chart");

    if (historicalCharts.pe) {
        historicalCharts.pe.destroy();
    }
    historicalCharts.pe = new Chart(peChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "P/E",
                data: history.pe,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalPFCFChart(history) {
    const pfcfChart = document.querySelector("#historical-p-fcf-chart");

    if (historicalCharts.pfcf) {
        historicalCharts.pfcf.destroy();
    }
    historicalCharts.pfcf = new Chart(pfcfChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "P/FCF",
                data: history.p_fcf,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalEVEBITDAChart(history) {
    const evEbitdaChart = document.querySelector("#historical-ev-ebitda-chart");

    if (historicalCharts.evEbitda) {
        historicalCharts.evEbitda.destroy();
    }
    historicalCharts.evEbitda = new Chart(evEbitdaChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "EV/EBITDA",
                data: history.ev_ebitda,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalPBChart(history) {
    const pbChart = document.querySelector("#historical-p-b-chart");

    if (historicalCharts.pb) {
        historicalCharts.pb.destroy();
    }
    historicalCharts.pb = new Chart(pbChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "P/B",
                data: history.p_b,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}

// ==========================================
// Qual analysis
// ==========================================

function collectQualAnalysis() {
    for (const [section, fieldIds] of Object.entries(qualitativeFieldMap)) {
        for (const fieldId of fieldIds) {
            currentQualAnalysis[section][fieldId] =
                document.getElementById(fieldId).value;
        }
    }

    return currentQualAnalysis;
}
function populateQualAnalysis() {
    for (const [section, fieldIds] of Object.entries(qualitativeFieldMap)) {
        for (const fieldId of fieldIds) {
            document.getElementById(fieldId).value =
                currentQualAnalysis[section][fieldId];
        }
    }
}
function createEmptyQualAnalysis() {
    const analysis = {};

    for (const [section, fieldIds] of Object.entries(qualitativeFieldMap)) {
        analysis[section] = {};

        for (const fieldId of fieldIds) {
            analysis[section][fieldId] = "";
        }
    }

    return analysis;
}

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
            const selectedScenario = container.dataset.selectedScenario;
            const scenarioData = currentQuantAnalysis.dcf.scenarios[selectedScenario];

            if (assumptionKey === "revenue_growth") {
                explanation.innerHTML = explainRevenueGrowth(scenarioData);

            } else if (assumptionKey === "operating_margin") {
                explanation.innerHTML = explainOperatingMargin(scenarioData);

            } else if (assumptionKey === "tax_rate") {
                explanation.innerHTML = explainTaxRate(scenarioData);
            } else if (assumptionKey === "da_rate") {
                explanation.innerHTML = explainDaRate(scenarioData);
            }  else if (assumptionKey === "capex_rate") {
                explanation.innerHTML = explainCapexRate(scenarioData);
            } else if (assumptionKey === "nwc_rate") {
                explanation.innerHTML = explainNwcRate(scenarioData);
            } else if (assumptionKey === "wacc") {
                console.log(scenarioData.assumptions.wacc_details);
                explanation.innerHTML = explainWacc(scenarioData);
            } else if (assumptionKey === "terminal_growth") {
                explanation.innerHTML = explainTerminalGrowth(scenarioData);
            }
        } // Closes isOpening

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

    const has5y = revenueGrowth["5y_cagr"] !== null &&
                  revenueGrowth["5y_cagr"] !== undefined;

    const has3y = revenueGrowth["3y_cagr"] !== null &&
                  revenueGrowth["3y_cagr"] !== undefined;

    const hasForecast = revenueGrowth.forecast !== null &&
                        revenueGrowth.forecast !== undefined;

    return `
        <div class="assumption-explanation-content">

            <div class="assumption-explanation-intro">
                <h4>How is Revenue Growth calculated?</h4>

                <p>
                    Intrinsic establishes its revenue growth assumption by
                    averaging the company's 5-year and 3-year historical
                    revenue CAGRs. Both periods receive equal weight,
                    balancing long-term performance with more recent trends.
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

                    <div class="assumption-explanation-row">
                        <span>5-year CAGR</span>
                        <span>${formatPercent(revenueGrowth["5y_cagr"])}</span>
                        <span>50%</span>
                    </div>

                    <div class="assumption-explanation-row">
                        <span>3-year CAGR</span>
                        <span>${formatPercent(revenueGrowth["3y_cagr"])}</span>
                        <span>50%</span>
                    </div>

                </div>
            </div>

            <div class="assumption-explanation-formula">
                <h5>Average growth calculation</h5>

                ${has5y && has3y ? `
                    <p>
                        (${formatPercent(revenueGrowth["5y_cagr"])} × 50%)
                        +
                        (${formatPercent(revenueGrowth["3y_cagr"])} × 50%)
                    </p>
                ` : `
                    <p>
                        The calculation requires both the 5-year and
                        3-year revenue CAGR.
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
                    Intrinsic establishes its operating margin assumption using a
                    weighted average of historical operating margin performance.
                    This assumption is then applied to projected revenue throughout
                    the forecast period.
                </p>
            </div>

            ${isDefault ? `
                <div class="assumption-explanation-warning">
                    A default value was used instead of a calculated forecast.
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
                    <span>Operating margin assumption</span>
                    <strong>${formatPercent(operatingMargin.forecast)}</strong>
                </div>
            </div>
            

            <div class="assumption-explanation-result">
                <div>
                    <span>Forecast operating margin</span>
                    <p>Weighted historical average</p>
                </div>

                <strong>${formatPercent(operatingMargin.forecast)}</strong>
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
                    Intrinsic establishes its tax rate assumption using a
                    weighted average of historical annual tax rates.
                    Longer-term averages provide historical context, while
                    the latest available year receives additional weight.
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
                    <span>Tax rate assumption</span>
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
                    and amortization as a percentage of revenue. The forecast
                    assumption is based on a weighted average of historical
                    D&A rates.
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
                    <span>D&A / Revenue assumption</span>
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
                    expenditures as a percentage of revenue. The forecast
                    assumption is based on a weighted average of historical
                    CapEx rates.
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
                    <span>CapEx / Revenue assumption</span>
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
                    The forecast assumption is based on a weighted average
                    of historical NWC ratios.
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
                    <span>NWC / Revenue assumption</span>
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
                        <span>Calculated WACC</span>
                        <span>${hasCalculatedWacc
                            ? formatPercent(details.calculated_wacc)
                            : "Not available"}</span>
                    </div>

                </div>

                <div class="assumption-explanation-result">
                    <span>WACC used in this scenario</span>
                    <strong>${formatPercent(details.wacc)}</strong>
                </div>

                ${isDefault ? `
                    <p>
                        The scenario WACC is based on the default value,
                        adjusted according to the selected scenario.
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
                    historical financial averages.
                </p>
            </div>

            <div class="assumption-explanation-inputs">
                <h5>Scenario assumptions</h5>

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
                    <span>Terminal growth assumption</span>
                    <strong>${hasTerminalGrowth
                        ? formatPercent(terminalGrowth)
                        : "Not available"}</strong>
                </div>
            </div>

        </div>
    `;
}

// ==========================================
//  TAB SWITCHING BUTTONS
// ==========================================

for (const key of Object.keys(tabs)) {
    tabs[key].tab.addEventListener("click", () => {
        switchAnalysisTab(key);
    });
}

// ==========================================
//  METRIC INFO BUTTONS
// ==========================================

metricInfoButtons.forEach((button) => {
    button.addEventListener("click", () => {

        const metric = button.dataset.metric
        const explanation = metricExplanations[metric]
        metricInfoContent.innerHTML = explanation.replace(
            /(What is [^?\n]+\?|Our formula:|What it means:)/g,
            "<strong>$1</strong>"
        );

       metricInfoOverlay.classList.remove("is-hidden");
       
       closeMetricInfoButton.addEventListener("click", () => {
            metricInfoOverlay.classList.add("is-hidden");
        });

        enableDismiss(metricInfoModal, () => {
            metricInfoOverlay.classList.add("is-hidden")
        });
    });
});

// ==========================================
//  SEARCH EVENT LISTENER
// ==========================================

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (event.submitter !== analyzeButton) {
        return;
    }

    analysisContent.classList.add("is-hidden");
    welcomeMessage.classList.add("is-hidden");
    statusMessage.textContent = "Analyzing company...";
    statusMessage.classList.remove("is-hidden");
    analyzeButton.disabled = true;

    const ticker = tickerInput.value.trim().toUpperCase();

    try {
    const data = await fetchAnalysis(ticker);
    currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
    populateQualAnalysis();
    displayAnalysis(data);


    } catch (error) {
        statusMessage.textContent =
            "Unable to analyze this company. Check the ticker and try again.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);

    } finally {
        analyzeButton.disabled = false;
    }
});


// ==========================================
// WATCHLIST BUTTON EVENT LISTENERS
// ==========================================

// update financials
refreshfFinancials.addEventListener("click", async (event) => {
    analysisContent.classList.add("is-hidden");
    welcomeMessage.classList.add("is-hidden");
    statusMessage.textContent = "Updating financials...";
    statusMessage.classList.remove("is-hidden");
    refreshfFinancials.disabled = true;

    const ticker = currentQuantAnalysis.ticker;

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/watchlist/${ticker}`,
            { method: "PUT" }
        );

        if (!response.ok) {
            throw new Error("Unable to refresh financials.");
        }

        const data = await response.json();

        displayTimestamps(data)
        displayAnalysis(data);
    } catch (error) {
    statusMessage.textContent = "Unable to refresh financials.";
    statusMessage.classList.remove("is-hidden");
    console.error(error);
    } finally {
        refreshfFinancials.disabled = false;
    }
})

// Save company to watchlist
saveCompany.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
        collectQualAnalysis();
        await addCompany(currentQuantAnalysis.ticker, currentQuantAnalysis, currentQualAnalysis, lastFinancialsRefresh);

        // Ensure the content remains visible
        welcomeMessage.classList.add("is-hidden");
        analysisContent.classList.remove("is-hidden");

        // Hide the save button and display the watchlist actions
        saveCompany.classList.add("is-hidden");
        watchlistActions.classList.remove("is-hidden");

    } catch (error) {
        console.error("Error adding to watchlist:", error);
    }
});


// Update saved company analysis
updateCompany.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
        collectQualAnalysis()
        await addCompany(currentQuantAnalysis.ticker, currentQuantAnalysis, currentQualAnalysis, lastFinancialsRefresh);;

        const originalText = updateCompany.textContent;
        updateCompany.textContent = "Analysis saved!";

        setTimeout(() => {
            updateCompany.textContent = originalText;
        }, 3000);

    } catch (error) {
        console.error("Error saving analysis:", error);
    }
});


// Remove company from watchlist
removeCompany.addEventListener("click", async (event) => {
    event.preventDefault();

    const confirmed = confirm(
        "Are you sure you want to remove this company from your watchlist? This will delete all your past analyses"
    );

    if (!confirmed) {
        return;
    }

    removeCompany.disabled = true;

    const ticker = currentQuantAnalysis.ticker;

    try {
        await deleteCompany(ticker);

        saveCompany.classList.remove("is-hidden");
        watchlistActions.classList.add("is-hidden");

    } catch (error) {
        statusMessage.textContent =
            "Unable to delete company data.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);

    } finally {
        removeCompany.disabled = false;
    }
});


// Add company to watchlist using the sidebar
watchlistAdd.addEventListener("click", () => {

    // Already open: do nothing
    if (document.querySelector(".watchlist-input")) return;

    // Keep the original nodes (not an HTML string) so their event listeners survive
    const originalNodes = [...watchlistHeader.childNodes];
    const restoreHeader = () => watchlistHeader.replaceChildren(...originalNodes);

    const watchlistInput = document.createElement("input");
    watchlistInput.className = "watchlist-input";
    watchlistInput.placeholder = "Ticker (e.g. AAPL)";

    watchlistHeader.replaceChildren(watchlistInput);
    watchlistInput.focus();

    let loading = false;

    // Esc / click outside closes the input, except while a request is running
    const stopDismiss = enableDismiss(watchlistInput, restoreHeader, () => !loading);

    watchlistInput.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter" || loading) return;

        const ticker = watchlistInput.value.trim().toUpperCase();
        if (!ticker) return;

        loading = true;
        overlay.classList.remove("is-hidden");

        try {
            const data = await fetchAnalysis(ticker);
            await addCompany(
                ticker,
                data.quant_analysis,
                data.qual_analysis,
                data.last_financials_refresh
            );

            // Success: stop listening, then close the input
            stopDismiss();
            restoreHeader();

        } catch (error) {
            console.error("Error adding company to watchlist:", error);
            alert(`Unable to add ${ticker} to your watchlist. Please check the ticker and try again.`);

        } finally {
            loading = false;
            overlay.classList.add("is-hidden");
        }
    });
});

// ==========================================
//  DCF panel listeners
// ==========================================

dcfScenarioButtons.forEach(button => {
    button.addEventListener("click", () => {
        dcfScenarioButtons.forEach(button => {
            button.classList.remove("is-active");
        });

        button.classList.add("is-active");

        displayDcfForecastChart(button.dataset.scenario);
        displayDcfAssumptions(button.dataset.scenario);
    });
});

document.querySelector("#close-assumption-explanation")
    ?.addEventListener("click", closeAssumptionExplanation);


// ==========================================
// 9. INITIALIZATION
// ==========================================

loadWatchlist();

lucide.createIcons();