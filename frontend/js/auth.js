let authMode = "login";

async function getSession () {
    const session = await supabaseClient.auth.getSession()

    if (session.data.session) {
        return session.data.session
    } else {
        return null
    }
}




authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    authError.classList.add("is-hidden")
    authError.textContent = ""

    const email = authEmail.value
    const password = authPassword.value


    if (authMode ==="login") {

        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        })

        if (error) {
            console.log("error")

            authError.classList.remove("is-hidden")
            authError.textContent = error.message
        } else if (data) {
            console.log(data.user);
            console.log(data.session);

            authModal.classList.add("is-hidden");
        }

    } else if (authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        })
        
        if (error) {
            console.log("error")

            authError.classList.remove("is-hidden")
            authError.textContent = error.message
        } else if (data) {
            console.log(data.user);
            console.log(data.session);

            if (data.session) {
                authModal.classList.add("is-hidden");
            } else {
                authError.classList.remove("is-hidden");
                authError.textContent = "Account created. Please check your email to confirm your account.";
            }
        }

    }
       
});


authToggle.addEventListener("click", () => {
    if (authMode === "login") {
        authMode = "signup"
    } else {
        authMode = "login"
    }

    if (authMode === "login") {
        authTitle.textContent = "Log in to Intrinsic";
        authDescription.textContent =
            "Log in to save your analyses and manage your watchlist.";
        authSubmit.textContent = "Log in";
        authToggle.textContent = "Don't have an account? Sign up";
        authPassword.setAttribute("autocomplete", "current-password");
    } else {
        authTitle.textContent = "Create your account";
        authDescription.textContent =
            "Create an account to save your analyses and manage your watchlist.";
        authSubmit.textContent = "Create account";
        authToggle.textContent = "Already have an account? Log in";
        authPassword.setAttribute("autocomplete", "new-password");
    }

    authError.classList.add("is-hidden");
    authError.textContent = "";

})


authClose.addEventListener("click", () => {

    authMode = "login"

    authPassword.value = ""
    authEmail.value = ""

    authError.classList.add("is-hidden");
    authError.textContent = ""; 

    authModal.classList.add("is-hidden")
})