# CVA | IPP Revenue & Capture Lab (Demo)

**Capture price intelligence + flexibility what-if, powered by market data.**

A professional-grade demo tool for Independent Power Producers (IPPs) to analyze PV asset capture price metrics, negative price exposure, and battery co-location value.

![Demo Screenshot](https://img.shields.io/badge/Status-Demo-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Real-time Market Data**: Fetches day-ahead prices from Energy-Charts (SMARD/BNetzA)
- **PV Capture Analysis**: Calculate capture price, capture rate, and identify cannibalization effects
- **Negative Price Exposure**: Heatmap visualization of negative price hours during production
- **Battery What-If**: Simulate co-located battery impact on revenue and capture price
- **AI Executive Memo**: Generate COMEX-grade summaries (with OpenAI integration)
- **Export Capabilities**: Download CSV metrics and print/PDF summaries
- **Premium UI**: Glassmorphism design with animated energy mesh background

## Live Demo

**GitHub Pages**: [https://tibcva.github.io/IPP_Tool_Demo/](https://tibcva.github.io/IPP_Tool_Demo/)

> Note: The demo works without the AI backend using intelligent fallback templates.

## Quick Start

### Frontend Only (No AI)

1. Clone or download this repository
2. Open `index.html` in a browser, or use a local server:
   ```bash
   # With Python
   python -m http.server 8080

   # With Node.js (npx)
   npx serve .
   ```
3. Navigate to `http://localhost:8080`

### Full Setup (With AI Memo)

1. Deploy the Cloudflare Worker (see [worker/README.md](worker/README.md))
2. Update `assets/constants.js` with your worker URL:
   ```javascript
   API: {
       INSIGHTS_ENDPOINT: 'https://your-worker.workers.dev/api/insights'
   }
   ```
3. Deploy frontend to GitHub Pages or any static host

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (Frontend)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ index.   │  │ styles.  │  │ app.js   │  │ charts.  │   │
│  │ html     │  │ css      │  │          │  │ js       │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────────┐             ┌───────────────────┐
│  Energy-Charts    │             │ Cloudflare Worker │
│  API (Prices)     │             │ (OpenAI Proxy)    │
│  - Day-ahead DE   │             │ - /api/insights   │
│  - CC BY 4.0      │             │ - CORS protected  │
└───────────────────┘             └─────────┬─────────┘
                                            │
                                            ▼
                                  ┌───────────────────┐
                                  │    OpenAI API     │
                                  │  (gpt-4o-mini)    │
                                  └───────────────────┘
```

## Project Structure

```
IPP_Tool_Demo/
├── index.html              # Main HTML structure
├── assets/
│   ├── styles.css          # Premium design system
│   ├── constants.js        # Configuration & sample data
│   ├── data_sources.js     # Price fetching & PV profiles
│   ├── compute.js          # KPI calculations & battery sim
│   ├── charts.js           # Chart.js visualizations
│   ├── prompt_templates.js # AI prompt engineering
│   ├── ui.js               # UI interactions & state
│   └── app.js              # Main application orchestration
├── worker/
│   ├── src/index.js        # Cloudflare Worker code
│   ├── wrangler.toml       # Worker configuration
│   └── README.md           # Worker deployment guide
└── README.md               # This file
```

## Data Sources

| Data | Source | License |
|------|--------|---------|
| Day-ahead prices | [Energy-Charts](https://energy-charts.info) / SMARD (BNetzA) | CC BY 4.0 |
| PV production | Synthetic model (default) or PVGIS (beta) | - |

## KPIs Calculated

- **Baseload Average Price**: Simple average of all hourly prices
- **Capture Price**: Production-weighted average price (PV hours)
- **Capture Rate**: Capture Price / Baseload Price (%)
- **Negative Hours**: Count of negative price hours during production
- **Revenue Distribution**: P5/P50/P95 of monthly revenues
- **Battery Uplift**: Revenue increase from arbitrage
- **Effective Capture Price**: With battery shape-shifting

## Configuration Options

### Analysis Parameters
- Market: DE-LU (Germany-Luxembourg)
- Technology: Solar PV
- Capacity: 1-500 MW
- Period: Last 12/24 months or custom range

### Battery Simulation
- Power: 1-500 MW
- Energy: 1-2000 MWh
- Efficiency: 70-98%
- Constraint: 1 cycle/day (optional)

## Security

- **No API keys in frontend**: OpenAI key stored in Cloudflare Worker secrets
- **CORS protection**: Worker only accepts requests from allowed origins
- **No user data storage**: Analysis runs client-side, nothing persisted
- **Demo mode**: Sample data available when API is unavailable

## Deployment Checklist

### Frontend (GitHub Pages)
- [ ] Push code to `main` branch
- [ ] Enable GitHub Pages in repository settings
- [ ] Verify site loads at `https://<user>.github.io/<repo>/`

### Backend (Cloudflare Worker)
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Login: `wrangler login`
- [ ] Set API key: `wrangler secret put OPENAI_API_KEY`
- [ ] Deploy: `wrangler deploy`
- [ ] Update `INSIGHTS_ENDPOINT` in `constants.js`
- [ ] Verify AI memo generation works

### End-to-End Verification
- [ ] Load site in browser
- [ ] Run analysis with "Demo Mode" enabled
- [ ] Verify charts render correctly
- [ ] Verify AI memo generates (or fallback appears)
- [ ] Test export (CSV, Print)
- [ ] Check mobile responsiveness

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive design)

## Limitations & Disclaimers

- **Illustrative purposes only**: Not financial advice
- **Synthetic PV profile**: Not location-specific (PVGIS beta available)
- **Simplified battery model**: Daily dispatch, no intraday trading
- **Historical data**: Forward curves not included
- **Single market**: DE-LU only in MVP (extensible)

## Contributing

This is a demo project. For questions or feedback, please open an issue.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Credits

- **Price Data**: [Energy-Charts](https://energy-charts.info) by Fraunhofer ISE
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **Fonts**: [DM Sans](https://fonts.google.com/specimen/DM+Sans), [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4)

---

**CVA Energy Analytics** | Demo Version | For illustrative purposes only
