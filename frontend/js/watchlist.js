// ==========================================
// WATCHLIST DATA AND RENDERING
// ==========================================

async function loadWatchlist() {
    watchlistCompanies.replaceChildren();

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/watchlist`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve watchlist data.");
        }

        const watchlist = await response.json();

        if (watchlist.length === 0) {
            watchlistCompanies.appendChild(watchlistEmpty);
            watchlistEmpty.textContent = "Your watchlist is empty. Analyze a company and add it to your watchlist to keep its analysis saved here.";
        }
        else {
            for (const company of watchlist) {
                const ticker = company.ticker;
                const name = company.name;
                const companyElement = document.createElement("div");
                const companyElementDelete = document.createElement("button");

                companyElement.classList.add("watchlist-item");
                companyElement.textContent = `${ticker} - ${name}`;

                companyElement.addEventListener("click", async () => {
                    welcomeMessage.classList.add("is-hidden");
                    statusMessage.classList.add("is-hidden");

                    const data = await fetchAnalysis(ticker);
                    currentQualAnalysis = data.qual_analysis ?? createEmptyQualAnalysis();
                    populateQualAnalysis();
                    displayAnalysis(data);
                });

                companyElementDelete.classList.add("watchlistItem-delete");
                companyElementDelete.innerHTML = '<i data-lucide="trash-2"></i>';

                companyElementDelete.addEventListener("click", async (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    const confirmed = confirm(
                        "Are you sure you want to remove this company from your watchlist? This will delete all your past analyses"
                    );

                    if (!confirmed) {
                        return;
                    }

                    try {
                        await deleteCompany(ticker);

                        saveCompany.classList.remove("is-hidden");
                        watchlistActions.classList.add("is-hidden");

                    } catch (error) {
                        statusMessage.textContent =
                            "Unable to delete company data.";
                        statusMessage.classList.remove("is-hidden");
                        console.error(error);
                    }
                });

                companyElement.appendChild(companyElementDelete);
                watchlistCompanies.appendChild(companyElement);
            }

            lucide.createIcons();
        }

    } catch (error) {
        console.error(error);
    }
}
