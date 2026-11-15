// ==========================================
// INITIALIZATION
// ==========================================

// Check for an existing session first; the watchlist loads (or shows its
// logged-out state) from there. See auth-state.js.
initAuthState();

lucide.createIcons();

window.addEventListener("beforeunload", (event) => {
    if (!isDirty) return;

    event.preventDefault();
    event.returnValue = ""; // required by some browsers
});
