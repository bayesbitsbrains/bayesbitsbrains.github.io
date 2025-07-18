# Bayes, Bits & Brains

An interactive educational website exploring probability, information theory, and their applications to machine learning. Built with Next.js and featuring custom interactive widgets to help understand concepts like KL divergence, entropy, cross-entropy, and Bayesian inference.

🌐 **Live Site**: [bayesbitsbrains.github.io](https://bayesbitsbrains.github.io)

## About

This mini-course covers fundamental concepts at the intersection of probability, statistics, and information theory, repackaged to provide intuitive understanding of modern machine learning. The content is designed to be accessible yet rigorous, with a light, friendly tone and interactive elements throughout.

### Topics Covered

- **Bayes' Rule & KL Divergence**: Evidence accumulation and probabilistic reasoning
- **Cross-Entropy & Entropy**: Information-theoretic measures and their properties  
- **Maximum Likelihood & Maximum Entropy**: Core principles behind ML optimization
- **Compression & Coding Theory**: Information theory foundations of neural networks
- **Interactive Widgets**: Hands-on exploration of concepts through custom React components

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom components
- **Content**: MDX with mathematical notation (KaTeX)
- **Package Manager**: pnpm
- **Interactive Components**: Custom React widgets with D3.js visualizations
- **Deployment**: GitHub Pages with GitHub Actions CI/CD
- **Testing**: Cypress for E2E testing

## Content Architecture

### MDX Content System
Content is written in MDX files in the `public/` directory, with dynamic routing via `app/[...path]/page.tsx`. The system supports:

- **Mathematical Notation**: KaTeX rendering for inline `$...$` and display `$$...$$` equations
- **Custom Components**: Specialized educational components like `<KeyTakeaway>`, `<Block>`, `<Expand>`
- **Interactive Widgets**: React components for hands-on learning
- **Citations & Footnotes**: BibTeX-based citation system with hover tooltips

### Key MDX Components

```mdx
<!-- Mathematical notation -->
Inline math: $P(A|B) = \frac{P(B|A)P(A)}{P(B)}$

Display math: $$D(p,q) = \sum_i p_i \log \frac{p_i}{q_i}$$

<!-- Complex math with curly braces -->
<Math math="H(X) = -\sum_{x} p(x) \log p(x)" />

<!-- Citations -->
<Cite>Shannon1948,Kullback1951</Cite>

<!-- Footnotes -->
<Footnote>This is automatically numbered</Footnote>

<!-- Interactive widgets -->
<BayesCalculatorWidget />
<EvidenceAccumulationSimulator />
```

### Interactive Widgets

The site features custom educational widgets including:

- **Bayes Calculator**: Interactive Bayesian inference with 2-3 hypotheses
- **Evidence Accumulation Simulator**: Visualizing how evidence builds over time
- **Cross-Entropy Simulator**: Real-time demonstration of entropy concepts
- **Shannon Code Widget**: Interactive coding theory examples
- **Distribution Comparison**: KL divergence exploration tools

All widgets are **mobile-responsive** with adaptive layouts for phone and desktop viewing.

## Development

### Prerequisites
- Node.js 18+
- pnpm package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/bayesbitsbrains/bayesbitsbrains.github.io.git
cd bayesbitsbrains.github.io

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The site will be available at `http://localhost:3000`.

### Available Commands

```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production (outputs to /out)
pnpm start        # Build and serve production version
pnpm check        # Run TypeScript and ESLint checks
pnpm e2e:dev      # Run Cypress E2E tests against dev server
pnpm e2e:build    # Run Cypress E2E tests against production build
```

## Configuration

### Site Structure
Edit `lib/config.ts` to modify:
- Chapter navigation (`CHAPTERS` array)
- Site metadata (title, description, author)
- Content paths and routing
- KaTeX macro definitions

### Adding New Content
1. Create `.mdx` file in `public/` directory
2. Add chapter entry to `CHAPTERS` array in `lib/config.ts`
3. Register any new MDX components in `lib/lib.ts`
4. Test locally and submit PR

### Widget Development
Interactive widgets are in `components/widgets/`. Follow existing patterns:
- Use TypeScript for type safety
- Implement responsive design with Tailwind breakpoints
- Include accessibility features
- Document props and usage

## Deployment

- **Production**: Automatically deployed to GitHub Pages via GitHub Actions on push to `main`
- **Preview**: Vercel provides preview deployments for pull requests
- **Static Generation**: Next.js exports static HTML to `/out` directory

### GitHub Actions Workflow
- Builds site with `pnpm build`
- Runs TypeScript and ESLint checks
- Deploys static files to `gh-pages` branch
- Monitors deployment status

## Contributing

This is an educational project aimed at making complex mathematical concepts accessible. Contributions are welcome, particularly:

- Content improvements (typos, clarity, examples)
- New interactive widgets or visualizations  
- Mobile responsiveness enhancements
- Accessibility improvements
- Performance optimizations

Please maintain the light, friendly tone and ensure all widgets work on mobile devices.

## License

Content and code are available under appropriate open source licenses. See individual files for specific license information.

---

*An open exposition project exploring how to teach probability and information theory in the age of large language models.*