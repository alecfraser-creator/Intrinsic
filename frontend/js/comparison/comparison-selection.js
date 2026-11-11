const selectedAnalyses = new Set();


compareSelectButton.addEventListener("click", async () => {
    if (selectedAnalyses.size !== 2) {
        watchlistComparisonSelection()
    } else {
        isComparisonSelectMode = false
        const analyses = await runComparison()
        
        displayComparison(analyses)

        document.body.classList.add("comparison-mode");

        normalView.classList.add("is-hidden")
        comparisonView.classList.remove("is-hidden")
    }
})

watchlistCompanies.addEventListener("click", (event) => {
    const checkbox = event.target.closest(".analysis-select");

    if (!checkbox) return;

    event.preventDefault();
    
    const icon = checkbox.querySelector("i, svg");

    if (icon.getAttribute("data-lucide") === "square-check") {
        checkbox.innerHTML = '<i data-lucide="square"></i>';
        const id = checkbox.dataset.analysisId
        const ticker = checkbox.dataset.ticker
        if (id) {
            selectedAnalyses.delete(`id:${id}`)
        }
        else if (ticker) {
            selectedAnalyses.delete(`ticker:${ticker}`)
        }
    } else {
        if (selectedAnalyses.size >= 2) return;

        checkbox.innerHTML = '<i data-lucide="square-check"></i>';
        
        const id = checkbox.dataset.analysisId
        const ticker = checkbox.dataset.ticker
        if (id) {
            selectedAnalyses.add(`id:${id}`)
        }
        else if (ticker) {
            selectedAnalyses.add(`ticker:${ticker}`)
        }
    }

    updateComparisonUI()

    lucide.createIcons();
    
});


function watchlistComparisonSelection(forceState = !isComparisonSelectMode) {
    isComparisonSelectMode = forceState;

    const compareSelectLabel = compareSelectButton.querySelector("span");
    const compareSelectIcon = compareSelectButton.querySelector("i, svg");

    compareSelectLabel.textContent = isComparisonSelectMode
        ? "Cancel selection"
        : "Compare analyses";

    compareSelectIcon.outerHTML = `<i data-lucide="${isComparisonSelectMode ? "x" : "git-compare-arrows"}"></i>`;

    const analysisSelectButtons = document.querySelectorAll(".analysis-select");
    const removeButtons = document.querySelectorAll( ".watchlistItem-delete, .historical-analysis-delete");

    if (isComparisonSelectMode) {
        comparisonInstructions.classList.remove("is-hidden")
        comparisonSelectionCount.classList.remove("is-hidden")

        // Setup buttons display 
        analysisSelectButtons.forEach(button => {
            button.classList.remove("is-hidden")
        });

        removeButtons.forEach(button => {
            button.classList.add("is-hidden")
        });

    } else {
        selectedAnalyses.clear();

        compareSelectButton.classList.remove("comparison-ready")
        comparisonInstructions.classList.add("is-hidden")
        comparisonSelectionCount.classList.add("is-hidden")

        analysisSelectButtons.forEach(button => {
            button.innerHTML = '<i data-lucide="square"></i>'
            button.classList.add("is-hidden")
        });

        removeButtons.forEach(button => {
            button.classList.remove("is-hidden")
        });
    }

    lucide.createIcons();
}


function updateComparisonUI() {
    const compareSelectLabel = compareSelectButton.querySelector("span");
    const compareSelectIcon = compareSelectButton.querySelector("i, svg");


    comparisonSelectionCount.textContent = `${selectedAnalyses.size} of 2 selected`

    if (selectedAnalyses.size == 2) {
        compareSelectButton.classList.add("comparison-ready")
        compareSelectIcon.outerHTML = '<i data-lucide="play"></i>';
        compareSelectLabel.textContent  = "Run Comparison"
    }
    else {
        compareSelectButton.classList.remove("comparison-ready")
        compareSelectIcon.outerHTML = '<i data-lucide="git-compare-arrows""></i>'
        compareSelectLabel.textContent  = "Cancel selection"

    }
}

async function runComparison() {
    const analyses = []

    for (const analysis of selectedAnalyses) {
        const parts = analysis.split(":")

        if (parts[0] === "ticker") {
            const ticker = parts[1]
            const latestAnalysis = await fetchAnalysis(ticker)
            analyses.push({
                "type": "ticker",
                "analysis": latestAnalysis
            })

        } else if (parts[0] === "id") {
            const id = parts[1]
            const oldAnalysis = await fetchOldAnalysis(id)
            analyses.push({
                "type": "id",
                "analysis": oldAnalysis
            })
        }
        console.log(analyses)
    }

    return(analyses)
}