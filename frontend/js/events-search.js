// ==========================================
//  SEARCH EVENT LISTENER
// ==========================================

async function runAnalysis(ticker) {
    analysisContent.classList.add("is-hidden");
    welcomeMessage.classList.add("is-hidden");
    statusMessage.textContent = "Analyzing company...";
    statusMessage.classList.remove("is-hidden");
    analyzeButton.disabled = true;

    try {
        const data = await fetchAnalysis(ticker);

        currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
        populateQualAnalysis();
    
        displayAnalysis(data);

        setHistoricalViewMode(false);


        // The new company is freshly loaded, so there is nothing unsaved
        isDirty = false;

    } catch (error) {
        statusMessage.textContent =
            "Unable to analyze this company. Check the ticker and try again.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);

    } finally {
        analyzeButton.disabled = false;
    }
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (event.submitter !== analyzeButton) {
        return;
    }

    const ticker = tickerInput.value.trim().toUpperCase();

    // Unsaved changes: ask first, and leave the current analysis untouched
    // until the user has saved or discarded.
    if (isDirty && currentQuantAnalysis) {
        openUnsavedChangesModal(() => runAnalysis(ticker));
        return;
    }

    runAnalysis(ticker);
});