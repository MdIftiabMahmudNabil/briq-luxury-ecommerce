# BRIQ Luxury E-commerce Website

BRIQ is a luxury e-commerce concept website for a fictional premium architectural brick brand. The site presents collectible brick products through a high-end editorial layout, interactive product catalogue, cart flow, customer checkout details, a playable stacking game, and a customizable 3D brick experience.

## Features

- Luxury responsive landing page
- Product catalogue with 9 brick products
- Add-to-cart and quantity controls
- Customer details form before order confirmation
- Order confirmation modal
- Interactive brick stacking game
- Leaderboard experience
- CSS 3D brick viewer
- Selectable 3D brick colors and finishes
- Lookbook/editorial image sections
- Footer Privacy, Terms, and Contact modals
- Responsive layout for desktop and mobile

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Motion
- Lucide React Icons

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the local site:

```text
http://127.0.0.1:5173/
```

Build for production:

```bash
npm run build
```

The production files are generated in:

```text
dist/
```

## Deployment

This project can be deployed on Vercel, Netlify, or Cloudflare Pages.

Use these settings:

```text
Build command: npm run build
Output directory: dist
```

## Production Note

The checkout flow is currently frontend-only. Customer details are collected in the UI for demo purposes and are not stored in a database. For a real store, connect a backend, database, and payment provider.

## License

This project is for portfolio and demonstration purposes.
