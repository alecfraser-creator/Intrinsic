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
