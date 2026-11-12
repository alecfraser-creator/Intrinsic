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

async function fetchOldAnalysis(analysisId) {
    const response = await fetch(
        `http://127.0.0.1:8000/company/history/${analysisId}`
    )

    if (!response.ok) {
        throw new Error("Unable to retrieve company data.");
    }
    const data = await response.json();
    return data;
}


async function addCompany(ticker, quantAnalysis, qualAnalysis, lastFinancialsRefresh, historicalData, saveMode) {
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
                qual_analysis: qualAnalysis,
                historical_data: historicalData,
                save_mode: saveMode
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

    console.log("Delete response:", response.status, await response.text());

    if (!response.ok) {
        throw new Error("Unable to delete company from watchlist");
    }

    await loadWatchlist();
}

async function deletePastAnalysis(analysisId) {
    const response = await fetch(
        `http://127.0.0.1:8000/watchlist/historical/${analysisId}`,
        {
            method: "DELETE"
        }
    )

    console.log("Delete response:", response.status, await response.text())

    if (!response.ok) {
        throw new Error("Unable to delete analysis from watchlist")
    }

    await loadWatchlist();
}


async function recalculateDcf(
    ticker,
    inWatchlist,
    qualAnalysis,
    lastFinancialRefresh
) {
    const button = document.querySelector("#recalculate-dcf");

    if (!button) return;

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
        const newDcf = data.dcf ??
            data.quant_analysis.dcf;

        // Update the current analysis.
        currentQuantAnalysis.dcf = newDcf;

        currentQuantAnalysis.valuation[
            "Discounted Cash Flow (DCF) Valuation"
        ] = newDcf.intrinsic_value_per_share;


        // Refresh the DCF UI.
        const container = document.querySelector(
            "#dcf-assumptions-section"
        );

        const selectedScenario =
            container.dataset.selectedScenario || "base";

        displayDcfScenarios();
        displayDcfForecastChart(selectedScenario);
        displayDcfAssumptions(selectedScenario);

    } catch (error) {
        console.error("DCF recalculation failed:", error);
        alert("Unable to recalculate DCF. Please try again.");

    } finally {
        button.disabled = false;
        button.textContent = "Recalculate DCF";
    }
}

function setupDcfRecalculation(
    ticker,
    inWatchlist,
    qualAnalysis,
    lastFinancialRefresh
) {
    const button = document.querySelector("#recalculate-dcf");

    if (!button) return;

    button.addEventListener("click", () => {
        recalculateDcf(
            ticker,
            inWatchlist,
            qualAnalysis,
            lastFinancialRefresh
        );
    });
}