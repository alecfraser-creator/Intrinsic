// ==========================================
// Qual analysis
// ==========================================

function collectQualAnalysis() {
    for (const [section, fieldIds] of Object.entries(qualitativeFieldMap)) {
        for (const fieldId of fieldIds) {
            currentQualAnalysis[section][fieldId] =
                document.getElementById(fieldId).value;
        }
    }

    return currentQualAnalysis;
}

function populateQualAnalysis() {
    for (const [section, fieldIds] of Object.entries(qualitativeFieldMap)) {
        for (const fieldId of fieldIds) {
            document.getElementById(fieldId).value =
                currentQualAnalysis[section][fieldId];
        }
    }
}

function createEmptyQualAnalysis() {
    const analysis = {};

    for (const [section, fieldIds] of Object.entries(qualitativeFieldMap)) {
        analysis[section] = {};

        for (const fieldId of fieldIds) {
            analysis[section][fieldId] = "";
        }
    }

    return analysis;
}


for (const fieldIds of Object.values(qualitativeFieldMap)) {
    for (const fieldId of fieldIds) {
        document.getElementById(fieldId).addEventListener("input", () => {
            markDirty()
        });
    }
}