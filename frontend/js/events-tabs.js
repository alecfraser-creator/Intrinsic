// ==========================================
//  TAB SWITCHING BUTTONS
// ==========================================

for (const key of Object.keys(tabs)) {
    tabs[key].tab.addEventListener("click", () => {
        switchAnalysisTab(key);
    });
}
