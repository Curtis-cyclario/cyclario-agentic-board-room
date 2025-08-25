# Agentic Boardroom

Local development and deployment preparation.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   cd ui && npm install
   ```
2. Start the API server:
   ```bash
   npm start
   ```
3. Start the dashboard development server:
   ```bash
   npm run dashboard
   ```
   The static dashboards are served on http://localhost:8080 while the API server runs on http://localhost:3000.

## Dashboards

- Overview: http://localhost:3000/
- Dashboard hub: http://localhost:3000/dashboards
- Executive: http://localhost:3000/dashboards/executive
- Operations: http://localhost:3000/dashboards/operations
- Technical: http://localhost:3000/dashboards/technical

## Building UI Assets

Generate production assets for deployment:
```bash
npm run build:ui
```
