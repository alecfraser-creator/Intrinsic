const selectedAnalyses = new Set();


compareSelectButton.addEventListener("click", () => {
    watchlistComparisonSelection()
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
            selectedAnalyses.delete(id)
        }
        else if (ticker) {
            selectedAnalyses.delete(ticker)
        }
    } else {
        if (selectedAnalyses.size >= 2) return;

        checkbox.innerHTML = '<i data-lucide="square-check"></i>';
        
        const id = checkbox.dataset.analysisId
        const ticker = checkbox.dataset.ticker
        if (id) {
            selectedAnalyses.add(id)
        }
        else if (ticker) {
            selectedAnalyses.add(ticker)
        }
    }

    updateComparisonUI()

    lucide.createIcons();
    
});

function watchlistComparisonSelection() {
    isComparisonMode = !isComparisonMode;

    const compareSelectLabel = compareSelectButton.querySelector("span");
    const compareSelectIcon = compareSelectButton.querySelector("i, svg");

    compareSelectLabel.textContent = isComparisonMode
        ? "Cancel selection"
        : "Compare analyses";

    compareSelectIcon.outerHTML = `<i data-lucide="${isComparisonMode ? "x" : "git-compare-arrows"}"></i>`;

    const analysisSelectButtons = document.querySelectorAll(".analysis-select");
    const removeButtons = document.querySelectorAll( ".watchlistItem-delete, .historical-analysis-delete");

    if (isComparisonMode) {
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