# CleanSky Monitor Frontend

This is the Next.js frontend application for the **CleanSky Monitor** project, built using the App Router.

## 🚀 Getting Started

First, install the dependencies (assuming you are using npm, yarn, or pnpm):

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the running dashboard.

## 🎨 Design System

The frontend is built with an extreme focus on aesthetics, utilizing a premium dark-mode glassmorphism design:
- **Animations**: Smooth transitions, loading bars, and variants are powered by `framer-motion`.
- **Icons**: Consistent UI iconography is provided by `lucide-react`.
- **Components**: Reusable UI elements like `GlassCard` are used throughout the application.
- **Styling**: We leverage vanilla CSS and `globals.css` to build an independent, tailored design system.

## 📂 Key Directories

- `src/app/` - Next.js App Router pages (Dashboard, Forecast, Pollutants, Health, Auth).
- `src/components/` - Reusable React components (e.g., GlassCard, LoadingBar).
- `src/app/globals.css` - Global design tokens and glassmorphism styling.
