
let currentAnalysis = null;

/*Initial search form and buttons when loading the page and analysing a company*/
const searchForm = document.querySelector("#search-form");
const tickerInput = document.querySelector("#ticker-input");
const analyzeButton = document.querySelector("#analyze-button");
const analysisContent = document.querySelector("#analysis-content");
const welcomeMessage = document.querySelector("#welcome-message");
const statusMessage = document.querySelector("#status-message");

/*Watchlist elements and buttons*/
const watchlistCompanies = document.querySelector("#watchlist-companies");
const watchlistEmpty = document.querySelector(".watchlist-empty");
const watchlistElement = document.querySelector(".watchlist-item")

/*Watchlist related buttons in the analysis*/
const saveCompany = document.querySelector("#save_watchlist");
const watchlistActions = document.querySelector("#watchlist-actions");
const updateCompany = document.querySelector("#update_analysis");
const removeCompany = document.querySelector("#remove_watchlist");


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
                const companyElement = document.createElement("div")
                const companyElementDelete = document.createElement("button")
                companyElement.classList.add("watchlist-item");
                companyElement.textContent = `${ticker} - ${name}`;
                companyElement.addEventListener("click", () => {
                    welcomeMessage.classList.add("is-hidden");
                    statusMessage.classList.add("is-hidden");
                    loadAnalysis(ticker);
                });
                companyElementDelete.classList.add("watchlistItem-delete")
                companyElementDelete.innerHTML = '<i data-lucide="trash-2"></i>';
                companyElementDelete.addEventListener("click", async (event) => {
                    event.stopPropagation()
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
                        watchlistActions.classList.add("is-hidden")

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


async function addCompany(ticker) {

    const response = await fetch(
        `http://127.0.0.1:8000/watchlist/${ticker}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(currentAnalysis)
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


function formatMetric(value, suffix = "") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "N/A";
    }

    return `${value.toFixed(2)}${suffix}`;
}


function displayValue(elementId, value) {
    document.querySelector(`#${elementId}`).textContent = value;
}


async function loadAnalysis(ticker) {
    const response = await fetch(
        `http://127.0.0.1:8000/company/${ticker}`
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error("Unable to retrieve company data.");
    }
    else {
        currentAnalysis = data.analysis;
        tickerInput.value = currentAnalysis.ticker;

        if (data.in_watchlist) {
            saveCompany.classList.add("is-hidden");
            watchlistActions.classList.remove("is-hidden");
        } else {
            saveCompany.classList.remove("is-hidden");
            watchlistActions.classList.add("is-hidden");
        }

        displayAnalysis(currentAnalysis);

        analysisContent.classList.remove("is-hidden");
        statusMessage.classList.add("is-hidden");
    }
}


function displayAnalysis(currentAnalysis) {
    /* Company overview */
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

    /* Financial strength */
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

    /* Profitability and growth */
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

    /* Valuation */
    displayValue("pe-ratio", formatMetric(currentAnalysis.valuation["P/E"], "x"));
    displayValue("p-fcf", formatMetric(currentAnalysis.valuation["P/FCF"], "x"));
    displayValue(
        "ev-ebitda",
        formatMetric(currentAnalysis.valuation["EV/EBITDA"], "x")
    );
    displayValue("p-b", formatMetric(currentAnalysis.valuation["P/B"], "x"));

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
}


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
        await loadAnalysis(ticker);
    } catch (error) {
        statusMessage.textContent =
            "Unable to analyze this company. Check the ticker and try again.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);
    } finally {
        analyzeButton.disabled = false;
    }
});


saveCompany.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
        await addCompany(currentAnalysis.ticker);

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
        currentAnalysis = data.analysis;

        displayAnalysis(currentAnalysis);

        analysisContent.classList.remove("is-hidden");
        statusMessage.classList.add("is-hidden");

    } catch (error) {
        statusMessage.textContent =
            "Unable to update the company data.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);
    } finally {
        updateCompany.disabled = false;
    }
});


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
    }
    finally {
        removeCompany.disabled = false;
    }
});


loadWatchlist();

lucide.createIcons();
