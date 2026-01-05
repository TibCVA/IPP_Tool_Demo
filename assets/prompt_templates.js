/**
 * CVA | IPP Revenue & Capture Lab - AI Prompt Templates
 * Structured prompts for OpenAI memo generation
 */

const PromptTemplates = {
    /**
     * Build the system prompt for the AI
     */
    getSystemPrompt() {
        return `You are an expert energy market analyst specializing in renewable energy assets and merchant risk.
Your role is to provide concise, COMEX-grade executive summaries for IPP decision makers.

Guidelines:
- Be concise and data-driven
- Use professional energy market terminology
- Highlight actionable insights
- Always state assumptions and limitations
- NEVER provide specific financial advice or recommendations
- Focus on risk factors and strategic considerations
- Use bullet points for clarity
- Keep the total response under 250 words`;
    },

    /**
     * Build the user prompt with KPI data
     * @param {Object} analysisData - All computed data
     * @returns {string} Formatted prompt
     */
    buildAnalysisPrompt(analysisData) {
        const {
            market,
            period,
            capacityMW,
            kpis,
            batteryResults,
            routeToMarket,
            hasBattery
        } = analysisData;

        // Build key findings from data
        const findings = this.extractKeyFindings(kpis, batteryResults, hasBattery);

        return `Analyze the following PV asset capture price data and generate an executive summary.

## Asset Configuration
- Market: ${market}
- Technology: Solar PV
- Capacity: ${capacityMW} MW
- Analysis Period: ${period}
- Route-to-Market: ${routeToMarket}

## Key Metrics
- Baseload Average Price: ${kpis.baseloadAvg} EUR/MWh
- PV Capture Price: ${kpis.capturePrice} EUR/MWh
- Capture Rate: ${kpis.captureRate}%
- Negative Price Hours (during production): ${kpis.negativeHoursCount} hours
- Production at Negative Prices: ${kpis.negativePercentage}%
- Total Production: ${kpis.totalProduction} MWh
- Merchant Revenue: ${(kpis.merchantRevenue / 1000).toFixed(0)} kEUR

## Risk Distribution (Monthly Revenue)
- P5 (Downside): ${(kpis.riskMetrics.p5 / 1000).toFixed(0)} kEUR
- P50 (Median): ${(kpis.riskMetrics.p50 / 1000).toFixed(0)} kEUR
- P95 (Upside): ${(kpis.riskMetrics.p95 / 1000).toFixed(0)} kEUR

${hasBattery ? this.buildBatterySection(batteryResults) : ''}

## Detected Patterns
${findings.map(f => `- ${f}`).join('\n')}

Generate an executive memo with:
1. **Key Findings** (3 bullet points)
2. **Risk Assessment** (2 bullet points)
3. **Actions to Validate** (3 bullet points)

End with a brief "Assumptions & Limitations" section.`;
    },

    /**
     * Build battery section for prompt
     */
    buildBatterySection(batteryResults) {
        if (!batteryResults) return '';

        return `## Battery Co-location Analysis
- Battery Configuration: ${batteryResults.config.powerMW} MW / ${batteryResults.config.energyMWh} MWh
- Round-Trip Efficiency: ${(batteryResults.config.efficiency * 100).toFixed(0)}%
- Revenue Uplift: ${(batteryResults.totalUplift / 1000).toFixed(0)} kEUR (+${batteryResults.upliftPercentage}%)
- Shifted Energy: ${batteryResults.totalShiftedMWh} MWh
- Negative Exposure Reduction: ${batteryResults.negativeReduction}%
- Effective Capture Price (with battery): ${batteryResults.effectiveCapturePrice} EUR/MWh`;
    },

    /**
     * Extract key findings from data
     */
    extractKeyFindings(kpis, batteryResults, hasBattery) {
        const findings = [];

        // Capture rate assessment
        if (kpis.captureRate < 75) {
            findings.push(`ALERT: Capture rate of ${kpis.captureRate}% indicates severe solar cannibalization effect`);
        } else if (kpis.captureRate < 85) {
            findings.push(`Capture rate of ${kpis.captureRate}% shows significant price depression during solar hours`);
        } else if (kpis.captureRate < 95) {
            findings.push(`Moderate capture rate of ${kpis.captureRate}% - typical for German solar`);
        } else {
            findings.push(`Strong capture rate of ${kpis.captureRate}% - above typical solar benchmarks`);
        }

        // Negative price exposure
        if (kpis.negativePercentage > 5) {
            findings.push(`High negative price exposure: ${kpis.negativePercentage}% of production at negative prices`);
        } else if (kpis.negativePercentage > 2) {
            findings.push(`Moderate negative price exposure at ${kpis.negativePercentage}% of production`);
        } else {
            findings.push(`Limited negative price exposure (${kpis.negativePercentage}%)`);
        }

        // Revenue volatility
        const revenueSpread = kpis.riskMetrics.p95 - kpis.riskMetrics.p5;
        const medianRevenue = kpis.riskMetrics.p50;
        if (medianRevenue > 0) {
            const volatilityPct = (revenueSpread / medianRevenue) * 100;
            if (volatilityPct > 100) {
                findings.push(`High monthly revenue volatility (P5-P95 spread: ${volatilityPct.toFixed(0)}% of median)`);
            }
        }

        // Battery value
        if (hasBattery && batteryResults) {
            if (batteryResults.upliftPercentage > 10) {
                findings.push(`Significant battery value: +${batteryResults.upliftPercentage}% revenue uplift potential`);
            } else if (batteryResults.upliftPercentage > 5) {
                findings.push(`Moderate battery value: +${batteryResults.upliftPercentage}% revenue uplift`);
            }

            if (batteryResults.negativeReduction > 50) {
                findings.push(`Battery significantly reduces negative price exposure by ${batteryResults.negativeReduction.toFixed(0)}%`);
            }
        }

        return findings;
    },

    /**
     * Generate fallback memo when API is unavailable
     */
    generateFallbackMemo(analysisData) {
        const { kpis, batteryResults, hasBattery, capacityMW, market } = analysisData;

        let memo = `### Key Findings

- **Capture Rate at ${kpis.captureRate}%**: `;

        if (kpis.captureRate < 80) {
            memo += `The asset experiences significant price cannibalization, with PV-weighted prices substantially below baseload average. This is consistent with high solar penetration in the ${market} market.`;
        } else if (kpis.captureRate < 95) {
            memo += `Moderate capture discount typical for German solar assets. The spread between baseload (${kpis.baseloadAvg} EUR/MWh) and capture price (${kpis.capturePrice} EUR/MWh) reflects solar-induced price depression.`;
        } else {
            memo += `Strong capture performance above typical benchmarks. Consider validating against longer historical periods.`;
        }

        memo += `

- **Negative Price Exposure**: ${kpis.negativeHoursCount} hours of negative prices during production (${kpis.negativePercentage}% of output). `;

        if (kpis.negativePercentage > 3) {
            memo += `This level warrants evaluation of curtailment strategies and PPA floor provisions.`;
        } else {
            memo += `Currently manageable but trending higher with increasing renewable penetration.`;
        }

        memo += `

- **Revenue Profile**: Total merchant revenue of ${(kpis.merchantRevenue / 1000).toFixed(0)} kEUR with monthly P5/P50/P95 of ${(kpis.riskMetrics.p5 / 1000).toFixed(0)}/${(kpis.riskMetrics.p50 / 1000).toFixed(0)}/${(kpis.riskMetrics.p95 / 1000).toFixed(0)} kEUR.`;

        memo += `

### Risk Assessment

- **Shape Risk**: Primary risk driver is continued compression of solar capture rates as renewable capacity grows. Historical data shows accelerating trend.
- **Merchant Exposure**: Full spot exposure creates significant downside during low-price periods, particularly spring/summer midday hours.`;

        if (hasBattery && batteryResults) {
            memo += `

### Battery Impact

Co-located battery (${batteryResults.config.powerMW} MW / ${batteryResults.config.energyMWh} MWh) analysis shows:
- Revenue uplift of **+${(batteryResults.totalUplift / 1000).toFixed(0)} kEUR** (+${batteryResults.upliftPercentage}%)
- Effective capture price improvement to **${batteryResults.effectiveCapturePrice} EUR/MWh**
- Negative exposure reduction of **${batteryResults.negativeReduction.toFixed(0)}%**`;
        }

        memo += `

### Actions to Validate

- Benchmark capture rate against peer assets and forward curves
- Evaluate PPA alternatives with floor provisions
- ${hasBattery ? 'Refine battery dispatch model with actual market data' : 'Assess battery co-location economics'}
- Review curtailment clause implications in existing contracts

---
**Assumptions & Limitations**

This analysis uses ${analysisData.dataSource === 'demo' ? 'sample data (demo mode)' : 'historical day-ahead prices from Energy-Charts/SMARD'} and a ${analysisData.pvSource === 'synthetic' ? 'synthetic' : 'PVGIS-based'} PV production profile. Actual asset performance may vary based on specific location, technology, and operational factors. Battery simulation uses a simplified daily dispatch model - detailed analysis should incorporate intraday trading opportunities. This is not financial advice.`;

        return memo;
    },

    /**
     * Format API response into markdown
     */
    formatMemoResponse(apiResponse) {
        // The API should return markdown, but clean it up if needed
        let memo = apiResponse;

        // Ensure proper markdown headers
        memo = memo.replace(/^#(?!#)/gm, '###');

        return memo;
    }
};
