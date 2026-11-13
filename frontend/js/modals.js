// ==========================================
// MODALS
// ==========================================

// Pending navigation (declared first so every function below can use it)
let pendingNavigation = null;

// --------------------------------------------------
// Open / reset helpers
// --------------------------------------------------

// Regular save modal: always starts on the options screen
function openUpdateAnalysisModal() {
    saveSelection.classList.remove("is-hidden");
    saveSuccess.classList.add("is-hidden");
    updateAnalysisModal.classList.remove("is-hidden");
}

// Unsaved changes modal: call this instead of showing the modal manually.
// `navigation` is the function to run once the user has saved or discarded.
function openUnsavedChangesModal(navigation) {
    pendingNavigation = navigation;

    document.querySelector("#unsaved-changes-options").classList.remove("is-hidden");
    document.querySelector("#navigation-save-success").classList.add("is-hidden");
    unsavedChangesModal.classList.remove("is-hidden");
}

function continuePendingNavigation() {
    if (!pendingNavigation) return;

    const navigation = pendingNavigation;
    pendingNavigation = null;
    navigation();
}

// --------------------------------------------------
// Save logic (shared by both modals)
// --------------------------------------------------

async function updateAnalysis(saveMode, modal) {
    const isNavigationSave = modal.id === "unsaved-changes-modal";

    if (!currentQuantAnalysis) {
        console.error("updateAnalysis: no current analysis to save");
        return;
    }

    // Disable the modal's buttons while saving to prevent double submits
    const buttons = modal.querySelectorAll("button");
    buttons.forEach(button => (button.disabled = true));

    try {
        collectQualAnalysis();

        await addCompany(
            currentQuantAnalysis.ticker,
            currentQuantAnalysis,
            currentQualAnalysis,
            lastFinancialsRefresh,
            currentHistoricalData,
            saveMode
        );

        isSaved = true;
        isDirty = false;

        if (isNavigationSave) {
            document.querySelector("#unsaved-changes-options").classList.add("is-hidden");
            document.querySelector("#navigation-save-success").classList.remove("is-hidden");
        } else {
            saveSelection.classList.add("is-hidden");
            saveSuccess.classList.remove("is-hidden");
        }

    } catch (error) {
        if (error.message === "Not logged in") {
            authModal.classList.remove("is-hidden");
        } else {
            console.error("Error adding to watchlist:", error);
        }
        alert("Could not save the analysis. Please try again.");

    } finally {
        buttons.forEach(button => (button.disabled = false));
    }
}

// --------------------------------------------------
// Regular save modal
// --------------------------------------------------

updateCurrentVersionButton.addEventListener("click", () => {
    updateAnalysis("update", updateAnalysisModal);
});

saveNewVersion.addEventListener("click", () => {
    updateAnalysis("new_version", updateAnalysisModal);
});

closeUpdateModal.addEventListener("click", () => {
    updateAnalysisModal.classList.add("is-hidden");
});

closeSaveSuccess.addEventListener("click", () => {
    updateAnalysisModal.classList.add("is-hidden");
});

// --------------------------------------------------
// Unsaved changes modal
// --------------------------------------------------

navigationUpdateButton.addEventListener("click", () => {
    updateAnalysis("update", unsavedChangesModal);
});

navigationNewButton.addEventListener("click", () => {
    updateAnalysis("new_version", unsavedChangesModal);
});

discardAndContinueButton.addEventListener("click", () => {
    unsavedChangesModal.classList.add("is-hidden");
    continuePendingNavigation();
});

cancelNavigationButton.addEventListener("click", () => {
    pendingNavigation = null;
    unsavedChangesModal.classList.add("is-hidden");
});

continueAfterSaveButton.addEventListener("click", () => {
    unsavedChangesModal.classList.add("is-hidden");
    continuePendingNavigation();
});