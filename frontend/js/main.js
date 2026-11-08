// ==========================================
// INITIALIZATION
// ==========================================

loadWatchlist();

lucide.createIcons();

window.addEventListener("beforeunload", (event) => {
    if (!isDirty) return;

    event.preventDefault();
    event.returnValue = ""; // required by some browsers
});
