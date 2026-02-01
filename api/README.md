# House Of Electronics PDF Generation API

This API generates PDFs using the **exact same template** as the desktop Electron app.

## Why This Exists

The mobile app (expo-print) has poor PDF rendering compared to desktop. This API uses Puppeteer (same as desktop) to generate pixel-perfect PDFs that match the desktop output exactly.

## Quick Start

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Run Locally

```bash
npm start
```

Server runs on `http://localhost:3001`

### 3. Test the API

```bash
curl http://localhost:3001/api/health
```

## API Endpoints

### POST /api/generate-pdf

Generate a PDF from invoice data.

**Request Body:**
```json
{
  "invoiceData": {
    "invoiceNumber": "INV-2026-01-001",
    "date": "2026-01-10",
    "dueDate": "2026-02-09",
    "invoiceType": "invoice",
    "company": {
      "name": "House Of Electronics Solar",
      "address": "44A Banga Farm Junction",
      "city": "Waterloo",
      "state": "",
      "zip": "",
      "phone": "077 588 528",
      "email": ""
    },
    "customer": {
      "name": "John Doe",
      "address": "",
      "city": "",
      "state": "",
      "zip": "",
      "phone": "",
      "email": ""
    },
    "items": [
      {
        "id": "1",
        "description": "SRNE Solar Panel 560W",
        "quantity": 8,
        "rate": 3100,
        "amount": 24800
      }
    ],
    "taxRate": 15,
    "discount": 0,
    "currency": "NLe"
  },
  "logoBase64": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "pdfBase64": "JVBERi0xLjQK..."
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "pdf-generator"
}
```

## Deployment Options

### Option 1: Vercel

```bash
npm i -g vercel
vercel
```

### Option 2: Railway

1. Connect your repo to Railway
2. Set the root directory to `/api`
3. Deploy

### Option 3: Render

1. Create a new Web Service
2. Set build command: `npm install`
3. Set start command: `npm start`

### Option 4: Docker

```dockerfile
FROM node:18-slim

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3001
CMD ["npm", "start"]
```

## Mobile App Configuration

Set the API URL in your mobile app:

```bash
# In mobile/.env or environment
EXPO_PUBLIC_PDF_API_URL=https://your-deployed-api.com
```

Or update `mobile/src/services/pdf-api.service.ts`:

```typescript
const PDF_API_URL = 'https://your-deployed-api.com';
```

## Same Template as Desktop

This API uses `ekhlas-invoice-renderer.js` which is a JavaScript port of the desktop's `hoe-classic-ekhlas-renderer.tsx`. Any changes to the desktop template should also be reflected here to maintain consistency.

