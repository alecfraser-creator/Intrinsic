// ==========================================
// TAB SWITCHING LOGIC
// ==========================================

function switchAnalysisTab(tab) {
    for (const key of Object.keys(tabs)) {
        const isActive = key === tab;

        tabs[key].panel.classList.toggle("is-hidden", !isActive);

        tabs[key].tab.classList.toggle("is-active", isActive);

        tabs[key].tab.setAttribute("aria-selected", String(isActive));
    }
}
