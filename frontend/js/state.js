// ==========================================
// GLOBAL STATE
// ==========================================

let currentQuantAnalysis = null;
let savedQuantAnalysis = null;
let currentQualAnalysis = {
    business_overview: {
        "business-model": "",
        "revenue-streams": "",
        "geographic-exposure": ""
    },
    competitive_advantage: {
        "competitive-advantages": "",
        "moat-durability": "",
        "competitors-threats": ""
    },
    management_capital_allocation: {
        "management-track-record": "",
        "insider-alignment": "",
        "capital-allocation": ""
    },
    financial_quality: {
        "earnings-quality": "",
        "cyclicality-resilience": "",
        "accounting-concerns": ""
    },
    growth_prospects: {
        "growth-drivers": "",
        "market-opportunity": "",
        "reinvestment-opportunities": ""
    },
    risks_red_flags: {
        "business-risks": "",
        "external-threats": "",
        "red-flags": ""
    },
    investment_thesis: {
        "investment-case": "",
        "market-misunderstanding": "",
        "attractive-price": "",
        "thesis-invalidation": ""
    }
};
const qualitativeFieldMap = {
    business_overview: [
        "business-model",
        "revenue-streams",
        "geographic-exposure"
    ],
    competitive_advantage: [
        "competitive-advantages",
        "moat-durability",
        "competitors-threats"
    ],
    management_capital_allocation: [
        "management-track-record",
        "insider-alignment",
        "capital-allocation"
    ],
    financial_quality: [
        "earnings-quality",
        "cyclicality-resilience",
        "accounting-concerns"
    ],
    growth_prospects: [
        "growth-drivers",
        "market-opportunity",
        "reinvestment-opportunities"
    ],
    risks_red_flags: [
        "business-risks",
        "external-threats",
        "red-flags"
    ],
    investment_thesis: [
        "investment-case",
        "market-misunderstanding",
        "attractive-price",
        "thesis-invalidation"
    ]
};
let lastFinancialsRefresh = null;
let currentHistoricalData = null;

let isSaved = false

let isDirty = false

let isViewingOldAnalysis = false;

let isComparisonSelectMode = false
