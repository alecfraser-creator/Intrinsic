// ==========================================
//  METRIC INFO BUTTONS
// ==========================================

metricInfoButtons.forEach((button) => {
    button.addEventListener("click", () => {

        const metric = button.dataset.metric
        const explanation = metricExplanations[metric]
        metricInfoContent.innerHTML = explanation.replace(
            /(What is [^?\n]+\?|Our formula:|What it means:)/g,
            "<strong>$1</strong>"
        );

       metricInfoOverlay.classList.remove("is-hidden");
       
       closeMetricInfoButton.addEventListener("click", () => {
            metricInfoOverlay.classList.add("is-hidden");
        });

        enableDismiss(metricInfoModal, () => {
            metricInfoOverlay.classList.add("is-hidden")
        });
    });
});
