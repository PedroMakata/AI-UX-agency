# UX AI Agency

AI-powered UX design agency platform built with Next.js 14.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **Database:** Supabase
- **AI:** Anthropic Claude

## Project Structure

```
app/
  dashboard/          # Main dashboard
  agents/[agentId]/   # Individual AI agents
  upload/             # File upload
  settings/           # User settings
  api/
    chat/[agentId]/   # Chat API routes
    files/            # File handling API
    notion/           # Notion integration API
    uxpilot/          # UXPilot integration API
    vibe/             # Vibe/mood board API
    deliverables/     # Deliverables API

components/
  ui/                 # shadcn/ui components
  agents/             # Agent-related components
  files/              # File management components
  wireframes/         # Wireframe components
  vibe/               # Vibe/mood board components
  notion/             # Notion integration components

lib/
  supabase/           # Supabase client & utilities
  ai/                 # AI/Anthropic utilities
  notion/             # Notion API utilities
  uxpilot/            # UXPilot utilities
  vibe/               # Vibe generation utilities

types/                # TypeScript type definitions
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.local.example` to `.env.local` and fill in your API keys:
   ```bash
   cp .env.local.example .env.local
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `NOTION_API_KEY` | Notion integration API key |
| `NOTION_DATABASE_ID` | Notion database ID |
| `UXPILOT_API_KEY` | UXPilot API key |
| `NEXT_PUBLIC_APP_URL` | Application URL |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
