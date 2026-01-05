/**
 * CVA | IPP Revenue & Capture Lab - Constants
 * Configuration and static values
 */

const CONFIG = {
    // API Configuration
    API: {
        ENERGY_CHARTS_BASE: 'https://api.energy-charts.info',
        INSIGHTS_ENDPOINT: null, // Set to your serverless backend URL
        PVGIS_BASE: 'https://re.jrc.ec.europa.eu/api/v5_2'
    },

    // Market Configuration
    MARKETS: {
        'DE-LU': {
            name: 'Germany-Luxembourg',
            timezone: 'Europe/Berlin',
            currency: 'EUR',
            lat: 51.1657, // Central Germany
            lon: 10.4515
        }
    },

    // PV Profile Configuration
    PV: {
        // Typical capacity factor for German solar
        TYPICAL_CAPACITY_FACTOR: 0.11, // ~11% annual average
        // Peak sun hours distribution (simplified)
        PEAK_MONTHS: [4, 5, 6, 7, 8], // April to August
        SUNRISE_HOUR: 6,
        SUNSET_HOUR: 20,
        PEAK_HOUR: 12
    },

    // Battery Defaults
    BATTERY: {
        DEFAULT_POWER_MW: 25,
        DEFAULT_ENERGY_MWH: 50,
        DEFAULT_EFFICIENCY: 0.88,
        MIN_SOC: 0.05, // 5% minimum state of charge
        MAX_SOC: 0.95  // 95% maximum state of charge
    },

    // Chart Colors
    COLORS: {
        primary: '#14b8a6',     // Teal
        secondary: '#06b6d4',   // Cyan
        accent: '#22d3ee',      // Light cyan
        positive: '#22c55e',    // Green
        negative: '#ef4444',    // Red
        warning: '#f59e0b',     // Amber
        neutral: '#64748b',     // Gray
        background: 'rgba(255, 255, 255, 0.1)',
        grid: 'rgba(255, 255, 255, 0.05)'
    },

    // Analysis Periods
    PERIODS: {
        '12': { label: 'Last 12 months', months: 12 },
        '24': { label: 'Last 24 months', months: 24 }
    },

    // Cache Configuration
    CACHE: {
        PRICE_TTL: 60 * 60 * 1000, // 1 hour in milliseconds
        PREFIX: 'cva_ipp_'
    }
};

// Sample data for demo mode (when API fails)
const SAMPLE_DATA = {
    // 7 days of hourly prices (168 hours) - realistic German day-ahead prices
    prices: generateSamplePrices(),

    // Metadata
    meta: {
        market: 'DE-LU',
        source: 'Sample Data (Demo Mode)',
        period: 'Sample week'
    }
};

/**
 * Generate realistic sample price data
 */
function generateSamplePrices() {
    const prices = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() - 365); // Start from a year ago

    // Generate ~1 year of hourly data
    for (let day = 0; day < 365; day++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + day);

        const month = date.getMonth();
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Seasonal base price (higher in winter)
        let seasonalBase;
        if (month >= 11 || month <= 2) { // Winter
            seasonalBase = 85;
        } else if (month >= 5 && month <= 8) { // Summer
            seasonalBase = 55;
        } else { // Spring/Autumn
            seasonalBase = 70;
        }

        for (let hour = 0; hour < 24; hour++) {
            const timestamp = new Date(date);
            timestamp.setHours(hour);

            // Hour-of-day pattern
            let hourlyFactor = 1;
            if (hour >= 6 && hour <= 8) hourlyFactor = 1.3; // Morning peak
            else if (hour >= 11 && hour <= 14) hourlyFactor = 0.7; // Solar depression
            else if (hour >= 17 && hour <= 20) hourlyFactor = 1.4; // Evening peak
            else if (hour >= 0 && hour <= 5) hourlyFactor = 0.6; // Night

            // Weekend effect
            if (isWeekend) hourlyFactor *= 0.8;

            // Calculate price with noise
            let price = seasonalBase * hourlyFactor;

            // Add randomness
            price += (Math.random() - 0.5) * 40;

            // Occasional negative prices (more frequent during solar hours in summer)
            if (month >= 4 && month <= 8 && hour >= 10 && hour <= 15) {
                if (Math.random() < 0.08) { // 8% chance
                    price = -10 - Math.random() * 30;
                }
            }

            prices.push({
                timestamp: Math.floor(timestamp.getTime() / 1000),
                price: Math.round(price * 100) / 100
            });
        }
    }

    return prices;
}

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(SAMPLE_DATA);
