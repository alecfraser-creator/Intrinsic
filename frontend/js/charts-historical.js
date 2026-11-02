function displayHistoricalRevenueChart(history) {
    const revenueChart = document.querySelector("#historical-revenue-chart")
    
    if (historicalCharts.revenue) {
        historicalCharts.revenue.destroy();
    }
    historicalCharts.revenue = new Chart(revenueChart, {
    type: "bar",
    
    data: {
        labels: history.years,
        datasets: [{
            label: "Revenue",
            data: history.revenue,
            backgroundColor: "#c8a45c",
            hoverBackgroundColor: "#d8b872",
            borderRadius: 2,
        }]
    },
    options: {
    responsive: true,
    maintainAspectRatio: true,

    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    return (context.parsed.y / 1e9).toFixed(1) + "B";
                }
            }
        }
    },

    scales: {
        x: {
            grid: {
                display: false
            },
            border: {
                display: false
            },
            ticks: {
                color: "#9a958a",
                font: {
                    family: "Inter, sans-serif",
                    size: 11
                }
            }
        },

        y: {
            beginAtZero: true,
            grid: {
                color: "#2a2926"
            },
            border: {
                display: false
            },
            ticks: {
                color: "#9a958a",
                font: {
                    family: "Inter, sans-serif",
                    size: 11
                },
                callback: function(value) {
                    return (value / 1e9).toFixed(0) + "B";
                }
            }
        }
    }
}
});
}
function displayHistoricalEPSChart(history) {
    const epsChart = document.querySelector("#historical-eps-chart");
    if (historicalCharts.eps) {
        historicalCharts.eps.destroy();
    }
    historicalCharts.eps = new Chart(epsChart, {
        type: "bar",

        data: {
            labels: history.years,
            datasets: [{
                label: "EPS",
                data: history.eps,
                backgroundColor: "#c8a45c",
                hoverBackgroundColor: "#d8b872",
                borderRadius: 2,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return "$" + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return "$" + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalGrossMarginChart(history) {
    const grossMarginChart = document.querySelector("#historical-gross-margin-chart");

    if (historicalCharts.grossMargin) {
        historicalCharts.grossMargin.destroy();
    }
    historicalCharts.grossMargin = new Chart(grossMarginChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "Gross Margin",
                data: history.gross_margin,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "%";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalOperatingMarginChart(history) {
    const operatingMarginChart = document.querySelector("#historical-operating-margin-chart");

    if (historicalCharts.operatingMargin) {
        historicalCharts.operatingMargin.destroy();
    }
    historicalCharts.operatingMargin = new Chart(operatingMarginChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "Operating Margin",
                data: history.operating_margin,
                borderColor: "#7fb58a",
                backgroundColor: "#7fb58a",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#7fb58a",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "%";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalFCFChart(history) {
    const fcfChart = document.querySelector("#historical-fcf-chart");

    if (historicalCharts.fcf) {
        historicalCharts.fcf.destroy();
    }
    historicalCharts.fcf = new Chart(fcfChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "Free Cash Flow",
                data: history.fcf,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return "$" + (context.parsed.y / 1e9).toFixed(1) + "B";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return (value / 1e9).toFixed(0) + "B";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalFCFMarginChart(history) {
    const fcfMarginChart = document.querySelector("#historical-fcf-margin-chart");

    if (historicalCharts.fcfMargin) {
        historicalCharts.fcfMargin.destroy();
    }
    historicalCharts.fcfMargin = new Chart(fcfMarginChart, {
        type: "line",

        data: {
            labels: history.years,
            datasets: [{
                label: "FCF Margin",
                data: history.fcf_margin,
                borderColor: "#7fb58a",
                backgroundColor: "#7fb58a",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#7fb58a",
                tension: 0.25,
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "%";
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        }
                    }
                },

                y: {
                    grid: {
                        color: "#2a2926"
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#9a958a",
                        font: {
                            family: "Inter, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return value + "%";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalPEChart(history) {
    const peChart = document.querySelector("#historical-pe-chart");

    if (historicalCharts.pe) {
        historicalCharts.pe.destroy();
    }
    historicalCharts.pe = new Chart(peChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "P/E",
                data: history.pe,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalPFCFChart(history) {
    const pfcfChart = document.querySelector("#historical-p-fcf-chart");

    if (historicalCharts.pfcf) {
        historicalCharts.pfcf.destroy();
    }
    historicalCharts.pfcf = new Chart(pfcfChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "P/FCF",
                data: history.p_fcf,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalEVEBITDAChart(history) {
    const evEbitdaChart = document.querySelector("#historical-ev-ebitda-chart");

    if (historicalCharts.evEbitda) {
        historicalCharts.evEbitda.destroy();
    }
    historicalCharts.evEbitda = new Chart(evEbitdaChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "EV/EBITDA",
                data: history.ev_ebitda,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
function displayHistoricalPBChart(history) {
    const pbChart = document.querySelector("#historical-p-b-chart");

    if (historicalCharts.pb) {
        historicalCharts.pb.destroy();
    }
    historicalCharts.pb = new Chart(pbChart, {
        type: "line",
        data: {
            labels: history.years,
            datasets: [{
                label: "P/B",
                data: history.p_b,
                borderColor: "#c8a45c",
                backgroundColor: "#c8a45c",
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: "#c8a45c",
                tension: 0.25,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + "x";
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "#2a2926" },
                    border: { display: false },
                    ticks: {
                        color: "#9a958a",
                        font: { family: "Inter, sans-serif", size: 11 },
                        callback: function(value) {
                            return value + "x";
                        }
                    }
                }
            }
        }
    });
}
