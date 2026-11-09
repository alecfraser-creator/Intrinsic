// ==========================================
// WATCHLIST BUTTON EVENT LISTENERS
// ==========================================


// update financials
refreshFinancials.addEventListener("click", async (event) => {
    analysisContent.classList.add("is-hidden");
    welcomeMessage.classList.add("is-hidden");
    statusMessage.textContent = "Updating financials...";
    statusMessage.classList.remove("is-hidden");
    refreshFinancials.disabled = true;

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

        setHistoricalViewMode(false);

        markDirty()

    } catch (error) {
    statusMessage.textContent = "Unable to refresh financials.";
    statusMessage.classList.remove("is-hidden");
    console.error(error);
    } finally {
        refreshFinancials.disabled = false;
    }
})

// Save company to watchlist
saveCompany.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
        collectQualAnalysis();
        await addCompany(
            currentQuantAnalysis.ticker,
            currentQuantAnalysis,
            currentQualAnalysis,
            lastFinancialsRefresh,
            currentHistoricalData,
            "update"
        );

        isSaved = true;
        isDirty = false;

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

    saveSelection.classList.remove("is-hidden")
    saveSuccess.classList.add("is-hidden")
    updateAnalysisModal.classList.remove("is-hidden")
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
    let duplicate = false 

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

            if (data.in_watchlist) {
                duplicate = true;
                overlay.textContent = "Company already added to watchlist.";
                overlay.classList.remove("is-hidden");
                setTimeout(() => {
                    watchlistInput.value = "";
                    overlay.classList.add("is-hidden");
                }, 2000);
                return 
            }

            await addCompany(
                ticker,
                data.quant_analysis,
                data.qual_analysis,
                data.last_financials_refresh,
                data.historical_data,
                "update"
            );


            // Success: stop listening, then close the input
            stopDismiss();
            restoreHeader();

        } catch (error) {
            console.error("Error adding company to watchlist:", error);
            alert(`Unable to add ${ticker} to your watchlist. Please check the ticker and try again.`);

        } finally {
            loading = false;
            if (duplicate == false) {
                overlay.classList.add("is-hidden");
            }
        }
    });
});
