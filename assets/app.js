/**
 * CVA | IPP Revenue & Capture Lab - Main Application
 * Orchestrates data fetching, computation, and UI updates
 */

// Global state for sharing between modules
window.AppState = {
    formData: null,
    priceData: null,
    pvProfile: null,
    alignedData: null,
    kpis: null,
    batteryResults: null,
    representativeWeeks: null,
    memoContent: null,
    dataSource: 'live'
};

const App = {
    /**
     * Initialize the application
     */
    init() {
        // Listen for run analysis event from UI
        window.addEventListener('runAnalysis', (e) => {
            this.runAnalysis(e.detail);
        });

        console.log('CVA IPP Revenue & Capture Lab initialized');
    },

    /**
     * Main analysis workflow
     */
    async runAnalysis(formData) {
        window.AppState.formData = formData;

        try {
            UI.showLoading('Initializing analysis...');
            UI.updateLoadingProgress(5, 'Initializing analysis...');

            // Step 1: Fetch price data
            UI.updateLoadingProgress(10, 'Fetching day-ahead prices...');
            const priceData = await this.fetchPriceData(formData);
            window.AppState.priceData = priceData.prices;
            window.AppState.dataSource = priceData.source;

            // Step 2: Generate PV profile
            UI.updateLoadingProgress(30, 'Generating PV production profile...');
            const pvProfile = await this.getPVProfile(formData, priceData.startDate, priceData.endDate);
            window.AppState.pvProfile = pvProfile;

            // Step 3: Align data
            UI.updateLoadingProgress(45, 'Aligning price and production data...');
            const alignedData = DataSources.alignData(priceData.prices, pvProfile);
            window.AppState.alignedData = alignedData;

            if (alignedData.length === 0) {
                throw new Error('No aligned data available. Please check the date range.');
            }

            // Step 4: Calculate KPIs
            UI.updateLoadingProgress(55, 'Computing capture metrics...');
            const kpis = Compute.calculateKPIs(alignedData, formData.capacityMW, {
                floorPrice: formData.useFloor ? formData.floorPrice : null,
                ppaPrice: formData.routeToMarket === 'ppa' ? formData.ppaPrice : null
            });
            window.AppState.kpis = kpis;

            // Step 5: Battery simulation (if enabled)
            let batteryResults = null;
            if (formData.enableBattery) {
                UI.updateLoadingProgress(65, 'Running battery simulation...');
                batteryResults = Compute.simulateBattery(alignedData, {
                    powerMW: formData.batteryPower,
                    energyMWh: formData.batteryEnergy,
                    efficiency: formData.efficiency,
                    oneCyclePerDay: formData.oneCyclePerDay
                });
                window.AppState.batteryResults = batteryResults;
            }

            // Step 6: Find representative weeks
            UI.updateLoadingProgress(75, 'Identifying representative periods...');
            const representativeWeeks = Compute.findRepresentativeWeeks(alignedData);
            window.AppState.representativeWeeks = representativeWeeks;

            // Step 7: Show results and render charts
            UI.updateLoadingProgress(85, 'Rendering visualizations...');
            UI.showResults();
            UI.updateParamSummary(formData);
            UI.updateKPIs(kpis, batteryResults);

            // Render charts
            await this.renderCharts(kpis, batteryResults, representativeWeeks);

            // Step 8: Generate AI memo
            UI.updateLoadingProgress(95, 'Generating executive summary...');
            await this.generateMemo();

            UI.updateLoadingProgress(100, 'Analysis complete!');
            setTimeout(() => UI.hideLoading(), 500);

            // Show success toast
            const source = priceData.source === 'demo' ? 'sample data (demo mode)' : 'live Energy-Charts data';
            UI.showToast(`Analysis complete using ${source}`, 'success');

        } catch (error) {
            console.error('Analysis failed:', error);
            UI.hideLoading();
            UI.showToast(`Analysis failed: ${error.message}`, 'error');
        }
    },

    /**
     * Fetch price data from API or use sample data
     */
    async fetchPriceData(formData) {
        const { market, period, dateStart, dateEnd, demoMode } = formData;

        // Determine date range
        let startDate, endDate;

        if (period === 'custom' && dateStart && dateEnd) {
            startDate = new Date(dateStart);
            endDate = new Date(dateEnd);
        } else {
            endDate = new Date();
            startDate = new Date();
            const months = period === '24' ? 24 : 12;
            startDate.setMonth(startDate.getMonth() - months);
        }

        // Try to fetch from API
        try {
            const prices = await DataSources.fetchPrices(market, startDate, endDate);

            if (prices && prices.length > 0) {
                return {
                    prices,
                    startDate,
                    endDate,
                    source: 'live'
                };
            }
            throw new Error('Empty response from API');
        } catch (error) {
            console.warn('API fetch failed:', error);

            if (demoMode) {
                console.log('Using sample data (demo mode)');
                const sampleData = DataSources.getSampleData(formData.capacityMW);
                return {
                    prices: sampleData.prices,
                    startDate,
                    endDate,
                    source: 'demo'
                };
            }

            throw new Error('Unable to fetch price data. Enable demo mode for sample data.');
        }
    },

    /**
     * Get PV profile (synthetic or PVGIS)
     */
    async getPVProfile(formData, startDate, endDate) {
        const { capacityMW, market } = formData;

        // For now, always use synthetic profile
        // PVGIS integration would go here as a beta feature
        return DataSources.generateSyntheticPVProfile(startDate, endDate, capacityMW, market);
    },

    /**
     * Render all charts
     */
    async renderCharts(kpis, batteryResults, representativeWeeks) {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Price vs PV overlay chart
        if (representativeWeeks.typical?.data) {
            Charts.renderOverlayChart(representativeWeeks.typical.data);
        }

        // Monthly capture rate trend
        Charts.renderCaptureRateTrend(kpis.monthlyCaptureRates);

        // Price distribution histogram
        Charts.renderDistribution(kpis.priceDistribution);

        // Negative price heatmap
        Charts.renderHeatmap(kpis.negativeHeatmap);

        // Battery impact chart
        if (batteryResults) {
            Charts.renderBatteryChart(batteryResults, kpis);
        }

        // Create sparklines for KPI cards
        if (kpis.monthlyCaptureRates.length > 0) {
            const captureRates = kpis.monthlyCaptureRates.map(m => m.rate);
            Charts.createSparkline(captureRates, 'spark-capture', CONFIG.COLORS.primary);

            const baseloadPrices = kpis.monthlyCaptureRates.map(m => m.baseload);
            Charts.createSparkline(baseloadPrices, 'spark-baseload', CONFIG.COLORS.warning);
        }
    },

    /**
     * Generate AI memo (with fallback)
     */
    async generateMemo() {
        const { formData, kpis, batteryResults, dataSource } = window.AppState;

        const analysisData = {
            market: formData.market,
            period: formData.period === 'custom'
                ? `${formData.dateStart} to ${formData.dateEnd}`
                : `Last ${formData.period} months`,
            capacityMW: formData.capacityMW,
            kpis,
            batteryResults,
            routeToMarket: formData.routeToMarket === 'merchant' ? 'Merchant (spot indexed)' : `PPA (${formData.ppaPrice} EUR/MWh)`,
            hasBattery: formData.enableBattery && batteryResults !== null,
            dataSource,
            pvSource: 'synthetic'
        };

        // Try to call backend API
        if (CONFIG.API.INSIGHTS_ENDPOINT) {
            try {
                const response = await fetch(CONFIG.API.INSIGHTS_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: PromptTemplates.buildAnalysisPrompt(analysisData),
                        system: PromptTemplates.getSystemPrompt()
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.memo) {
                        const formattedMemo = PromptTemplates.formatMemoResponse(data.memo);
                        window.AppState.memoContent = formattedMemo;
                        UI.updateMemo(formattedMemo);
                        return;
                    }
                }
            } catch (error) {
                console.warn('AI memo API call failed:', error);
            }
        }

        // Fallback to template-based memo
        console.log('Using fallback memo template');
        const fallbackMemo = PromptTemplates.generateFallbackMemo(analysisData);
        window.AppState.memoContent = fallbackMemo;
        UI.updateMemo(fallbackMemo);
    }
};

// Make App available globally for UI callbacks
window.App = App;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
