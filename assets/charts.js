/**
 * CVA | IPP Revenue & Capture Lab - Charts Module
 * Interactive chart rendering with Chart.js
 */

const Charts = {
    instances: {},

    // Common chart options
    commonOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 33, 64, 0.95)',
                titleColor: '#fff',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                titleFont: {
                    size: 13,
                    weight: 600
                },
                bodyFont: {
                    size: 12
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 }
                }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    },

    /**
     * Initialize/update the price vs PV output overlay chart
     */
    renderOverlayChart(weekData, containerId = 'chart-overlay') {
        const ctx = document.getElementById(containerId);
        if (!ctx) return;

        // Destroy existing chart
        if (this.instances[containerId]) {
            this.instances[containerId].destroy();
        }

        // Prepare data
        const labels = weekData.map(d => {
            const date = new Date(d.timestamp * 1000);
            return date.toLocaleString('en-GB', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        const prices = weekData.map(d => d.price);
        const outputs = weekData.map(d => d.output);

        // Find max output for scaling
        const maxOutput = Math.max(...outputs);

        this.instances[containerId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'PV Output (MW)',
                        data: outputs,
                        backgroundColor: 'rgba(20, 184, 166, 0.3)',
                        borderColor: CONFIG.COLORS.primary,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y1',
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Price (EUR/MWh)',
                        data: prices,
                        backgroundColor: 'transparent',
                        borderColor: CONFIG.COLORS.warning,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y',
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                ...this.commonOptions,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    ...this.commonOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#94a3b8',
                            usePointStyle: true,
                            pointStyle: 'line',
                            padding: 20,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        ...this.commonOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.raw;
                                if (label.includes('Price')) {
                                    return `${label}: ${value.toFixed(2)} EUR/MWh`;
                                }
                                return `${label}: ${value.toFixed(2)} MW`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ...this.commonOptions.scales.x,
                        ticks: {
                            ...this.commonOptions.scales.x.ticks,
                            maxTicksLimit: 14,
                            maxRotation: 45
                        }
                    },
                    y: {
                        ...this.commonOptions.scales.y,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Price (EUR/MWh)',
                            color: '#64748b',
                            font: { size: 11 }
                        }
                    },
                    y1: {
                        ...this.commonOptions.scales.y,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'PV Output (MW)',
                            color: '#64748b',
                            font: { size: 11 }
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        min: 0,
                        max: maxOutput * 1.2
                    }
                }
            }
        });

        // Remove skeleton
        this.removeSkeleton(containerId);
    },

    /**
     * Render monthly capture rate trend
     */
    renderCaptureRateTrend(monthlyCaptureRates, containerId = 'chart-capture-trend') {
        const ctx = document.getElementById(containerId);
        if (!ctx) return;

        if (this.instances[containerId]) {
            this.instances[containerId].destroy();
        }

        const labels = monthlyCaptureRates.map(m => {
            const [year, month] = m.month.split('-');
            return new Date(year, month - 1).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
        });

        const rates = monthlyCaptureRates.map(m => m.rate);

        // Color bars based on value (red if < 80%, amber if < 90%, green otherwise)
        const barColors = rates.map(r => {
            if (r < 80) return CONFIG.COLORS.negative;
            if (r < 90) return CONFIG.COLORS.warning;
            return CONFIG.COLORS.primary;
        });

        this.instances[containerId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Capture Rate (%)',
                    data: rates,
                    backgroundColor: barColors,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.commonOptions,
                plugins: {
                    ...this.commonOptions.plugins,
                    tooltip: {
                        ...this.commonOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                return `Capture Rate: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    ...this.commonOptions.scales,
                    y: {
                        ...this.commonOptions.scales.y,
                        min: 50,
                        max: 120,
                        ticks: {
                            ...this.commonOptions.scales.y.ticks,
                            callback: value => `${value}%`
                        }
                    }
                }
            }
        });

        // Add reference line at 100%
        this.addReferenceLine(this.instances[containerId], 100, 'rgba(255, 255, 255, 0.3)');

        this.removeSkeleton(containerId);
    },

    /**
     * Render price distribution histogram
     */
    renderDistribution(priceDistribution, containerId = 'chart-distribution') {
        const ctx = document.getElementById(containerId);
        if (!ctx) return;

        if (this.instances[containerId]) {
            this.instances[containerId].destroy();
        }

        const labels = priceDistribution.map(b => b.range);

        this.instances[containerId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'All Hours',
                        data: priceDistribution.map(b => b.allPct),
                        backgroundColor: 'rgba(100, 116, 139, 0.5)',
                        borderColor: CONFIG.COLORS.neutral,
                        borderWidth: 1,
                        borderRadius: 2
                    },
                    {
                        label: 'PV Hours',
                        data: priceDistribution.map(b => b.pvPct),
                        backgroundColor: 'rgba(20, 184, 166, 0.7)',
                        borderColor: CONFIG.COLORS.primary,
                        borderWidth: 1,
                        borderRadius: 2
                    }
                ]
            },
            options: {
                ...this.commonOptions,
                plugins: {
                    ...this.commonOptions.plugins,
                    legend: {
                        display: false // Using inline legend in HTML
                    },
                    tooltip: {
                        ...this.commonOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    ...this.commonOptions.scales,
                    x: {
                        ...this.commonOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Price Range (EUR/MWh)',
                            color: '#64748b',
                            font: { size: 10 }
                        },
                        ticks: {
                            ...this.commonOptions.scales.x.ticks,
                            maxRotation: 45
                        }
                    },
                    y: {
                        ...this.commonOptions.scales.y,
                        title: {
                            display: true,
                            text: '% of Hours',
                            color: '#64748b',
                            font: { size: 10 }
                        },
                        ticks: {
                            ...this.commonOptions.scales.y.ticks,
                            callback: value => `${value}%`
                        }
                    }
                }
            }
        });

        this.removeSkeleton(containerId);
    },

    /**
     * Render negative price heatmap
     */
    renderHeatmap(heatmapData, containerId = 'chart-heatmap') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { heatmap, counts, maxCount } = heatmapData;

        // Clear container
        container.innerHTML = '';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        // Create cells (hour rows, month columns)
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 12; m++) {
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';

                const count = heatmap[m][h];
                const total = counts[m][h];
                const intensity = maxCount > 0 ? count / maxCount : 0;

                // Color scale from transparent to red
                if (count === 0) {
                    cell.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                } else {
                    const r = Math.round(239 + (245 - 239) * (1 - intensity));
                    const g = Math.round(68 + (158 - 68) * (1 - intensity));
                    const b = Math.round(68 + (11 - 68) * (1 - intensity));
                    cell.style.backgroundColor = `rgba(${239}, ${Math.round(68 + 90 * (1 - intensity))}, ${68}, ${0.3 + intensity * 0.7})`;
                }

                cell.title = `${months[m]} ${String(h).padStart(2, '0')}:00 - ${count} negative hours (${total} total PV hours)`;

                container.appendChild(cell);
            }
        }

        // Update max label
        const maxLabel = document.getElementById('heatmap-max');
        if (maxLabel) {
            maxLabel.textContent = `${maxCount}+ hrs`;
        }

        // Remove skeleton
        const skeleton = container.parentElement.querySelector('.chart-skeleton');
        if (skeleton) skeleton.style.display = 'none';
    },

    /**
     * Render battery impact chart
     */
    renderBatteryChart(batteryResults, kpis, containerId = 'chart-battery') {
        const ctx = document.getElementById(containerId);
        if (!ctx) return;

        if (this.instances[containerId]) {
            this.instances[containerId].destroy();
        }

        // Prepare comparison data
        const labels = ['Revenue (kEUR)', 'Capture Price', 'Neg. Exposure'];

        const beforeData = [
            kpis.merchantRevenue / 1000,
            kpis.capturePrice,
            kpis.negativePercentage
        ];

        const afterData = [
            (kpis.merchantRevenue + batteryResults.totalUplift) / 1000,
            batteryResults.effectiveCapturePrice,
            Math.max(0, kpis.negativePercentage - batteryResults.negativeReduction)
        ];

        this.instances[containerId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Without Battery',
                        data: beforeData,
                        backgroundColor: 'rgba(100, 116, 139, 0.5)',
                        borderColor: CONFIG.COLORS.neutral,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'With Battery',
                        data: afterData,
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderColor: CONFIG.COLORS.positive,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                ...this.commonOptions,
                indexAxis: 'y',
                plugins: {
                    ...this.commonOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#94a3b8',
                            usePointStyle: true,
                            pointStyle: 'rect',
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        ...this.commonOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.raw;
                                const metric = context.label;

                                if (metric.includes('Revenue')) {
                                    return `${label}: ${value.toFixed(0)} kEUR`;
                                } else if (metric.includes('Capture')) {
                                    return `${label}: ${value.toFixed(2)} EUR/MWh`;
                                } else {
                                    return `${label}: ${value.toFixed(1)}%`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ...this.commonOptions.scales.x,
                        beginAtZero: true
                    },
                    y: {
                        ...this.commonOptions.scales.y
                    }
                }
            }
        });

        this.removeSkeleton(containerId);
    },

    /**
     * Create mini sparkline for KPI cards
     */
    createSparkline(data, containerId, color = CONFIG.COLORS.primary) {
        const container = document.getElementById(containerId);
        if (!container || data.length === 0) return;

        // Create a mini canvas
        const canvas = document.createElement('canvas');
        canvas.width = container.offsetWidth || 100;
        canvas.height = 24;
        container.innerHTML = '';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Normalize data
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        data.forEach((value, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * height * 0.8 - height * 0.1;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    },

    /**
     * Add reference line to chart
     */
    addReferenceLine(chart, value, color) {
        const plugin = {
            id: 'referenceLine',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const yAxis = chart.scales.y;
                const y = yAxis.getPixelForValue(value);

                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(chart.chartArea.left, y);
                ctx.lineTo(chart.chartArea.right, y);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        };

        chart.options.plugins.referenceLine = plugin;
        chart.update();
    },

    /**
     * Remove loading skeleton
     */
    removeSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const skeleton = container.parentElement?.querySelector('.chart-skeleton');
            if (skeleton) {
                skeleton.style.display = 'none';
            }
        }
    },

    /**
     * Show loading skeleton
     */
    showSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const skeleton = container.parentElement?.querySelector('.chart-skeleton');
            if (skeleton) {
                skeleton.style.display = 'block';
            }
        }
    },

    /**
     * Destroy all chart instances
     */
    destroyAll() {
        Object.values(this.instances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.instances = {};
    }
};
