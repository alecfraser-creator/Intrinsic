// ==========================================
//  DCF panel listeners
// ==========================================

dcfScenarioButtons.forEach(button => {
    button.addEventListener("click", () => {
        dcfScenarioButtons.forEach(button => {
            button.classList.remove("is-active");
        });

        button.classList.add("is-active");

        displayDcfForecastChart(button.dataset.scenario);
        displayDcfAssumptions(button.dataset.scenario);
    });
});

document.querySelector("#close-assumption-explanation")
    ?.addEventListener("click", closeAssumptionExplanation);
