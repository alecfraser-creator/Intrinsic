// ==========================================
// REUSABLE HELPERS
// ==========================================

/*
Reusable helper: calls onClose when the user presses Esc or clicks outside `element`.
- canDismiss: optional function, return false to temporarily block dismissing (e.g. while loading).
- Returns a cleanup function that stops listening without calling onClose.
*/
function enableDismiss(element, onClose, canDismiss = () => true) {
    function cleanup() {
        document.removeEventListener("mousedown", onOutsideClick);
        document.removeEventListener("keydown", onEscape);
    }

    function dismiss() {
        if (!canDismiss()) return;
        cleanup();
        onClose();
    }

    function onOutsideClick(event) {
        if (!element.contains(event.target)) dismiss();
    }

    function onEscape(event) {
        if (event.key === "Escape") dismiss();
    }

    // mousedown (not click) so the click that opened the element doesn't immediately close it
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);

    return cleanup;
}


function formatMetric(value, suffix = "") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "N/A";
    }

    return `${value.toFixed(2)}${suffix}`;
}


function displayValue(elementId, value) {
    document.querySelector(`#${elementId}`).textContent = value;
}


function formatTimestamp(timestamp) {
    if (!timestamp) {
        return null;
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function renderCalculationInput(row, assumptionKey, scenario) {
    const value = explainIsNum(row.value)
        ? (row.value * 100).toFixed(1)
        : "";

    const displayValue = explainFmt.percent(row.value);

    return `
        <span class="assumption-input-cell">
            <span class="assumption-display">${displayValue}</span>

            <input
                class="assumption-input is-hidden"
                type="number"
                step="0.1"
                value="${value}"
                data-assumption="${assumptionKey}"
                data-input="${row.key}"
                data-scenario="${scenario}"
            >
        </span>
    `;
}


function markDirty () {
    isDirty = true;
}