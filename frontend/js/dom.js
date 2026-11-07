// ==========================================
// DOM ELEMENTS
// ==========================================

// Tabs and pannels

 
const tabs = {
    quantitative: {
        tab: document.getElementById("quantitative-tab"),
        panel: document.getElementById("quantitative-panel")
    },
    qualitative: {
        tab: document.getElementById("qualitative-tab"),
        panel: document.getElementById("qualitative-panel")
    }, 
    valuation: {
        tab: document.getElementById("valuation-tab"),
        panel: document.getElementById("valuation-panel")
    }
    
};


// Search and analysis
const searchForm = document.querySelector("#search-form");
const tickerInput = document.querySelector("#ticker-input");
const analyzeButton = document.querySelector("#analyze-button");
const welcomeMessage = document.querySelector("#welcome-message");
const statusMessage = document.querySelector("#status-message");

//Quantitative analysis
const refreshFinancials = document.querySelector("#refresh-financials");
const analysisContent = document.querySelector("#analysis-content");
const historicalCharts = {};
const FiveYearPriceChart = document.querySelector("#five-year-price-chart");
const OneYearPriceChart = document.querySelector("#one-year-price-chart");


// Watchlist
const watchlistCompanies = document.querySelector("#watchlist-companies");
const watchlistEmpty = document.querySelector(".watchlist-empty");
const watchlistElement = document.querySelector(".watchlist-item");
const watchlistHeader = document.querySelector(".watchlist-header");
const watchlistAdd = document.getElementById("watchlist-add");

// Watchlist controls in the analysis
const saveCompany = document.querySelector("#save_watchlist");
const watchlistActions = document.querySelector("#watchlist-actions");
const updateCompany = document.querySelector("#update_analysis");
const removeCompany = document.querySelector("#remove_watchlist");

// Analysis update modal
const updateAnalysisModal = document.querySelector("#analysis-update-modal")
const updateCurrentVersionButton = document.querySelector("#update-current-analysis")
const saveNewVersionButton = document.querySelector("#new-analysis-version")
const closeModalButton = document.querySelector("#close-analysis-update-modal")
const saveSelection = document.querySelector("#save-selection")
const saveSuccess = document.querySelector("#save-success")
const closeSaveSuccess = document.querySelector("#close-save-success")


// Metric info buttons
const metricInfoButtons = document.querySelectorAll(".metric-info");

const metricInfoOverlay = document.querySelector("#metric-info-overlay");
const metricInfoModal = document.querySelector("#metric-info-modal");
const metricInfoTitle = document.querySelector("#metric-info-title");
const metricInfoContent = document.querySelector("#metric-info-content");
const closeMetricInfoButton = document.querySelector("#close-metric-info");

// DCF
const dcfScenarioButtons = document.querySelectorAll(".dcf-scenario");
let dcfForecastChart = null;

// Loading overlay
const overlay = document.getElementById("loadingOverlay");
