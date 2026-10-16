const searchForm = document.querySelector("#search-form");
const tickerInput = document.querySelector("#ticker-input");
const analyzeButton = document.querySelector("#analyze-button");
const analysisContent = document.querySelector("#analysis-content");
const welcomeMessage = document.querySelector("#welcome-message");
const statusMessage = document.querySelector("#status-message");

function formatMetric(value, suffix = "") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "N/A";
    }

    return `${value.toFixed(2)}${suffix}`;
}

function displayValue(elementId, value) {
    document.querySelector(`#${elementId}`).textContent = value;
}

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    analysisContent.hidden = true;
    
    welcomeMessage.hidden = true;
    statusMessage.textContent = "Analyzing company...";
    statusMessage.hidden = false;
    analyzeButton.disabled = true;

    const ticker = tickerInput.value.trim().toUpperCase();

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/company/${ticker}`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve company data.");
        }

        const data = await response.json();

        /* Company overview */
        displayValue("company-name", data.profile.name ?? "N/A");
        displayValue("company-ticker", data.ticker ?? "N/A");
        displayValue("share-price", `$${formatMetric(data.profile.price)}`);
        displayValue(
            "market-cap",
            data.profile.market_cap != null
                ? `$${formatMetric(data.profile.market_cap / 1e12, "T")}`
                : "N/A"
        );
        displayValue("company-ceo", data.profile.ceo ?? "N/A");

        /* Financial strength */
        displayValue(
            "cash",
            data.financial_strength.cash != null
                ? `$${formatMetric(data.financial_strength.cash / 1e9, "B")}`
                : "N/A"
        );
        displayValue(
            "total-debt",
            data.financial_strength.total_debt != null
                ? `$${formatMetric(data.financial_strength.total_debt / 1e9, "B")}`
                : "N/A"
        );
        displayValue(
            "net-debt",
            data.financial_strength.net_debt != null
                ? `$${formatMetric(data.financial_strength.net_debt / 1e9, "B")}`
                : "N/A"
        );
        displayValue(
            "debt-equity",
            formatMetric(data.financial_strength.debt_to_equity, "x")
        );
        displayValue(
            "current-ratio",
            formatMetric(data.financial_strength.current_ratio, "x")
        );
        displayValue(
            "interest-coverage",
            formatMetric(data.financial_strength.interest_coverage, "x")
        );

        /* Profitability and growth */
        displayValue(
            "revenue-cagr-4y",
            formatMetric(data.profitability["Revenue 4Y CAGR"], "%")
        );
        displayValue(
            "revenue-cagr-2y",
            formatMetric(data.profitability["Revenue 2Y CAGR"], "%")
        );
        displayValue(
            "revenue-yoy",
            formatMetric(data.profitability["Revenue YoY Growth"], "%")
        );

        displayValue(
            "eps-cagr-4y",
            formatMetric(data.profitability["EPS 4Y CAGR"], "%")
        );
        displayValue(
            "eps-cagr-2y",
            formatMetric(data.profitability["EPS 2Y CAGR"], "%")
        );
        displayValue(
            "eps-yoy",
            formatMetric(data.profitability["EPS YoY Growth"], "%")
        );

        displayValue(
            "gross-margin",
            formatMetric(data.profitability["Gross Margin"], "%")
        );
        displayValue(
            "operating-margin",
            formatMetric(data.profitability["Operating Margin"], "%")
        );
        displayValue(
            "free-cash-flow",
            data.profitability["Free Cashflow"] != null
                ? `$${formatMetric(data.profitability["Free Cashflow"] / 1e9, "B")}`
                : "N/A"
        );
        displayValue(
            "fcf-margin",
            formatMetric(data.profitability["FCF Margin"], "%")
        );
        displayValue(
            "fcf-yoy",
            formatMetric(data.profitability["FCF YoY Growth"], "%")
        );
        displayValue("roe", formatMetric(data.profitability["ROE"], "%"));
        displayValue("roic", formatMetric(data.profitability["ROIC"], "%"));

        /* Valuation */
        displayValue("pe-ratio", formatMetric(data.valuation["P/E"], "x"));
        displayValue("p-fcf", formatMetric(data.valuation["P/FCF"], "x"));
        displayValue(
            "ev-ebitda",
            formatMetric(data.valuation["EV/EBITDA"], "x")
        );
        displayValue("p-b", formatMetric(data.valuation["P/B"], "x"));

        displayValue(
            "normalized-earnings-value",
            data.valuation["Normalized Earnings Valuation"] != null
                ? `$${formatMetric(data.valuation["Normalized Earnings Valuation"])}`
                : "N/A"
        );
        displayValue(
            "dcf-value",
            data.valuation["Discounted Cash Flow (DCF) Valuation"] != null
                ? `$${formatMetric(data.valuation["Discounted Cash Flow (DCF) Valuation"])}`
                : "N/A"
        );

        console.log(data);
        analysisContent.hidden = false;
        statusMessage.hidden = true;
    } catch (error) {
        statusMessage.textContent =
            "Unable to analyze this company. Check the ticker and try again.";
        statusMessage.hidden = false;
        console.error(error);
    } finally {
        analyzeButton.disabled = false;
    }
});