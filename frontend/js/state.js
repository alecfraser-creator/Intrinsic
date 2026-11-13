// ==========================================
// GLOBAL STATE
// ==========================================
const api_url = window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : window.location.origin;


const supabaseClient = window.supabase.createClient(
    "https://xspgxwmuodmqvjbtnjns.supabase.co",
    "sb_publishable_kS1gbvyMQxbCL-tKDdbcgw_i4EznIPG"
);

let watchlistTickers = new Set();

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
