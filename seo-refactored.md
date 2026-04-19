# SEO Integration Plan (Refactored)

## Predictive Air Quality Intelligence Web Platform

**Stack:** Next.js (Frontend) + Flask (Backend)  
**Team:** Muhammed Shawkath V I · Gautham V · Akshai T Thankachan · Sherin Rajeev  
**College of Engineering Kidangoor | April 2026**

---

## Overview

This document outlines the complete SEO integration strategy, refactored to align with the existing React Context and App Router architecture. The primary goal is to ensure search engines can index specific city pages (which requires URL-based routing rather than just client-side context) and to leverage Next.js native features for OG images and metadata.

---

## Phase 1 — Route Restructuring (CRITICAL)

### 1.1 Dynamic City Routing (`/[city]/...`)

Currently, switching cities updates a client-side state (`CityContext`). Search engines cannot index state changes. We must move the application to dynamic routes so each city has a unique URL (e.g., `/delhi`, `/delhi/forecast`).

**Action Items:**

- Restructure `src/app/` to use a dynamic `[city]` segment.
- Update `CityContext` to read from the URL parameter instead of local state.
- Update `Navbar` search to push to the new URL (`router.push('/' + citySlug)`).

**New Structure Strategy:**

```
src/app/
├── [city]/
│   ├── page.tsx               ← Dashboard for specific city
│   ├── forecast/page.tsx      ← Forecast for specific city
│   ├── health/page.tsx        ← Health for specific city
│   ├── pollutants/page.tsx    ← Pollutants for specific city
│   └── map/page.tsx           ← Map for specific city
├── layout.tsx
└── page.tsx                   ← Default redirect to /delhi or homepage
```

---

## Phase 2 — Foundation SEO (Next.js)

### 2.1 Global Metadata — `src/app/layout.tsx`

- Set default `<title>` with template: `%s | CleanSky`
- Add `description`, `keywords`, `author`
- Add Open Graph tags and Twitter card tags
- Place `JsonLd` structured data

### 2.2 Dynamic Page-Level Metadata

Add `generateMetadata({ params })` to each route inside `[city]` to fetch live AQI and inject the city name into `title` and `description`.

| Route                | Dynamic Title Format               |
| -------------------- | ---------------------------------- | -------- |
| `/[city]`            | [City] Air Quality & AQI           | CleanSky |
| `/[city]/forecast`   | [City] 48-Hour AQI Forecast        | CleanSky |
| `/[city]/health`     | [City] Air Quality Health Advisory | CleanSky |
| `/[city]/pollutants` | [City] Pollutant Analysis          | CleanSky |
| `/[city]/map`        | [City] Live AQI Map                | CleanSky |

---

## Phase 3 — Technical SEO & Indexing

### 3.1 Sitemap — `src/app/sitemap.ts`

- Auto-generate sitemap using Next.js Metadata API.
- Fetch default/popular cities from Flask `/api/cities` endpoint to populate the sitemap with URLs like `/delhi`, `/mumbai`, `/kochi`.

### 3.2 Robots.txt — `src/app/robots.ts`

- Allow all public routes, disallow `/api/`.

### 3.3 Enhanced Structured Data / JSON-LD

Include both `@type: "WebApplication"` and `@type: "Dataset"` (for environmental data), plus `@type: "BreadcrumbList"` to map the URL structure (Home > [City] > Forecast).

---

## Phase 4 — Edge SEO features (Next.js Native)

### 4.1 Native Dynamic Open Graph Images (`@vercel/og`)

Instead of using Flask/Pillow for image generation, use Next.js native `ImageResponse`.

- **Endpoint:** `src/app/api/og/route.tsx`
- **Output:** Dynamically generates a 1200x630 OG image using Tailwind CSS, displaying the City Name, current AQI, and color coding. Fast and serverless.

### 4.2 Caching & Performance

- Flask: Add `Cache-Control` headers.
- Next.js: Utilize caching for the fetch calls in `generateMetadata` to avoid hitting the backend twice for the same data.

---

## Implementation Priority Order

1. **Phase 1: Route Restructuring.** (Move pages to `src/app/[city]/...` and update Navbar/Context). This is the blocking step.
2. **Phase 2: Add `generateMetadata`** to all the new dynamic routes to inject city names.
3. **Phase 3: Sitemap & Robots.txt.** Ensure search engines can crawl the new city URLs.
4. **Phase 4: `@vercel/og` generation.** For rich social sharing cards.
