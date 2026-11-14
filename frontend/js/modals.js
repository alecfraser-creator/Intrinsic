// ==========================================
// MODALS
// ==========================================

// Pending navigation (declared first so every function below can use it)
let pendingNavigation = null;
let cleanupAccountDismiss = null;
let changePasswordDismiss = null

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



// --------------------------------------------------
// Account modal
// --------------------------------------------------

// Open and close modal 

accountButton.addEventListener("click", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        accountModal.classList.remove("is-hidden")
        cleanupAccountDismiss = enableDismiss(accountModalContent, () => {
            accountModal.classList.add("is-hidden")
        })
    } else {
        authModal.classList.remove("is-hidden")
    }
    
})

closeAccountModal.addEventListener("click", () => {
    accountModal.classList.add("is-hidden")
    cleanupAccountDismiss?.();
})

// Actions 
changePasswordButton.addEventListener("click", () => {
    accountMenu.classList.add("is-hidden");
    changePasswordView.classList.remove("is-hidden");

    changePasswordDismiss = enableDismiss(changePasswordView, () => {
        changePasswordView.classList.add("is-hidden");
        accountMenu.classList.remove("is-hidden");
    });
})

closePasswordView.addEventListener("click", () => {
    changePasswordView.classList.add("is-hidden");
    accountMenu.classList.remove("is-hidden");

    changePasswordDismiss?.();
    changePasswordDismiss = null;
})


changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Reset previous feedback
    passwordError.classList.add("is-hidden");
    passwordSuccess.classList.add("is-hidden");

    // Validate passwords
    if (newPassword.value !== confirmNewPassword.value) {
        passwordError.textContent = "Passwords do not match. Please try again.";
        passwordError.classList.remove("is-hidden");
        return;
    }

    // Loading state
    saveNewPassword.disabled = true;
    saveNewPassword.textContent = "Updating password...";

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword.value
        });

        if (error) {
            console.error("Password update error:", error);

            passwordError.textContent = "Unable to update password. Please try again.";
            passwordError.classList.remove("is-hidden");
        } else {
            passwordSuccess.textContent = "Password updated successfully.";
            passwordSuccess.classList.remove("is-hidden");

            newPassword.value = "";
            confirmNewPassword.value = "";
        }

    } catch (error) {
        console.error("Password update error:", error);

        passwordError.textContent = "Something went wrong. Please try again.";
        passwordError.classList.remove("is-hidden");

    } finally {
        saveNewPassword.disabled = false;
        saveNewPassword.textContent = "Save password";
    }
});

signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;

    signoutFeedback.textContent = "Signing out...";
    signoutFeedback.classList.remove("is-hidden");

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        signoutFeedback.textContent = "Unable to sign out. Please try again."
        signOutButton.disabled = false;
        console.error("Sign-out error:", error);

        setTimeout(() => {
            signoutFeedback.classList.add("is-hidden");
        }, 3000);
    } else {
        signoutFeedback.textContent = "Successfully signed out.";

        setTimeout(() => {
            signoutFeedback.classList.add("is-hidden");
        }, 3000);
        signOutButton.disabled = false;
    }
})

function returnToAccountMenu() {
    deleteAccountView.classList.add("is-hidden");
    accountMenu.classList.remove("is-hidden");
}

deleteAccountButton.addEventListener("click", () => {
    accountMenu.classList.add("is-hidden");
    deleteAccountView.classList.remove("is-hidden");
});

cancelDeleteAccount.addEventListener("click", returnToAccountMenu);

closeDeleteAccountView.addEventListener("click", returnToAccountMenu);


confirmDeleteAccount.addEventListener("click", async () => {
    confirmDeleteAccount.disabled = true;
    confirmDeleteAccount.textContent = "Deleting account...";
    deleteAccountError.classList.add("is-hidden");

    try {
        await deleteAccount();

        // Clear the local Supabase session
        await supabaseClient.auth.signOut({ scope: "local" });

        // Close the account modal
        accountModal.classList.add("is-hidden");

        // Reset the modal views
        deleteAccountView.classList.add("is-hidden");
        accountMenu.classList.remove("is-hidden");

        // Clean up dismissal listeners
        cleanupAccountDismiss?.();
        cleanupAccountDismiss = null;

    } catch (error) {
        console.error("Account deletion error:", error);

        deleteAccountError.textContent =
            "Unable to delete your account. Please try again.";
        deleteAccountError.classList.remove("is-hidden");

    } finally {
        confirmDeleteAccount.disabled = false;
        confirmDeleteAccount.textContent = "Delete account";
    }
});