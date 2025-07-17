# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev             # Run development server with Turbopack at http://localhost:3000
pnpm build           # Build production version (outputs to /out directory)
pnpm start           # Build and serve production version
```

### Testing & Validation
```bash
pnpm check           # Run TypeScript and ESLint checks
pnpm e2e:dev        # Run Cypress E2E tests against dev server
pnpm e2e:build      # Run Cypress E2E tests against production build
```

## Architecture

### Content System
- **MDX Content**: All content is in MDX files located in `public/` directory
- **Routing**: Next.js App Router with dynamic catch-all route `app/[...path]/page.tsx`
- **Chapter Configuration**: Defined in `lib/config.ts` - controls navigation and available pages
- **MDX Processing**: Content is compiled using `next-mdx-remote` with custom components and plugins

### Key Components
- **Page Layout**: `components/Page.tsx` wraps all content with Header, Sidebar, and Footer
- **MDX Compilation**: `lib/lib.ts` handles MDX compilation with syntax highlighting, math rendering (KaTeX), and custom component registration
- **Citations**: BibTeX-based citation system with hover tooltips (`components/content/Citations.tsx`)
- **Footnotes**: Custom footnote system (`components/content/Footnotes.tsx`)
- **Interactive Widgets**: Located in `components/widgets/` - various educational interactive components

### Styling
- **CSS Framework**: Tailwind CSS with typography plugin
- **Fonts**: Merriweather (serif) for content, JetBrains Mono for code
- **Math Rendering**: KaTeX for LaTeX equations with custom macros

### Build & Deployment
- **Static Site Generation**: Next.js exports static HTML to `/out` directory
- **CI/CD**: GitHub Actions workflow builds and deploys to GitHub Pages on push to main
- **Preview Deployments**: Vercel provides preview deployments for PRs

## Important Patterns

### Adding New Content
1. Create MDX file in `public/` directory
2. Add chapter entry to `CHAPTERS` array in `lib/config.ts`
3. Use custom components: `<Cite>`, `<Footnote>`, `<Math>`, `<EqRef>`

### MDX Gotchas
- Curly braces `{}` are JSX expressions in MDX - DO NOT escape them with backslashes
- When math equations contain curly braces that cause MDX parsing errors, convert them to `<Math>` tags instead of escaping
- Math equations: inline `$...$` or display `$$...$$` for simple cases, use `<Math>` tag for complex expressions with curly braces
- Custom KaTeX macros defined in `lib/lib.ts` (e.g., `\R` for `\mathbb{R}`)

### Component Registration
New MDX components must be registered in `lib/lib.ts` in the `compileMDX` components object.

## Workflow Instructions

### Push Monitoring
After pushing commits to GitHub:
1. Check periodically if the workflow succeeded using `gh run list --limit 1` when you have no other work
2. If the user reports "your push failed", immediately investigate using `gh run view --log` and fix the issues
3. Push the fixes and repeat until the workflow succeeds

This ensures the deployment pipeline remains healthy and the static site builds correctly without blocking conversation.

## Memories
- Remember how `<Math>` tag works: Used for complex math expressions with curly braces in MDX, helps avoid parsing errors by wrapping equations that would break standard MDX parsing
- Image paths in widgets: Must use `/problens-web/` prefix for static deployment (e.g., `src="/problens-web/image.png"`). Never use just `/image.png`. Check FinanceSlider widget for reference pattern when debugging image loading issues.
- Prefer relative positioning and relative lengths over absolute ones. I want the page to look reasonably well on mobile phones.
- Widgets should look good on and work on mobile phones
- I want you to run a server in the background so that I can check the updates once they happen.
- Always runs the server in the background using the following detailed steps:
  1. Navigate to the project root directory
  2. Run `pnpm dev` in the background using `pnpm dev &` or start the process with `nohup pnpm dev &`
  3. Verify the server is running by checking the process or visiting http://localhost:3000
  4. If you need to stop the server later, use `pkill -f "pnpm dev"` or find the specific process ID and kill it
- Use as much relative positioning and relative lengths as possible
- Always start by running the development server by pnpm in the background on localhost:3000
- Start the server at 3000. If a process is running at this port, it means that you already started the server
- If you save files that will later be used by widgets, save them to public directory
- Start the server if it is not running. You often try to start the server when it is already running. IT IS ANNOYING, DON'T DO THAT
- to memorize save all scripts in scripts folder
- to memorize if we use HF endpoint, we have to be careful about  fn_index and trigger_id
- related github repos (HF workspaces) are cloned in the home folder
- you can change files in related HF repos and push them
- when adding stuff to HF space, try to minimize the probability of disrupting fn_index values of other tabs
- everything should work both in deployment and on local server.
- some widgets are connected to HF space called probabilistic-lenses-widgets that is cloned in the home folder.
- when adding something to the github repo with HF code, add it there and push yourself, instead of asking me to copy the code there.
- the text should be written in an inviting, non-academic tone
- fn_indexes suck. They are kind of random. If you see that they are e.g. 0,4,7, please do not change it to 0,1,2 because the random numbers are there for a reason
- When generating static pages, ensure that links are configured to work both in production and locally by properly setting up the `generateStaticParams()` function and using the correct path configuration to resolve page routing errors related to missing parameters
- all code should be extensively commented. This should include a summary of what result I expected in my prompt