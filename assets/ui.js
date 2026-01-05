/**
 * CVA | IPP Revenue & Capture Lab - UI Module
 * Handles all UI interactions and state management
 */

const UI = {
    // UI State
    state: {
        currentStep: 1,
        isLoading: false,
        analysisComplete: false
    },

    /**
     * Initialize UI event listeners
     */
    init() {
        this.initEnergyMesh();
        this.initNavigation();
        this.initFormHandlers();
        this.initExportHandlers();
        this.initTooltips();
    },

    /**
     * Initialize animated energy mesh background
     */
    initEnergyMesh() {
        const canvas = document.getElementById('energy-mesh');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];
        const particleCount = 50;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 2 + 1
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(20, 184, 166, 0.5)';
                ctx.fill();

                // Draw connections to nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(20, 184, 166, ${0.2 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        // Store cleanup function
        this._cleanupMesh = () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    },

    /**
     * Initialize navigation handlers
     */
    initNavigation() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.showWizard());
        }

        // Back to hero
        const backToHero = document.getElementById('back-to-hero');
        if (backToHero) {
            backToHero.addEventListener('click', () => this.showHero());
        }

        // Edit params button
        const editParams = document.getElementById('edit-params');
        if (editParams) {
            editParams.addEventListener('click', () => this.showWizard());
        }

        // Wizard navigation buttons
        document.querySelectorAll('[data-next]').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextStep = parseInt(btn.dataset.next);
                this.goToStep(nextStep);
            });
        });

        document.querySelectorAll('[data-prev]').forEach(btn => {
            btn.addEventListener('click', () => {
                const prevStep = parseInt(btn.dataset.prev);
                this.goToStep(prevStep);
            });
        });

        // Run analysis button
        const runBtn = document.getElementById('run-analysis');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runAnalysis());
        }
    },

    /**
     * Initialize form handlers
     */
    initFormHandlers() {
        // Capacity slider sync
        const capacitySlider = document.getElementById('capacity-slider');
        const capacityInput = document.getElementById('capacity');

        if (capacitySlider && capacityInput) {
            capacitySlider.addEventListener('input', (e) => {
                capacityInput.value = e.target.value;
            });
            capacityInput.addEventListener('input', (e) => {
                capacitySlider.value = e.target.value;
            });
        }

        // Efficiency slider sync
        const effSlider = document.getElementById('efficiency-slider');
        const effInput = document.getElementById('efficiency');

        if (effSlider && effInput) {
            effSlider.addEventListener('input', (e) => {
                effInput.value = e.target.value;
            });
            effInput.addEventListener('input', (e) => {
                effSlider.value = e.target.value;
            });
        }

        // Period selection - show/hide custom dates
        document.querySelectorAll('input[name="period"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const customDates = document.getElementById('custom-dates');
                if (customDates) {
                    customDates.classList.toggle('hidden', e.target.value !== 'custom');
                }
            });
        });

        // Route-to-market selection
        document.querySelectorAll('input[name="rtm"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const ppaConfig = document.getElementById('ppa-config');
                if (ppaConfig) {
                    ppaConfig.classList.toggle('hidden', e.target.value !== 'ppa');
                }

                // Update card styling
                document.querySelectorAll('.card-option').forEach(card => {
                    card.classList.remove('selected');
                });
                e.target.closest('.card-option').classList.add('selected');
            });
        });

        // Floor price toggle
        const useFloor = document.getElementById('use-floor');
        if (useFloor) {
            useFloor.addEventListener('change', (e) => {
                const floorConfig = document.getElementById('floor-config');
                if (floorConfig) {
                    floorConfig.classList.toggle('hidden', !e.target.checked);
                }
            });
        }

        // Battery toggle
        const enableBattery = document.getElementById('enable-battery');
        if (enableBattery) {
            enableBattery.addEventListener('change', (e) => {
                const batteryConfig = document.getElementById('battery-config');
                if (batteryConfig) {
                    batteryConfig.style.opacity = e.target.checked ? '1' : '0.5';
                    batteryConfig.style.pointerEvents = e.target.checked ? 'auto' : 'none';
                }
            });
        }

        // Week selector for overlay chart
        const weekSelect = document.getElementById('week-select');
        if (weekSelect) {
            weekSelect.addEventListener('change', (e) => {
                if (window.AppState && window.AppState.representativeWeeks) {
                    const weeks = window.AppState.representativeWeeks;
                    let weekData;

                    switch (e.target.value) {
                        case 'volatile':
                            weekData = weeks.volatile?.data;
                            break;
                        case 'negative':
                            weekData = weeks.negative?.data;
                            break;
                        default:
                            weekData = weeks.typical?.data;
                    }

                    if (weekData) {
                        Charts.renderOverlayChart(weekData);
                    }
                }
            });
        }

        // Battery toggle in results
        const toggleBattery = document.getElementById('toggle-battery');
        if (toggleBattery) {
            toggleBattery.addEventListener('change', (e) => {
                const batteryCard = document.getElementById('battery-chart-card');
                const batteryUpliftCard = document.getElementById('battery-uplift-card');

                if (batteryCard) batteryCard.style.display = e.target.checked ? 'block' : 'none';
                if (batteryUpliftCard) batteryUpliftCard.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // PV source toggle
        document.querySelectorAll('input[name="pv-source"]').forEach(radio => {
            radio.addEventListener('change', async (e) => {
                const warning = document.getElementById('pv-warning');
                if (e.target.value === 'pvgis') {
                    if (warning) {
                        warning.textContent = 'PVGIS is in beta. Fallback to synthetic if API fails.';
                    }
                    // Could trigger re-analysis here
                } else {
                    if (warning) warning.textContent = '';
                }
            });
        });
    },

    /**
     * Initialize export handlers
     */
    initExportHandlers() {
        // Copy memo
        const copyMemoBtn = document.getElementById('copy-memo');
        if (copyMemoBtn) {
            copyMemoBtn.addEventListener('click', () => {
                const memoContent = document.getElementById('memo-content');
                if (memoContent) {
                    const text = memoContent.innerText;
                    navigator.clipboard.writeText(text)
                        .then(() => this.showToast('Memo copied to clipboard', 'success'))
                        .catch(() => this.showToast('Failed to copy memo', 'error'));
                }
            });
        }

        // Export CSV
        const exportCsvBtn = document.getElementById('export-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }

        // Export PDF
        const exportPdfBtn = document.getElementById('export-pdf');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportPDF());
        }

        // Refresh memo
        const refreshMemoBtn = document.getElementById('refresh-memo');
        if (refreshMemoBtn) {
            refreshMemoBtn.addEventListener('click', () => {
                if (window.App && typeof window.App.generateMemo === 'function') {
                    window.App.generateMemo();
                }
            });
        }
    },

    /**
     * Initialize tooltips
     */
    initTooltips() {
        document.querySelectorAll('[title]').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                // Native title works for now, could enhance with custom tooltips
            });
        });
    },

    /**
     * Show hero section
     */
    showHero() {
        document.getElementById('hero')?.classList.remove('hidden');
        document.getElementById('wizard')?.classList.add('hidden');
        document.getElementById('results')?.classList.add('hidden');
    },

    /**
     * Show wizard section
     */
    showWizard() {
        document.getElementById('hero')?.classList.add('hidden');
        document.getElementById('wizard')?.classList.remove('hidden');
        document.getElementById('results')?.classList.add('hidden');
        this.goToStep(1);
    },

    /**
     * Show results section
     */
    showResults() {
        document.getElementById('hero')?.classList.add('hidden');
        document.getElementById('wizard')?.classList.add('hidden');
        document.getElementById('results')?.classList.remove('hidden');
    },

    /**
     * Navigate to wizard step
     */
    goToStep(stepNumber) {
        this.state.currentStep = stepNumber;

        // Update step indicators
        document.querySelectorAll('.wizard-steps .step').forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (num === stepNumber) {
                step.classList.add('active');
            } else if (num < stepNumber) {
                step.classList.add('completed');
            }
        });

        // Show/hide step content
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(`step-${stepNumber}`)?.classList.add('active');
    },

    /**
     * Collect form data
     */
    getFormData() {
        return {
            market: document.getElementById('market')?.value || 'DE-LU',
            technology: document.getElementById('technology')?.value || 'solar',
            capacityMW: parseFloat(document.getElementById('capacity')?.value) || 50,
            cod: document.getElementById('cod')?.value || null,
            period: document.querySelector('input[name="period"]:checked')?.value || '12',
            dateStart: document.getElementById('date-start')?.value || null,
            dateEnd: document.getElementById('date-end')?.value || null,
            demoMode: document.getElementById('demo-mode')?.checked ?? true,
            routeToMarket: document.querySelector('input[name="rtm"]:checked')?.value || 'merchant',
            ppaPrice: parseFloat(document.getElementById('ppa-price')?.value) || 70,
            useFloor: document.getElementById('use-floor')?.checked ?? false,
            floorPrice: parseFloat(document.getElementById('floor-price')?.value) || 0,
            enableBattery: document.getElementById('enable-battery')?.checked ?? true,
            batteryPower: parseFloat(document.getElementById('battery-power')?.value) || 25,
            batteryEnergy: parseFloat(document.getElementById('battery-energy')?.value) || 50,
            efficiency: parseFloat(document.getElementById('efficiency')?.value) / 100 || 0.88,
            oneCyclePerDay: document.getElementById('one-cycle')?.checked ?? true
        };
    },

    /**
     * Run the analysis
     */
    async runAnalysis() {
        const formData = this.getFormData();

        // Dispatch event for App to handle
        window.dispatchEvent(new CustomEvent('runAnalysis', { detail: formData }));
    },

    /**
     * Update parameter summary in results
     */
    updateParamSummary(formData) {
        document.getElementById('summary-market').textContent = formData.market;
        document.getElementById('summary-capacity').textContent = `${formData.capacityMW} MW`;

        let periodText = 'Last 12 months';
        if (formData.period === '24') periodText = 'Last 24 months';
        else if (formData.period === 'custom') periodText = `${formData.dateStart} to ${formData.dateEnd}`;
        document.getElementById('summary-period').textContent = periodText;

        document.getElementById('summary-route').textContent =
            formData.routeToMarket === 'merchant' ? 'Merchant' : `PPA (${formData.ppaPrice} EUR/MWh)`;
    },

    /**
     * Update KPI cards
     */
    updateKPIs(kpis, batteryResults) {
        // Remove skeleton class and update values
        const updateKPI = (id, value, removeSkeletonOnly = false) => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('skeleton');
                if (!removeSkeletonOnly) {
                    el.textContent = value;
                }
            }
        };

        updateKPI('kpi-baseload', kpis.baseloadAvg.toFixed(1));
        updateKPI('kpi-capture', kpis.capturePrice.toFixed(1));
        updateKPI('kpi-rate', kpis.captureRate.toFixed(1));
        updateKPI('kpi-neghours', kpis.negativeHoursCount);
        updateKPI('kpi-revenue', (kpis.merchantRevenue / 1000).toFixed(0));

        // Update sub-values
        document.getElementById('kpi-negpct').textContent = `${kpis.negativePercentage.toFixed(1)}% of production`;

        // Battery KPIs
        if (batteryResults) {
            updateKPI('kpi-uplift', `+${(batteryResults.totalUplift / 1000).toFixed(0)}`);
            document.getElementById('kpi-uplift-pct').textContent = `+${batteryResults.upliftPercentage}% revenue`;
        }

        // Risk metrics
        document.getElementById('risk-p5').textContent = `${(kpis.riskMetrics.p5 / 1000).toFixed(0)} kEUR`;
        document.getElementById('risk-p50').textContent = `${(kpis.riskMetrics.p50 / 1000).toFixed(0)} kEUR`;
        document.getElementById('risk-p95').textContent = `${(kpis.riskMetrics.p95 / 1000).toFixed(0)} kEUR`;

        // Battery summary
        if (batteryResults) {
            document.getElementById('battery-shifted').textContent = `${batteryResults.totalShiftedMWh} MWh`;
            document.getElementById('battery-neg-reduction').textContent = `${batteryResults.negativeReduction.toFixed(0)}%`;
            document.getElementById('battery-eff-capture').textContent = `${batteryResults.effectiveCapturePrice.toFixed(1)} EUR/MWh`;
        }
    },

    /**
     * Update memo content
     */
    updateMemo(memoMarkdown) {
        const memoContent = document.getElementById('memo-content');
        if (memoContent) {
            // Simple markdown to HTML conversion
            let html = memoMarkdown
                .replace(/### (.*)/g, '<h3>$1</h3>')
                .replace(/## (.*)/g, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- (.*)/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>)\n(?=<li>)/g, '$1')
                .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');

            html = `<p>${html}</p>`.replace(/<p><\/p>/g, '').replace(/<p><h3>/g, '<h3>').replace(/<\/h3><\/p>/g, '</h3>');

            memoContent.innerHTML = html;
        }
    },

    /**
     * Show loading overlay
     */
    showLoading(message = 'Analyzing Market Data') {
        const overlay = document.getElementById('loading-overlay');
        const status = overlay?.querySelector('.loading-status');

        if (overlay) {
            overlay.classList.remove('hidden');
        }
        if (status) {
            status.textContent = message;
        }

        this.state.isLoading = true;
    },

    /**
     * Update loading progress
     */
    updateLoadingProgress(percent, message) {
        const progressBar = document.querySelector('.progress-bar');
        const status = document.querySelector('.loading-status');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (status && message) {
            status.textContent = message;
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        this.state.isLoading = false;
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Export data as CSV
     */
    exportCSV() {
        if (!window.AppState || !window.AppState.kpis) {
            this.showToast('No data to export', 'warning');
            return;
        }

        const kpis = window.AppState.kpis;
        const batteryResults = window.AppState.batteryResults;
        const formData = window.AppState.formData;

        // Build CSV content
        let csv = 'Metric,Value,Unit\n';
        csv += `Market,${formData.market},\n`;
        csv += `Capacity,${formData.capacityMW},MW\n`;
        csv += `Baseload Avg Price,${kpis.baseloadAvg},EUR/MWh\n`;
        csv += `Capture Price,${kpis.capturePrice},EUR/MWh\n`;
        csv += `Capture Rate,${kpis.captureRate},%\n`;
        csv += `Negative Hours,${kpis.negativeHoursCount},hours\n`;
        csv += `Negative Exposure,${kpis.negativePercentage},%\n`;
        csv += `Total Production,${kpis.totalProduction},MWh\n`;
        csv += `Merchant Revenue,${kpis.merchantRevenue},EUR\n`;
        csv += `P5 Monthly Revenue,${kpis.riskMetrics.p5},EUR\n`;
        csv += `P50 Monthly Revenue,${kpis.riskMetrics.p50},EUR\n`;
        csv += `P95 Monthly Revenue,${kpis.riskMetrics.p95},EUR\n`;

        if (batteryResults) {
            csv += `\nBattery Analysis\n`;
            csv += `Battery Power,${batteryResults.config.powerMW},MW\n`;
            csv += `Battery Energy,${batteryResults.config.energyMWh},MWh\n`;
            csv += `Revenue Uplift,${batteryResults.totalUplift},EUR\n`;
            csv += `Uplift Percentage,${batteryResults.upliftPercentage},%\n`;
            csv += `Shifted MWh,${batteryResults.totalShiftedMWh},MWh\n`;
            csv += `Neg Exposure Reduction,${batteryResults.negativeReduction},%\n`;
            csv += `Effective Capture Price,${batteryResults.effectiveCapturePrice},EUR/MWh\n`;
        }

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cva_capture_analysis_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('CSV downloaded', 'success');
    },

    /**
     * Export as PDF (simplified - prints the page)
     */
    exportPDF() {
        this.showToast('Preparing PDF...', 'info');

        // Add print-specific class
        document.body.classList.add('printing');

        setTimeout(() => {
            window.print();
            document.body.classList.remove('printing');
        }, 500);
    }
};

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => UI.init());
