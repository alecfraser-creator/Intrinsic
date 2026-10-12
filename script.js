const searchForm = document.querySelector("#search-form")
const analyzeButton = document.querySelector("#analyze-button");
const analysisContent = document.querySelector("#analysis-content");
const welcomeMessage = document.querySelector("#welcome-message");
const statusMessage = document.querySelector("#status-message");


searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    welcomeMessage.hidden = true;

    statusMessage.textContent = "Analyzing company..."
    analyzeButton.disabled = true
    
    setTimeout(() => {
        statusMessage.textContent = "";
        analysisContent.hidden = false;
        analyzeButton.disabled = false;
    }, 2000);
});
