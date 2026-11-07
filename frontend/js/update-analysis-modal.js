async function updateAnalysis(saveMode) {
    
    saveSelection.classList.remove("is-hidden")
    saveSuccess.classList.add("is-hidden")

    try {
        collectQualAnalysis()

        await addCompany(
            currentQuantAnalysis.ticker,
            currentQuantAnalysis,
            currentQualAnalysis,
            lastFinancialsRefresh,
            currentHistoricalData,
            saveMode
        );

        saveSelection.classList.add("is-hidden")
        saveSuccess.classList.remove("is-hidden")

    } catch (error) {
        console.error("Error saving analysis:", error);
    } 
}
    

updateCurrentVersionButton.addEventListener("click", () => {
    updateAnalysis("update")
})

saveNewVersionButton.addEventListener("click", () => {
    updateAnalysis("new_version")
})

closeModalButton.addEventListener("click", () => {
    updateAnalysisModal.classList.add("is-hidden")
})


closeSaveSuccess.addEventListener("click", () => {
    updateAnalysisModal.classList.add("is-hidden")
})


    