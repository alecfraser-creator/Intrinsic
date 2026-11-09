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

async function displayOldAnalysis (id) {
    if (isDirty && currentQuantAnalysis) {
        openUnsavedChangesModal(() => displayOldAnalysis(id));
        return;
    }

    welcomeMessage.classList.add("is-hidden");
    statusMessage.classList.add("is-hidden");

    try {
        const data = await fetchOldAnalysis(id);
        currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
        populateQualAnalysis();

        displayAnalysis(data);

        setHistoricalViewMode(true);

        // The new company is freshly loaded, so there is nothing unsaved
        isDirty = false;
    } catch (error) {
        statusMessage.textContent = "Unable to load this analysis.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);
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
        const response = await fetch(
            "http://127.0.0.1:8000/watchlist"
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve watchlist data.");
        }

        const watchlist = await response.json();

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

                // Assign classes
                companyHeader.classList.add("watchlist-item");
                historyContainer.classList.add("watchlist-history", "is-hidden");
                companyElementDelete.classList.add("watchlistItem-delete");
                historyToggle.classList.add("history-toggle");

                latestAnalysisContainer.classList.add("analysis-entry", "latest-analysis");
                previousAnalysesContainer.classList.add("previous-analysis-container");

                // Associate history container with its company
                historyContainer.dataset.ticker = ticker;

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

                // Build latest analysis entry
                latestAnalysisContainer.appendChild(latestAnalysisEntry);
                latestAnalysisContainer.appendChild(latestAnalysisDate);

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

                        previousAnalysisEntry.classList.add("analysis-entry");
                        previousAnalysisDate.textContent = formatTimestamp(analysis.updated_at);

                        // Historical analysis delete button
                        previousAnalysisDelete.classList.add("historical-analysis-delete");
                        previousAnalysisDelete.innerHTML = '<i data-lucide="trash-2"></i>';
                        previousAnalysisDelete.setAttribute(
                            "aria-label",
                            "Delete historical analysis"
                        );

                        // Group date and delete button
                        const previousAnalysisActions = document.createElement("div");
                        previousAnalysisActions.classList.add("previous-analysis-actions");

                        previousAnalysisActions.appendChild(previousAnalysisDate);
                        previousAnalysisActions.appendChild(previousAnalysisDelete);
                        previousAnalysisEntry.appendChild(previousAnalysisActions);

                        // Open selected historical analysis
                        previousAnalysisEntry.addEventListener("click", () => {
                            displayOldAnalysis(analysis.id);
                        });

                        // Delete selected historical analysis
                        previousAnalysisDelete.addEventListener("click", async (event) => {
                            event.stopPropagation();
                            event.preventDefault();

                            const confirmed = confirm(
                                "Are you sure you want to permanently delete this historical analysis?"
                            );

                            if (!confirmed) return;

                            try {
                                await deletePastAnalysis(analysis.id);
                            } catch (error) {
                                statusMessage.textContent =
                                    "Unable to delete historical analysis.";
                                statusMessage.classList.remove("is-hidden");
                                console.error(error);
                            }
                        });

                        previousAnalysesContainer.appendChild(previousAnalysisEntry);
                    }
                }

                // Build company structure
                companyElement.appendChild(companyHeader);
                companyElement.appendChild(historyContainer);

                companyHeader.appendChild(historyToggle);
                companyHeader.appendChild(companyElementDelete);

                historyContainer.appendChild(latestAnalysisContainer);
                historyContainer.appendChild(previousAnalysesContainer);

                // Open latest analysis
                latestAnalysisContainer.addEventListener("click", () => {
                    openWatchlistCompany(ticker);
                });

                companyHeader.addEventListener("click", () => {
                    openWatchlistCompany(ticker);
                });

                // Open analysis history
                historyToggle.addEventListener("click", (event) => {
                    event.stopPropagation();
                    historyContainer.classList.toggle("is-hidden");
                    historyToggle.classList.toggle("is-open");
                });

                // Delete company
                companyElementDelete.addEventListener("click", async (event) => {
                    event.stopPropagation();
                    event.preventDefault();

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
                        statusMessage.textContent = "Unable to delete company data.";
                        statusMessage.classList.remove("is-hidden");
                        console.error(error);
                    }
                });

                // Append company to watchlist
                watchlistCompanies.appendChild(companyElement);
            }

            lucide.createIcons();
        }

    } catch (error) {
        console.error("Error loading watchlist:", error);
    }
}



