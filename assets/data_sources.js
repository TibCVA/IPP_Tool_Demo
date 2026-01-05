/**
 * CVA | IPP Revenue & Capture Lab - Data Sources
 * Handles fetching and caching of price data and PV profiles
 */

const DataSources = {
    /**
     * Fetch day-ahead prices from Energy-Charts API
     * @param {string} bzn - Bidding zone (e.g., 'DE-LU')
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Array of {timestamp, price} objects
     */
    async fetchPrices(bzn, startDate, endDate) {
        const cacheKey = `${CONFIG.CACHE.PREFIX}prices_${bzn}_${startDate.toISOString()}_${endDate.toISOString()}`;

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('Using cached price data');
            return cached;
        }

        try {
            // Build API URL
            const startUnix = Math.floor(startDate.getTime() / 1000);
            const endUnix = Math.floor(endDate.getTime() / 1000);

            const url = `${CONFIG.API.ENERGY_CHARTS_BASE}/price?bzn=${bzn}&start=${startUnix}&end=${endUnix}`;
            console.log('Fetching prices from:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();

            // Parse the response - Energy-Charts returns unix_seconds and price arrays
            const prices = this.parseEnergyChartsResponse(data);

            // Cache the result
            this.saveToCache(cacheKey, prices);

            return prices;
        } catch (error) {
            console.error('Error fetching prices:', error);
            throw error;
        }
    },

    /**
     * Parse Energy-Charts API response
     * @param {Object} data - API response
     * @returns {Array} Normalized price array
     */
    parseEnergyChartsResponse(data) {
        const prices = [];

        if (data.unix_seconds && data.price) {
            for (let i = 0; i < data.unix_seconds.length; i++) {
                // Skip null prices
                if (data.price[i] !== null && data.price[i] !== undefined) {
                    prices.push({
                        timestamp: data.unix_seconds[i],
                        price: data.price[i]
                    });
                }
            }
        }

        return prices;
    },

    /**
     * Generate synthetic PV profile
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {number} capacityMW - Installed capacity in MW
     * @param {string} market - Market code for location-specific adjustments
     * @returns {Array} Array of {timestamp, output} objects (output in MW)
     */
    generateSyntheticPVProfile(startDate, endDate, capacityMW, market = 'DE-LU') {
        const profile = [];
        const config = CONFIG.PV;
        const marketConfig = CONFIG.MARKETS[market];

        // Generate hourly data
        let current = new Date(startDate);
        current.setMinutes(0, 0, 0);

        while (current <= endDate) {
            const month = current.getMonth();
            const hour = current.getHours();
            const dayOfYear = this.getDayOfYear(current);

            // Calculate solar output
            let output = 0;

            // Basic daylight check (simplified)
            const sunriseHour = this.getSunriseHour(month);
            const sunsetHour = this.getSunsetHour(month);

            if (hour >= sunriseHour && hour <= sunsetHour) {
                // Solar bell curve within daylight hours
                const midday = (sunriseHour + sunsetHour) / 2;
                const halfDay = (sunsetHour - sunriseHour) / 2;
                const hourFromMidDay = Math.abs(hour - midday);

                // Gaussian-like curve
                const dayFactor = Math.exp(-Math.pow(hourFromMidDay / (halfDay * 0.6), 2));

                // Seasonal factor (higher in summer)
                const seasonalFactor = this.getSeasonalFactor(dayOfYear);

                // Base capacity factor with some randomness (weather simulation)
                const weatherFactor = 0.7 + Math.random() * 0.3;

                // Calculate output
                output = capacityMW * dayFactor * seasonalFactor * weatherFactor;

                // Ensure non-negative
                output = Math.max(0, output);
            }

            profile.push({
                timestamp: Math.floor(current.getTime() / 1000),
                output: Math.round(output * 1000) / 1000 // 3 decimal places
            });

            // Next hour
            current = new Date(current.getTime() + 3600000);
        }

        return profile;
    },

    /**
     * Get sunrise hour based on month (simplified for Germany)
     */
    getSunriseHour(month) {
        const sunriseHours = [8, 7, 6, 6, 5, 5, 5, 6, 6, 7, 7, 8];
        return sunriseHours[month];
    },

    /**
     * Get sunset hour based on month (simplified for Germany)
     */
    getSunsetHour(month) {
        const sunsetHours = [17, 18, 19, 20, 21, 21, 21, 20, 19, 18, 17, 16];
        return sunsetHours[month];
    },

    /**
     * Get seasonal factor (0-1) based on day of year
     */
    getSeasonalFactor(dayOfYear) {
        // Peak around summer solstice (day ~172)
        const offset = Math.abs(dayOfYear - 172);
        const factor = Math.cos(offset * Math.PI / 182.5) * 0.35 + 0.65;
        return Math.max(0.3, Math.min(1, factor));
    },

    /**
     * Get day of year (1-365/366)
     */
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    },

    /**
     * Fetch PVGIS data (beta feature)
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} peakPower - Peak power in kWp
     * @param {number} startYear - Start year
     * @param {number} endYear - End year
     * @returns {Promise<Array>} Hourly profile data
     */
    async fetchPVGIS(lat, lon, peakPower, startYear, endYear) {
        try {
            const url = new URL(`${CONFIG.API.PVGIS_BASE}/seriescalc`);
            url.searchParams.set('lat', lat);
            url.searchParams.set('lon', lon);
            url.searchParams.set('peakpower', peakPower);
            url.searchParams.set('loss', 14); // 14% system losses
            url.searchParams.set('outputformat', 'json');
            url.searchParams.set('startyear', startYear);
            url.searchParams.set('endyear', endYear);

            console.log('Fetching PVGIS data from:', url.toString());

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`PVGIS API returned ${response.status}`);
            }

            const data = await response.json();

            // Parse PVGIS response
            return this.parsePVGISResponse(data, peakPower);
        } catch (error) {
            console.error('PVGIS fetch failed:', error);
            throw error;
        }
    },

    /**
     * Parse PVGIS API response
     */
    parsePVGISResponse(data, peakPowerKW) {
        const profile = [];

        if (data.outputs && data.outputs.hourly) {
            for (const item of data.outputs.hourly) {
                // PVGIS provides time as YYYYMMDDHHMM string
                const timeStr = item.time.toString();
                const year = parseInt(timeStr.substring(0, 4));
                const month = parseInt(timeStr.substring(4, 6)) - 1;
                const day = parseInt(timeStr.substring(6, 8));
                const hour = parseInt(timeStr.substring(8, 10));

                const date = new Date(year, month, day, hour);

                profile.push({
                    timestamp: Math.floor(date.getTime() / 1000),
                    output: (item.P || 0) / 1000 // Convert W to kW, then to ratio of peak
                });
            }
        }

        return profile;
    },

    /**
     * Get sample/fallback data
     * @param {number} capacityMW - Capacity in MW
     * @returns {Object} Sample data with prices and PV profile
     */
    getSampleData(capacityMW) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        return {
            prices: SAMPLE_DATA.prices,
            pvProfile: this.generateSyntheticPVProfile(startDate, endDate, capacityMW),
            meta: {
                ...SAMPLE_DATA.meta,
                dataSource: 'demo',
                warning: 'Using sample data - API unavailable'
            }
        };
    },

    /**
     * Cache utilities
     */
    getFromCache(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const { data, expiry } = JSON.parse(item);
            if (Date.now() > expiry) {
                localStorage.removeItem(key);
                return null;
            }

            return data;
        } catch (e) {
            return null;
        }
    },

    saveToCache(key, data) {
        try {
            const item = {
                data,
                expiry: Date.now() + CONFIG.CACHE.PRICE_TTL
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            console.warn('Cache save failed:', e);
        }
    },

    clearCache() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(CONFIG.CACHE.PREFIX));
            keys.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.warn('Cache clear failed:', e);
        }
    },

    /**
     * Align price and PV data by timestamp
     * @param {Array} prices - Price data array
     * @param {Array} pvProfile - PV profile array
     * @returns {Array} Aligned data with both price and output
     */
    alignData(prices, pvProfile) {
        // Create timestamp lookup for PV data
        const pvMap = new Map();
        pvProfile.forEach(p => pvMap.set(p.timestamp, p.output));

        // Create timestamp lookup for prices
        const priceMap = new Map();
        prices.forEach(p => priceMap.set(p.timestamp, p.price));

        // Get all unique timestamps
        const allTimestamps = new Set([
            ...prices.map(p => p.timestamp),
            ...pvProfile.map(p => p.timestamp)
        ]);

        // Build aligned dataset
        const aligned = [];
        for (const ts of allTimestamps) {
            const price = priceMap.get(ts);
            const output = pvMap.get(ts);

            // Only include if we have both values
            if (price !== undefined && output !== undefined) {
                aligned.push({
                    timestamp: ts,
                    price,
                    output,
                    date: new Date(ts * 1000)
                });
            }
        }

        // Sort by timestamp
        aligned.sort((a, b) => a.timestamp - b.timestamp);

        return aligned;
    }
};
