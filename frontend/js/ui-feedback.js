// ==========================================
// UI FEEDBACK
//
// Cosmetic only: marks the status message as "loading" while it shows one of
// the app's progress texts ("Analyzing company...", "Updating financials..."),
// so CSS can show a spinner. It never writes to the element.
// ==========================================

(function () {
    const update = () => {
        const text = statusMessage.textContent.trim();
        statusMessage.classList.toggle("is-loading", text.endsWith("..."));
    };

    new MutationObserver(update).observe(statusMessage, {
        childList: true,
        characterData: true,
        subtree: true
    });

    update();
})();


// Leaving comparison mode: the comparison run leaves "Comparing analyses..."
// showing and the welcome text hidden. Reset them so the normal view is usable.
// (Registered after the existing exit handler, which has already run.)
exitComparisonButton.addEventListener("click", () => {
    statusMessage.textContent = "";
    statusMessage.classList.add("is-hidden");
    welcomeMessage.classList.remove("is-hidden");
});
