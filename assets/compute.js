/**
 * CVA | IPP Revenue & Capture Lab - Computation Engine
 * KPI calculations and battery simulation
 */

const Compute = {
    /**
     * Calculate all KPIs from aligned price/PV data
     * @param {Array} data - Aligned data array [{timestamp, price, output, date}]
     * @param {number} capacityMW - Installed capacity in MW
     * @param {Object} options - Additional options
     * @returns {Object} Computed KPIs
     */
    calculateKPIs(data, capacityMW, options = {}) {
        const {
            floorPrice = null,
            ppaPrice = null
        } = options;

        // Basic validation
        if (!data || data.length === 0) {
            throw new Error('No data available for computation');
        }

        // Baseload average price
        const baseloadAvg = this.calculateMean(data.map(d => d.price));

        // Total production (MWh)
        const totalProduction = data.reduce((sum, d) => sum + d.output, 0); // Already in MW, hourly = MWh

        // PV-weighted capture price
        const weightedSum = data.reduce((sum, d) => sum + (d.price * d.output), 0);
        const capturePrice = totalProduction > 0 ? weightedSum / totalProduction : 0;

        // Capture rate
        const captureRate = baseloadAvg > 0 ? (capturePrice / baseloadAvg) * 100 : 0;

        // Negative price exposure
        const negativeHours = data.filter(d => d.price < 0 && d.output > 0);
        const negativeHoursCount = negativeHours.length;
        const negativeMWh = negativeHours.reduce((sum, d) => sum + d.output, 0);
        const negativePercentage = totalProduction > 0 ? (negativeMWh / totalProduction) * 100 : 0;

        // Revenue calculations
        let merchantRevenue = data.reduce((sum, d) => {
            let effectivePrice = d.price;
            if (floorPrice !== null) {
                effectivePrice = Math.max(effectivePrice, floorPrice);
            }
            return sum + (effectivePrice * d.output);
        }, 0);

        // PPA revenue (if applicable)
        let ppaRevenue = null;
        if (ppaPrice !== null) {
            ppaRevenue = totalProduction * ppaPrice;
        }

        // Monthly revenue distribution for risk metrics
        const monthlyRevenues = this.calculateMonthlyRevenues(data);
        const riskMetrics = this.calculateRiskMetrics(monthlyRevenues);

        // Monthly capture rates for trend
        const monthlyCaptureRates = this.calculateMonthlyCaptureRates(data);

        // Price distribution analysis
        const priceDistribution = this.calculatePriceDistribution(data);

        // Negative hours heatmap data
        const negativeHeatmap = this.calculateNegativeHeatmap(data);

        return {
            baseloadAvg: Math.round(baseloadAvg * 100) / 100,
            capturePrice: Math.round(capturePrice * 100) / 100,
            captureRate: Math.round(captureRate * 10) / 10,
            negativeHoursCount,
            negativeMWh: Math.round(negativeMWh),
            negativePercentage: Math.round(negativePercentage * 10) / 10,
            totalProduction: Math.round(totalProduction),
            merchantRevenue: Math.round(merchantRevenue),
            ppaRevenue: ppaRevenue !== null ? Math.round(ppaRevenue) : null,
            riskMetrics,
            monthlyCaptureRates,
            priceDistribution,
            negativeHeatmap,
            dataPoints: data.length
        };
    },

    /**
     * Calculate monthly revenues
     */
    calculateMonthlyRevenues(data) {
        const monthlyMap = new Map();

        data.forEach(d => {
            const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap.has(key)) {
                monthlyMap.set(key, { revenue: 0, production: 0 });
            }
            const month = monthlyMap.get(key);
            month.revenue += d.price * d.output;
            month.production += d.output;
        });

        return Array.from(monthlyMap.entries())
            .map(([month, data]) => ({
                month,
                revenue: data.revenue,
                production: data.production
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    },

    /**
     * Calculate risk metrics (P5, P50, P95 of monthly revenues)
     */
    calculateRiskMetrics(monthlyRevenues) {
        const revenues = monthlyRevenues.map(m => m.revenue);

        if (revenues.length === 0) {
            return { p5: 0, p50: 0, p95: 0 };
        }

        revenues.sort((a, b) => a - b);

        return {
            p5: Math.round(this.percentile(revenues, 5)),
            p50: Math.round(this.percentile(revenues, 50)),
            p95: Math.round(this.percentile(revenues, 95))
        };
    },

    /**
     * Calculate monthly capture rates
     */
    calculateMonthlyCaptureRates(data) {
        const monthlyMap = new Map();

        data.forEach(d => {
            const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap.has(key)) {
                monthlyMap.set(key, {
                    priceSum: 0,
                    weightedPriceSum: 0,
                    outputSum: 0,
                    count: 0
                });
            }
            const month = monthlyMap.get(key);
            month.priceSum += d.price;
            month.weightedPriceSum += d.price * d.output;
            month.outputSum += d.output;
            month.count++;
        });

        return Array.from(monthlyMap.entries())
            .map(([month, data]) => {
                const baseload = data.priceSum / data.count;
                const capture = data.outputSum > 0 ? data.weightedPriceSum / data.outputSum : 0;
                const rate = baseload > 0 ? (capture / baseload) * 100 : 0;
                return {
                    month,
                    baseload: Math.round(baseload * 100) / 100,
                    capture: Math.round(capture * 100) / 100,
                    rate: Math.round(rate * 10) / 10
                };
            })
            .sort((a, b) => a.month.localeCompare(b.month));
    },

    /**
     * Calculate price distribution (for histogram)
     */
    calculatePriceDistribution(data) {
        const allPrices = data.map(d => d.price);
        const pvPrices = data.filter(d => d.output > 0).map(d => d.price);

        // Create bins
        const min = Math.floor(Math.min(...allPrices) / 10) * 10;
        const max = Math.ceil(Math.max(...allPrices) / 10) * 10;
        const binWidth = 10;
        const bins = [];

        for (let i = min; i < max; i += binWidth) {
            bins.push({
                range: `${i}-${i + binWidth}`,
                min: i,
                max: i + binWidth,
                allCount: 0,
                pvCount: 0
            });
        }

        // Fill bins
        allPrices.forEach(price => {
            const bin = bins.find(b => price >= b.min && price < b.max);
            if (bin) bin.allCount++;
        });

        pvPrices.forEach(price => {
            const bin = bins.find(b => price >= b.min && price < b.max);
            if (bin) bin.pvCount++;
        });

        // Convert to percentages
        const allTotal = allPrices.length;
        const pvTotal = pvPrices.length;

        return bins.map(b => ({
            range: b.range,
            min: b.min,
            allPct: Math.round((b.allCount / allTotal) * 1000) / 10,
            pvPct: pvTotal > 0 ? Math.round((b.pvCount / pvTotal) * 1000) / 10 : 0
        }));
    },

    /**
     * Calculate negative price heatmap (month x hour)
     */
    calculateNegativeHeatmap(data) {
        // Create 12x24 matrix (months x hours)
        const heatmap = Array(12).fill(null).map(() => Array(24).fill(0));
        const counts = Array(12).fill(null).map(() => Array(24).fill(0));

        data.forEach(d => {
            if (d.output > 0) { // Only during production
                const month = d.date.getMonth();
                const hour = d.date.getHours();
                counts[month][hour]++;
                if (d.price < 0) {
                    heatmap[month][hour]++;
                }
            }
        });

        // Find max for scaling
        let maxCount = 0;
        for (let m = 0; m < 12; m++) {
            for (let h = 0; h < 24; h++) {
                if (heatmap[m][h] > maxCount) maxCount = heatmap[m][h];
            }
        }

        return { heatmap, counts, maxCount };
    },

    /**
     * Simulate battery dispatch
     * @param {Array} data - Aligned data array
     * @param {Object} batteryConfig - Battery configuration
     * @returns {Object} Battery simulation results
     */
    simulateBattery(data, batteryConfig) {
        const {
            powerMW,
            energyMWh,
            efficiency,
            oneCyclePerDay = true
        } = batteryConfig;

        const sqrtEfficiency = Math.sqrt(efficiency);
        const minSOC = CONFIG.BATTERY.MIN_SOC * energyMWh;
        const maxSOC = CONFIG.BATTERY.MAX_SOC * energyMWh;

        // Group data by day
        const days = this.groupByDay(data);

        let totalUplift = 0;
        let totalShiftedMWh = 0;
        let totalNegativeAvoided = 0;
        let originalNegativeRevenue = 0;
        let newNegativeRevenue = 0;

        const dailyResults = [];

        for (const dayData of days) {
            // Sort hours by price to find best charge/discharge opportunities
            const sortedHours = [...dayData].sort((a, b) => a.price - b.price);

            // Identify charging hours (lowest prices during PV production)
            const chargeHours = sortedHours
                .filter(d => d.output > 0) // Only charge from PV
                .slice(0, oneCyclePerDay ? Math.ceil(energyMWh / powerMW) : 24);

            // Identify discharge hours (highest prices)
            const dischargeHours = sortedHours
                .filter(d => d.output === 0 || !chargeHours.includes(d)) // Discharge when not charging
                .reverse()
                .slice(0, oneCyclePerDay ? Math.ceil(energyMWh / powerMW) : 24);

            let soc = minSOC;
            let dayUplift = 0;
            let dayShifted = 0;
            let dayNegAvoided = 0;

            // Simulate charging (from PV)
            for (const hour of chargeHours) {
                const availableCapacity = maxSOC - soc;
                const chargeableFromPV = Math.min(hour.output, powerMW);
                const actualCharge = Math.min(chargeableFromPV, availableCapacity) * sqrtEfficiency;

                if (actualCharge > 0) {
                    // Revenue foregone from not selling to grid
                    const chargeRevenueLost = (actualCharge / sqrtEfficiency) * hour.price;
                    dayUplift -= chargeRevenueLost;
                    soc += actualCharge;
                    dayShifted += actualCharge / sqrtEfficiency;

                    // Track negative price avoidance
                    if (hour.price < 0) {
                        dayNegAvoided += actualCharge / sqrtEfficiency;
                    }
                }
            }

            // Simulate discharging
            for (const hour of dischargeHours) {
                const availableEnergy = soc - minSOC;
                const actualDischarge = Math.min(powerMW, availableEnergy);

                if (actualDischarge > 0) {
                    // Revenue gained from discharging at higher price
                    const dischargeRevenue = actualDischarge * sqrtEfficiency * hour.price;
                    dayUplift += dischargeRevenue;
                    soc -= actualDischarge;
                }
            }

            // Track negative exposure
            for (const hour of dayData) {
                if (hour.price < 0 && hour.output > 0) {
                    originalNegativeRevenue += hour.price * hour.output;
                }
            }

            totalUplift += dayUplift;
            totalShiftedMWh += dayShifted;
            totalNegativeAvoided += dayNegAvoided;

            dailyResults.push({
                date: dayData[0].date,
                uplift: dayUplift,
                shifted: dayShifted
            });
        }

        // Calculate effective capture price with battery
        const originalRevenue = data.reduce((sum, d) => sum + d.price * d.output, 0);
        const newRevenue = originalRevenue + totalUplift;
        const totalProduction = data.reduce((sum, d) => sum + d.output, 0);
        const effectiveCapturePrice = totalProduction > 0 ? newRevenue / totalProduction : 0;

        // Negative exposure reduction
        const negativeReduction = totalNegativeAvoided > 0 ?
            (totalNegativeAvoided / data.filter(d => d.price < 0 && d.output > 0).reduce((s, d) => s + d.output, 0)) * 100 : 0;

        return {
            totalUplift: Math.round(totalUplift),
            totalShiftedMWh: Math.round(totalShiftedMWh),
            effectiveCapturePrice: Math.round(effectiveCapturePrice * 100) / 100,
            negativeReduction: Math.round(negativeReduction * 10) / 10,
            upliftPercentage: originalRevenue > 0 ? Math.round((totalUplift / originalRevenue) * 1000) / 10 : 0,
            dailyResults,
            config: batteryConfig
        };
    },

    /**
     * Group data by day
     */
    groupByDay(data) {
        const dayMap = new Map();

        data.forEach(d => {
            const dayKey = d.date.toISOString().split('T')[0];
            if (!dayMap.has(dayKey)) {
                dayMap.set(dayKey, []);
            }
            dayMap.get(dayKey).push(d);
        });

        return Array.from(dayMap.values());
    },

    /**
     * Find representative weeks
     */
    findRepresentativeWeeks(data) {
        const weeks = this.groupByWeek(data);

        // Calculate metrics for each week
        const weekMetrics = weeks.map(week => {
            const prices = week.map(d => d.price);
            const negativeHours = week.filter(d => d.price < 0 && d.output > 0).length;
            const volatility = this.calculateStdDev(prices);
            const avgCapture = this.calculateWeekCaptureRate(week);

            return {
                data: week,
                startDate: week[0].date,
                volatility,
                negativeHours,
                avgCapture
            };
        });

        // Find most typical (closest to median volatility)
        const sortedByVolatility = [...weekMetrics].sort((a, b) => a.volatility - b.volatility);
        const medianIdx = Math.floor(sortedByVolatility.length / 2);
        const typical = sortedByVolatility[medianIdx];

        // Find most volatile
        const volatile = sortedByVolatility[sortedByVolatility.length - 1];

        // Find most negative hours
        const sortedByNegative = [...weekMetrics].sort((a, b) => b.negativeHours - a.negativeHours);
        const negative = sortedByNegative[0];

        return { typical, volatile, negative };
    },

    /**
     * Group data by week
     */
    groupByWeek(data) {
        const weeks = [];
        let currentWeek = [];

        for (const d of data) {
            if (currentWeek.length === 0) {
                currentWeek.push(d);
            } else if (currentWeek.length < 168) { // 7 days * 24 hours
                currentWeek.push(d);
            } else {
                weeks.push(currentWeek);
                currentWeek = [d];
            }
        }

        if (currentWeek.length >= 120) { // At least 5 days
            weeks.push(currentWeek);
        }

        return weeks;
    },

    /**
     * Calculate week capture rate
     */
    calculateWeekCaptureRate(weekData) {
        const totalOutput = weekData.reduce((s, d) => s + d.output, 0);
        if (totalOutput === 0) return 0;

        const weightedSum = weekData.reduce((s, d) => s + d.price * d.output, 0);
        const capturePrice = weightedSum / totalOutput;

        const avgPrice = this.calculateMean(weekData.map(d => d.price));
        return avgPrice > 0 ? capturePrice / avgPrice : 0;
    },

    /**
     * Utility: Calculate mean
     */
    calculateMean(values) {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    /**
     * Utility: Calculate standard deviation
     */
    calculateStdDev(values) {
        if (values.length === 0) return 0;
        const mean = this.calculateMean(values);
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(this.calculateMean(squaredDiffs));
    },

    /**
     * Utility: Calculate percentile
     */
    percentile(sortedArr, p) {
        if (sortedArr.length === 0) return 0;
        const idx = (p / 100) * (sortedArr.length - 1);
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        if (lower === upper) return sortedArr[lower];
        return sortedArr[lower] * (upper - idx) + sortedArr[upper] * (idx - lower);
    }
};
