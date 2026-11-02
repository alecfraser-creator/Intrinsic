/* ---------- Popover ---------- */
 
let activeInfo = null; // { button, popover, stopDismiss }
 
function closeMetricInfo() {
    if (!activeInfo) return;
 
    const { button, popover, stopDismiss } = activeInfo;
    activeInfo = null;
 
    stopDismiss();
    popover.remove();
    button.setAttribute("aria-expanded", "false");
}
 
function buildMetricPopover(info) {
    const popover = document.createElement("div");
    popover.className = "metric-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", info.title);
 
    const title = document.createElement("h4");
    title.className = "metric-popover-title";
    title.textContent = info.title;
    popover.appendChild(title);
 
    const sections = [
        ["What it is", info.what],
        ["How it's calculated here", info.how],
        ["How to read it", info.read]
    ];
 
    for (const [label, content] of sections) {
        const heading = document.createElement("p");
        heading.className = "metric-popover-label";
        heading.textContent = label;
        popover.appendChild(heading);
 
        if (Array.isArray(content)) {
            const list = document.createElement("ol");
            list.className = "metric-popover-steps";
            for (const step of content) {
                const item = document.createElement("li");
                item.textContent = step;
                list.appendChild(item);
            }
            popover.appendChild(list);
        } else {
            const text = document.createElement("p");
            text.className = "metric-popover-text";
            text.textContent = content;
            popover.appendChild(text);
        }
    }
 
    return popover;
}
 
function positionMetricPopover(popover, button) {
    const margin = 8;
    const rect = button.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
 
    // Centered under the button, clamped to the viewport horizontally
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
 
    // Below the button, unless it doesn't fit and there is room above
    let top = rect.bottom + margin;
    if (top + height > window.innerHeight && rect.top - margin - height > 0) {
        top = rect.top - margin - height;
    }
 
    popover.style.left = `${left + window.scrollX}px`;
    popover.style.top = `${top + window.scrollY}px`;
}
 
function openMetricInfo(button) {
    const info = METRIC_INFO[button.dataset.metric];
 
    if (!info) {
        console.warn(`No explanation defined for metric "${button.dataset.metric}".`);
        return;
    }
 
    closeMetricInfo();
 
    const popover = buildMetricPopover(info);
    document.body.appendChild(popover);
    positionMetricPopover(popover, button);
    button.setAttribute("aria-expanded", "true");
 
    // Clicks on the popover or on any info button don't count as "outside":
    // the click handler below decides whether to toggle or switch to another metric.
    const insideInfo = {
        contains: (target) =>
            popover.contains(target) ||
            (target instanceof Element && target.closest(".metric-info") !== null)
    };
 
    const stopDismiss = enableDismiss(insideInfo, closeMetricInfo);
 
    activeInfo = { button, popover, stopDismiss };
}
 
document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
 
    const button = event.target.closest(".metric-info");
    if (!button) return;
 
    event.preventDefault();
 
    // Clicking the same button again closes the popover
    if (activeInfo && activeInfo.button === button) {
        closeMetricInfo();
        return;
    }
 
    openMetricInfo(button);
});
 
window.addEventListener("resize", closeMetricInfo);
 
for (const button of document.querySelectorAll(".metric-info")) {
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
}
 
