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
