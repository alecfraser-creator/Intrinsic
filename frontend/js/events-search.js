// ==========================================
//  SEARCH EVENT LISTENER
// ==========================================

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
    const data = await fetchAnalysis(ticker);
    currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
    populateQualAnalysis();
    displayAnalysis(data);


    } catch (error) {
        statusMessage.textContent =
            "Unable to analyze this company. Check the ticker and try again.";
        statusMessage.classList.remove("is-hidden");
        console.error(error);

    } finally {
        analyzeButton.disabled = false;
    }
});
