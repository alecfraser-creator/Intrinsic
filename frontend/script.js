// ==========================================
// GLOBAL STATE
// ==========================================

let currentAnalysis = null;


// ==========================================
// DOM ELEMENTS
// ==========================================

// Search and analysis
const searchForm = document.querySelector("#search-form");
const tickerInput = document.querySelector("#ticker-input");
const analyzeButton = document.querySelector("#analyze-button");
const analysisContent = document.querySelector("#analysis-content");
const welcomeMessage = document.querySelector("#welcome-message");
const statusMessage = document.querySelector("#status-message");

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
    console.log("API history:", data.analysis.history);
    return data;
}


async function addCompany(ticker, analysis) {
    const response = await fetch(
        `http://127.0.0.1:8000/watchlist/${ticker}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(analysis)
        }
    );

    if (!response.ok) {
        throw new Error("Unable to add company to watchlist.");
    }

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
    currentAnalysis = data.analysis;

    tickerInput.value = currentAnalysis.ticker;

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

    displayValue("company-name", currentAnalysis.profile.name ?? "N/A");
    displayValue("company-ticker", currentAnalysis.ticker ?? "N/A");
    displayValue("share-price", `$${formatMetric(currentAnalysis.profile.price)}`);

    displayValue(
        "market-cap",
        currentAnalysis.profile.market_cap != null
            ? `$${formatMetric(currentAnalysis.profile.market_cap / 1e12, "T")}`
            : "N/A"
    );

    displayValue("company-ceo", currentAnalysis.profile.ceo ?? "N/A");


    // --------------------------------------
    // Financial strength
    // --------------------------------------

    displayValue(
        "cash",
        currentAnalysis.financial_strength.cash != null
            ? `$${formatMetric(currentAnalysis.financial_strength.cash / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "total-debt",
        currentAnalysis.financial_strength.total_debt != null
            ? `$${formatMetric(currentAnalysis.financial_strength.total_debt / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "net-debt",
        currentAnalysis.financial_strength.net_debt != null
            ? `$${formatMetric(currentAnalysis.financial_strength.net_debt / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "debt-equity",
        formatMetric(currentAnalysis.financial_strength.debt_to_equity, "x")
    );

    displayValue(
        "current-ratio",
        formatMetric(currentAnalysis.financial_strength.current_ratio, "x")
    );

    displayValue(
        "interest-coverage",
        formatMetric(currentAnalysis.financial_strength.interest_coverage, "x")
    );


    // --------------------------------------
    // Profitability and growth
    // --------------------------------------

    displayValue(
        "revenue-cagr-5y",
        formatMetric(currentAnalysis.profitability["Revenue 5Y CAGR"], "%")
    );

    displayValue(
        "revenue-cagr-3y",
        formatMetric(currentAnalysis.profitability["Revenue 3Y CAGR"], "%")
    );

    displayValue(
        "revenue-yoy",
        formatMetric(currentAnalysis.profitability["Revenue YoY Growth"], "%")
    );

    displayValue(
        "eps-cagr-5y",
        formatMetric(currentAnalysis.profitability["EPS 5Y CAGR"], "%")
    );

    displayValue(
        "eps-cagr-3y",
        formatMetric(currentAnalysis.profitability["EPS 3Y CAGR"], "%")
    );

    displayValue(
        "eps-yoy",
        formatMetric(currentAnalysis.profitability["EPS YoY Growth"], "%")
    );

    displayValue(
        "gross-margin",
        formatMetric(currentAnalysis.profitability["Gross Margin"], "%")
    );

    displayValue(
        "operating-margin",
        formatMetric(currentAnalysis.profitability["Operating Margin"], "%")
    );

    displayValue(
        "free-cash-flow",
        currentAnalysis.profitability["Free Cashflow"] != null
            ? `$${formatMetric(currentAnalysis.profitability["Free Cashflow"] / 1e9, "B")}`
            : "N/A"
    );

    displayValue(
        "fcf-margin",
        formatMetric(currentAnalysis.profitability["FCF Margin"], "%")
    );

    displayValue(
        "fcf-yoy",
        formatMetric(currentAnalysis.profitability["FCF YoY Growth"], "%")
    );

    displayValue("roe", formatMetric(currentAnalysis.profitability["ROE"], "%"));
    displayValue("roic", formatMetric(currentAnalysis.profitability["ROIC"], "%"));


    // --------------------------------------
    // Valuation multiples
    // --------------------------------------

    displayValue("pe-ratio", formatMetric(currentAnalysis.valuation["P/E"], "x"));
    displayValue("p-fcf", formatMetric(currentAnalysis.valuation["P/FCF"], "x"));

    displayValue(
        "ev-ebitda",
        formatMetric(currentAnalysis.valuation["EV/EBITDA"], "x")
    );

    displayValue("p-b", formatMetric(currentAnalysis.valuation["P/B"], "x"));


    // --------------------------------------
    // Intrinsic value estimates
    // --------------------------------------

    displayValue(
        "normalized-earnings-value",
        currentAnalysis.valuation["Normalized Earnings Valuation"] != null
            ? `$${formatMetric(currentAnalysis.valuation["Normalized Earnings Valuation"])}`
            : "N/A"
    );

    displayValue(
        "dcf-value",
        currentAnalysis.valuation["Discounted Cash Flow (DCF) Valuation"] != null
            ? `$${formatMetric(currentAnalysis.valuation["Discounted Cash Flow (DCF) Valuation"])}`
            : "N/A"
    );

    displayHistoricalRevenueChart(currentAnalysis.history)
    displayHistoricalEPSChart(currentAnalysis.history)
    displayHistoricalGrossMarginChart(currentAnalysis.history)
    displayHistoricalOperatingMarginChart(currentAnalysis.history)
    displayHistoricalFCFChart(currentAnalysis.history);
    displayHistoricalFCFMarginChart(currentAnalysis.history);
    displayHistoricalPEChart(currentAnalysis.history);
    displayHistoricalPFCFChart(currentAnalysis.history);
    displayHistoricalEVEBITDAChart(currentAnalysis.history);
    displayHistoricalPBChart(currentAnalysis.history);
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

// Save company to watchlist
saveCompany.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
        await addCompany(currentAnalysis.ticker, currentAnalysis);

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

    analysisContent.classList.add("is-hidden");
    welcomeMessage.classList.add("is-hidden");
    statusMessage.textContent = "Updating analysis...";
    statusMessage.classList.remove("is-hidden");
    updateCompany.disabled = true;

    const ticker = currentAnalysis.ticker;

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/watchlist/${ticker}`,
            {
                method: "PUT"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve company data.");
        }

        const data = await response.json();
        displayAnalysis(data);

    } catch (error) {
        statusMessage.textContent =
            "Unable to update the company data.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);

    } finally {
        updateCompany.disabled = false;
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

    const ticker = currentAnalysis.ticker;

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
            await addCompany(ticker, data.analysis);

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

// Make 

// ==========================================
// 9. INITIALIZATION
// ==========================================

loadWatchlist();

lucide.createIcons();