// ==========================================
// COMPANY ANALYSIS RENDERING
// ==========================================

function displayAnalysis(data) {
    currentQuantAnalysis = data.quant_analysis;
    currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
    lastFinancialsRefresh = data.last_financials_refresh;
    currentInWatchlist = data.in_watchlist;
    currentHistoricalData = data.historical_data;

    
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
    // Price chart
    // --------------------------------------
    
    displayPriceChart(currentHistoricalData);

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

    const selectedScenario =
        document.querySelector(".dcf-scenario.is-active")?.dataset.scenario || "base";

    displayDcfForecastChart(selectedScenario);
    displayDcfAssumptions(selectedScenario);
    setupFcffCalculationAccordion()
    displayFcffForecast(
        currentQuantAnalysis.dcf.scenarios[selectedScenario]
    );
    displayDcfValuation(
        currentQuantAnalysis.dcf.scenarios[selectedScenario]
    );
}

function displayTimestamps(data) {
    const savedAt = document.getElementById("analysis-last-saved");
    const refreshedAt = document.getElementById("financials-last-refreshed");

    savedAt.textContent = `Last saved: ${formatTimestamp(data.updated_at) ?? "Not saved yet"}`;
refreshedAt.textContent = `Last refreshed: ${formatTimestamp(data.last_financials_refresh) ?? "Not refreshed yet"}`;
}
