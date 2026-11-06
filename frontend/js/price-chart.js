let historicalPriceData = [];
let selectedPricePeriod = "1y";

document.querySelectorAll(".price-chart-period").forEach(button => {
    button.addEventListener("click", () => {
        selectedPricePeriod = button.dataset.period;

        document.querySelectorAll(".price-chart-period").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.period === selectedPricePeriod);
        });

       displayPriceChart(historicalPriceData, selectedPricePeriod);
    });
});


function displayPriceChart(historicalData, selectedPricePeriod) {
    if (historicalData == null || historicalData.length === 0) {
        return;
    }

    historicalPriceData = historicalData;

    const cutoffDate = new Date();

    if (selectedPricePeriod === "5y") {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
    } else if (selectedPricePeriod === "1y") {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    }

    const filteredData = historicalPriceData.filter(record => {
        return record.t * 1000 >= cutoffDate.getTime();
    });

    if (filteredData.length === 0) {
        return;
    }

    const minPrice = Math.min(...filteredData.map(record => Math.min(record.o, record.c)));
    const maxPrice = Math.max(...filteredData.map(record => Math.max(record.o, record.c)));

    const chartData = filteredData.map(record => ({
        x: record.t * 1000,
        y: [record.o, record.c],
        high: record.h,
        low: record.l
    }));

    if (historicalCharts.price) {
        historicalCharts.price.data.datasets[0].data = chartData;
        historicalCharts.price.options.scales.y.min = minPrice * 0.98;
        historicalCharts.price.options.scales.y.max = maxPrice * 1.02;

        historicalCharts.price.update();

    } else {
        const priceChart = document.getElementById("price-chart");
        const ctx = priceChart.getContext("2d");

        historicalCharts.price = new Chart(ctx, {
            type: "bar",

            data: {
                datasets: [{
                    label: "Daily Price Movement",

                    data: chartData,

                    backgroundColor: context => {
                        const record = context.raw;

                        if (!record) {
                            return "#9ca3af";
                        }

                        if (record.y[1] > record.y[0]) {
                            return "#16a34a";
                        }

                        if (record.y[1] < record.y[0]) {
                            return "#dc2626";
                        }

                        return "#9ca3af";
                    },

                    borderWidth: 0,
                    barThickness: 1
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: context => {
                                const record = context.raw;

                                return [
                                    `Open: $${record.y[0].toFixed(2)}`,
                                    `Close: $${record.y[1].toFixed(2)}`,
                                    `High: $${record.high.toFixed(2)}`,
                                    `Low: $${record.low.toFixed(2)}`
                                ];
                            }
                        }
                    }
                },

                scales: {
                    x: {
                        type: "time",
                        time: {
                            unit: "month"
                        }
                    },

                    y: {
                        position: "right",
                        min: minPrice * 0.98,
                        max: maxPrice * 1.02
                    }
                }
            }
        });
    }

}

