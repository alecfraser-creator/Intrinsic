// ==========================================
// WATCHLIST DATA AND RENDERING
// ==========================================

const sidebar = document.querySelector(".watchlist-sidebar");
const resizeHandle = document.querySelector(".resize-handle");

let isResizing = false;
let startX;
let startWidth;

resizeHandle.addEventListener("mousedown", (event) => {
    isResizing = true;

    startX = event.clientX;
    startWidth = sidebar.getBoundingClientRect().width;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (event) => {
    if (!isResizing) return;

    const difference = event.clientX - startX;
    const newWidth = startWidth + difference;

    const width = Math.min(450, Math.max(200, newWidth));

    document.documentElement.style.setProperty(
        "--sidebar-width",
        `${width}px`
    );
});

document.addEventListener("mouseup", () => {
    isResizing = false;

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
});


async function openWatchlistCompany(ticker) {

    if (isDirty && currentQuantAnalysis) {
        openUnsavedChangesModal(() => openWatchlistCompany(ticker));
        return;
    }
    
    welcomeMessage.classList.add("is-hidden");
    statusMessage.classList.add("is-hidden");

    try {
        const data = await fetchAnalysis(ticker);

        currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
        populateQualAnalysis();
    

        displayAnalysis(data);

        setHistoricalViewMode(false);

        // The new company is freshly loaded, so there is nothing unsaved
        isDirty = false;

    } catch (error) {
        statusMessage.textContent = "Unable to load this company.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);
    }
}

async function displayOldAnalysis (analysis_id) {
    if (isDirty && currentQuantAnalysis) {
        openUnsavedChangesModal(() => displayOldAnalysis(analysis_id));
        return;
    }

    welcomeMessage.classList.add("is-hidden");
    statusMessage.classList.add("is-hidden");

    try {
        const data = await fetchOldAnalysis(analysis_id);
        currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
        populateQualAnalysis();

        displayAnalysis(data);

        setHistoricalViewMode(true);

        // The new company is freshly loaded, so there is nothing unsaved
        isDirty = false;
    } catch (error) {
        if (error.message === "Not logged in") {
            authModal.classList.remove("is-hidden");
        } else {
            statusMessage.textContent = "Unable to load this analysis.";
            statusMessage.classList.remove("is-hidden");
            console.error(error);
        }
    }
}






async function loadWatchlist() {

    // Preserve currently expanded company sections before rebuilding the DOM
    const openCompanies = new Set(
        [...watchlistCompanies.querySelectorAll(".watchlist-history:not(.is-hidden)")]
            .map(container => container.dataset.ticker)
    );

    watchlistCompanies.replaceChildren();

    try {
        // Fetch watchlist
        const response = await authenticatedFetch(
            `${api_url}/watchlist`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve watchlist data.");
        }

        const watchlist = await response.json();

        watchlistTickers = new Set(
            watchlist.companies.map(company => company.ticker)
        );

        // Handle empty watchlist
        if (watchlist.companies.length === 0) {
            watchlistEmpty.textContent =
                "Your watchlist is empty. Analyze a company and add it to your watchlist to keep its analysis saved here.";

            watchlistCompanies.appendChild(watchlistEmpty);

        } else {
            for (const company of watchlist.companies) {
                const ticker = company.ticker;
                const name = company.name;
                const companyHistory = watchlist.history[ticker] ?? [];

                // Create elements
                const companyElement = document.createElement("div");
                const companyHeader = document.createElement("div");
                const historyContainer = document.createElement("div");
                const companyElementDelete = document.createElement("button");
                const historyToggle = document.createElement("button");

                const latestAnalysisContainer = document.createElement("div");
                const latestAnalysisEntry = document.createElement("div");
                const latestAnalysisDate = document.createElement("span");

                const previousAnalysesContainer = document.createElement("div");
                const companyActions = document.createElement("div");

                const latestAnalysisSelect = document.createElement("div");
                const latestAnalysisInfo = document.createElement("div");

                // Assign classes
                companyHeader.classList.add("watchlist-item");
                historyContainer.classList.add("watchlist-history", "is-hidden");

                companyActions.classList.add("watchlistItem-actions");
                companyElementDelete.classList.add("watchlistItem-delete");
                historyToggle.classList.add("history-toggle");

                latestAnalysisContainer.classList.add("analysis-entry", "latest-analysis");
                previousAnalysesContainer.classList.add("previous-analysis-container");

                latestAnalysisSelect.classList.add("analysis-select", "is-hidden");

                // Associate elements with their company
                historyContainer.dataset.ticker = ticker;
                companyHeader.dataset.ticker = ticker;
                companyElementDelete.dataset.ticker = ticker;
                latestAnalysisContainer.dataset.ticker = ticker;
                latestAnalysisSelect.dataset.ticker = ticker

                // Restore expanded state
                if (openCompanies.has(ticker)) {
                    historyContainer.classList.remove("is-hidden");
                    historyToggle.classList.add("is-open");
                }

                // Populate elements
                companyHeader.textContent = `${ticker} - ${name}`;

                companyElementDelete.innerHTML = '<i data-lucide="trash-2"></i>';
                companyElementDelete.setAttribute("aria-label", "Delete company");

                historyToggle.innerHTML = '<i data-lucide="chevron-down"></i>';

                latestAnalysisEntry.textContent = "Latest Analysis";
                latestAnalysisDate.textContent = formatTimestamp(company.updated_at);

                latestAnalysisSelect.innerHTML = '<i data-lucide="square"></i>';

                // Build latest analysis entry
                latestAnalysisInfo.appendChild(latestAnalysisEntry);
                latestAnalysisInfo.appendChild(latestAnalysisDate);

                latestAnalysisContainer.appendChild(latestAnalysisInfo);
                latestAnalysisContainer.appendChild(latestAnalysisSelect);

                // Populate historical analyses
                if (companyHistory.length === 0) {
                    const emptyHistory = document.createElement("span");
                    emptyHistory.textContent = "No previous analyses.";
                    previousAnalysesContainer.appendChild(emptyHistory);
                } else {
                    for (const analysis of companyHistory) {
                        const previousAnalysisEntry = document.createElement("div");
                        const previousAnalysisDate = document.createElement("span");
                        const previousAnalysisDelete = document.createElement("button");
                        const previousAnalysisSelect = document.createElement("div");

                        previousAnalysisEntry.classList.add("analysis-entry");
                        previousAnalysisSelect.classList.add("analysis-select", "is-hidden");

                        previousAnalysisDate.textContent = formatTimestamp(analysis.updated_at);

                        // Associate elements and checkboxes with their analysis
                        previousAnalysisEntry.dataset.analysisId = analysis.analysis_id
                        previousAnalysisSelect.dataset.analysisId = analysis.analysis_id
                        previousAnalysisDelete.dataset.analysisId = analysis.analysis_id

                        previousAnalysisSelect.innerHTML = '<i data-lucide="square"></i>';

                        // Historical analysis delete button
                        previousAnalysisDelete.classList.add("historical-analysis-delete");
                        previousAnalysisDelete.innerHTML = '<i data-lucide="trash-2"></i>';
                        previousAnalysisDelete.setAttribute(
                            "aria-label",
                            "Delete historical analysis"
                        );

                        // Group delete button and checkbox
                        const previousAnalysisActions = document.createElement("div");
                        previousAnalysisActions.classList.add("previous-analysis-actions");

                        previousAnalysisEntry.appendChild(previousAnalysisDate);
                        previousAnalysisActions.appendChild(previousAnalysisDelete);
                        previousAnalysisActions.appendChild(previousAnalysisSelect);
                        previousAnalysisEntry.appendChild(previousAnalysisActions);

                        previousAnalysesContainer.appendChild(previousAnalysisEntry);
                    }
                }

                // Build company structure
                companyElement.appendChild(companyHeader);
                companyElement.appendChild(historyContainer);

                companyActions.appendChild(historyToggle);
                companyActions.appendChild(companyElementDelete);
                companyHeader.appendChild(companyActions);

                historyContainer.appendChild(latestAnalysisContainer);
                historyContainer.appendChild(previousAnalysesContainer);

                // Append company to watchlist
                watchlistCompanies.appendChild(companyElement);
            }

            lucide.createIcons();
        }

    } catch (error) {
        if (error.message === "Not logged in") {
            authModal.classList.remove("is-hidden");
        } else {
            console.error("Error loading watchlist:", error);
        }
    }
}




watchlistCompanies.addEventListener("click", async (event) => {

    // Comparison checkbox
    const analysisSelect = event.target.closest(".analysis-select");

    if (analysisSelect) {
        // Selection logic will go here.
        return;
    }

    // Delete company
    const companyDelete = event.target.closest(".watchlistItem-delete");

    if (companyDelete) {
        event.preventDefault();

        const ticker = companyDelete.dataset.ticker;

        const confirmed = confirm(
            "Are you sure you want to remove this company from your watchlist? This will delete all its past analyses."
        );

        if (!confirmed) return;

        try {
            await deleteCompany(ticker);

            if (currentQuantAnalysis?.ticker === ticker) {
                isSaved = false;
                isDirty = false;
                saveCompany.classList.remove("is-hidden");
                watchlistActions.classList.add("is-hidden");
            }

        } catch (error) {
            if (error.message === "Not logged in") {
                authModal.classList.remove("is-hidden");
            } else {
                statusMessage.textContent = "Unable to delete company data.";
                statusMessage.classList.remove("is-hidden");
                console.error(error);
            }
        }

        return;
    }

    // Delete historical analysis
    const historicalDelete = event.target.closest(".historical-analysis-delete");

    if (historicalDelete) {
        event.preventDefault();

        const analysisId = historicalDelete.dataset.analysisId;

        const confirmed = confirm(
            "Are you sure you want to permanently delete this historical analysis?"
        );

        if (!confirmed) return;

        try {
            await deletePastAnalysis(analysisId);
        } catch (error) {
            if (error.message === "Not logged in") {
                authModal.classList.remove("is-hidden");
            } else {
                statusMessage.textContent =
                    "Unable to delete historical analysis.";
                statusMessage.classList.remove("is-hidden");
                console.error(error);
            }
        }

        return;
    }

    // Open latest analysis
    const latestAnalysis = event.target.closest(".latest-analysis");

    if (latestAnalysis) {
        openWatchlistCompany(latestAnalysis.dataset.ticker);
        return;
    }

    // Open historical analysis
    const previousAnalysis = event.target.closest(".analysis-entry");

    if (previousAnalysis) {
        displayOldAnalysis(previousAnalysis.dataset.analysisId);
        return;
    }

    // Expand / collapse company history
    const companyHeader = event.target.closest(".watchlist-item");

    if (companyHeader) {
        const companyElement = companyHeader.parentElement;
        const historyContainer = companyElement.querySelector(".watchlist-history");
        const historyToggle = companyHeader.querySelector(".history-toggle");

        historyContainer.classList.toggle("is-hidden");
        historyToggle.classList.toggle("is-open");
    }
});
