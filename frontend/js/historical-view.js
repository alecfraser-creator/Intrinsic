function setHistoricalViewMode(isHistorical) {

    // Show or hide the historical analysis notice
    historicalViewNotice.classList.toggle("is-hidden", !isHistorical);

    // Buttons that remain usable in historical mode
    const allowedButtons = [
        ".analysis-tab",
        ".dcf-scenario",
        ".price-chart-period",
        ".metric-info",
        ".fcff-section-toggle"
    ];

    // Select all buttons and editable form elements
    const controls = document.querySelectorAll(
        "#analysis-content button, " +
        "#analysis-content input, " +
        "#analysis-content textarea, " +
        "#analysis-content select"
    );

    controls.forEach(control => {

        // Preserve the original disabled state
        if (control.dataset.originalDisabled === undefined) {
            control.dataset.originalDisabled = control.disabled;
        }

        // Check whether this control is allowed to remain enabled
        const isAllowed = allowedButtons.some(selector =>
            control.matches(selector)
        );

        if (isHistorical) {
            control.disabled = !isAllowed;
        } else {
            control.disabled = control.dataset.originalDisabled === "true";
        }
    });
}