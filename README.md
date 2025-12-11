# Site Generator - Creatine Funnel Builder

A Next.js-based tool for generating marketing funnel sites with AI-powered content generation.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

1. Copy the `env.template` file and rename it to `.env.local`:
   ```bash
   cp env.template .env.local
   ```

2. Get your Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. Open `.env.local` and replace `your-api-key-here` with your actual API key:
   ```
   GOOGLE_AI_API_KEY=your-actual-key-here
   ```

4. Save the file and restart your dev server

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build

Create a production build:

```bash
npm run build
```

### Production

Run the production server:

```bash
npm start
```

## Project Structure

```
.
├── docs/                   # Project documentation
│   └── concept.md         # Concept and overview
├── src/
│   ├── app/               # Next.js app router
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   └── globals.css    # Global styles
│   └── lib/               # Core libraries
│       ├── templates/     # Template parsing and management
│       └── generator/     # Content generation and export logic
├── templates/             # Funnel site templates (uploads go here)
├── exports/               # Generated export packages
└── package.json           # Dependencies and scripts
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: ESLint (Next.js config)

## Features (Planned)

- 📄 Template selection and upload
- 🎯 Configuration wizard for funnel parameters
- 🤖 AI-powered content generation
- 👁️ Live preview of generated funnels
- 📦 Export functionality for development handoff

## Development Roadmap

1. ✅ Project initialization
2. 🔄 Template management system
3. 🔄 Configuration wizard UI
4. 🔄 AI content generation integration
5. 🔄 Preview system
6. 🔄 Export builders

## License

Private project - not for distribution.
