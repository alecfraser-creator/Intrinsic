// ==========================================
// AUTH STATE → WATCHLIST UI
//
// Presentation-only layer on top of the existing auth code.
// It never signs anyone in or out and never touches tokens; it only
// reacts to the state that supabaseClient already reports, and
// decides what the sidebar and login modal should show.
// ==========================================

let activeUserId = null;      // user whose watchlist is currently on screen
let authStateResolved = false; // false until the first session check finishes


// ---------- Sidebar states ----------

function setWatchlistMessage(text, buttonLabel, onButtonClick) {
    watchlistCompanies.replaceChildren();

    watchlistEmpty.textContent = text;
    watchlistCompanies.appendChild(watchlistEmpty);

    if (buttonLabel) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "watchlist-state-action";
        button.textContent = buttonLabel;
        button.addEventListener("click", onButtonClick);
        watchlistCompanies.appendChild(button);
    }
}

function showWatchlistLoading() {
    setWatchlistMessage("Loading your watchlist…");
    watchlistCompanies.setAttribute("aria-busy", "true");
}

function showWatchlistSignedOut() {
    watchlistCompanies.removeAttribute("aria-busy");
    sidebar.classList.add("is-signed-out");

    // clearWatchlist() (helpers.js) empties the tickers and the list
    clearWatchlist();
    setWatchlistMessage(
        "Log in to see your watchlist and keep your analyses saved.",
        "Log in",
        () => authModal.classList.remove("is-hidden")
    );

    // A comparison selection made for the previous user makes no sense any more
    if (isComparisonSelectMode) {
        watchlistComparisonSelection(false);
    }

    // The analysis on screen can no longer be "in the watchlist"
    if (currentQuantAnalysis) {
        isSaved = false;
        saveCompany.classList.remove("is-hidden");
        watchlistActions.classList.add("is-hidden");
    }
}

function syncSavedStateWithWatchlist() {
    if (!currentQuantAnalysis) return;

    isSaved = watchlistTickers.has(currentQuantAnalysis.ticker);
    saveCompany.classList.toggle("is-hidden", isSaved);
    watchlistActions.classList.toggle("is-hidden", !isSaved);
}

async function loadWatchlistForUser(userId) {
    sidebar.classList.remove("is-signed-out");
    showWatchlistLoading();

    await loadWatchlist();

    // The user may have logged out (or switched) while the request ran
    if (activeUserId !== userId) return;

    watchlistCompanies.removeAttribute("aria-busy");

    // loadWatchlist() logs and leaves the list empty when the request fails
    if (!watchlistCompanies.hasChildNodes()) {
        setWatchlistMessage(
            "We couldn't load your watchlist.",
            "Try again",
            () => loadWatchlistForUser(userId)
        );
        return;
    }

    syncSavedStateWithWatchlist();
}


// ---------- Reacting to auth state ----------

function handleAuthState(session) {
    const userId = session?.user?.id ?? null;

    // Token refreshes and tab re-focus repeat the same state: nothing to do
    if (authStateResolved && userId === activeUserId) return;

    authStateResolved = true;
    activeUserId = userId;

    if (userId) {
        authModal.classList.add("is-hidden");
        loadWatchlistForUser(userId);
    } else {
        showWatchlistSignedOut();
    }
}

function initAuthState() {
    showWatchlistLoading();

    // Supabase advises against calling its own methods inside this callback,
    // so hand the work to the next tick.
    supabaseClient.auth.onAuthStateChange((event, session) => {
        setTimeout(() => handleAuthState(session), 0);
    });

    // Explicit first check, so the sidebar resolves even if the
    // initial event is delayed. Repeats are ignored by handleAuthState.
    getSession().then(session => handleAuthState(session));
}


// ---------- Login modal behaviour ----------

// Focus the email field whenever the modal opens
new MutationObserver(() => {
    if (!authModal.classList.contains("is-hidden")) {
        authEmail.focus();
    }
}).observe(authModal, { attributes: true, attributeFilter: ["class"] });

// Esc or a click on the backdrop behaves like the existing Cancel button
authModal.addEventListener("mousedown", (event) => {
    if (event.target === authModal) authClose.click();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !authModal.classList.contains("is-hidden")) {
        authClose.click();
    }
});
