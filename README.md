# Icke-Scores

Next.js app for running the **Icke-Cup** tournament: live game schedule, group rankings, and an admin area to manage cups, teams, and results.

## Tournament model

- A **cup** has 16 teams in 4 groups (A-D). States: `Bevorstehend → Vorrunde → Finalrunde → Abgeschlossen`.
- **Vorrunde**: fixed 8-round schedule ([src/configs/schedules.ts](src/configs/schedules.ts)) on 6 courts — courts 1-3 sitting, 4-6 standing.
- Each game has **2 rounds**; the winner is decided by rounds won, tiebreak by total points.
- Group ranking awards placement points per discipline (sitting 11/9/7/5, standing 10/8/6/4); ties break by rounds won, point difference, then head-to-head ([src/services/ranking.ts](src/services/ranking.ts)).
- **Finalrunde**: groups E-H are seeded from the Vorrunde ranks (E = group winners, … H = fourths). Final places 1-16 come from the E-H group rankings.

## Structure

```
src/
├── app/          # Next.js app router pages (public: /, /scores, /games; admin: /admin/**)
├── components/   # ui/ = vendored shadcn components
├── configs/      # constants + tournament schedules
├── hooks/        # useAdminAuth (redirects to /admin/login without token)
├── lib/          # axios instance (auth via request interceptor), game helpers, cn
├── services/     # typed API access (PHP backend, ?path=<resource>) + ranking logic
└── types/        # shared tournament types
__tests__/        # jest unit tests
```

The backend is a small PHP API (`?path=cups|teams|games|groups|group_teams|rounds`), configured via `NEXT_PUBLIC_API_URL`. Admin requests carry a Bearer token from `localStorage` (set on `/admin/login`), attached by the axios request interceptor.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000

pnpm lint         # eslint --fix
pnpm lint:check
pnpm typecheck
pnpm test         # jest
pnpm build
```

Tooling (ESLint flat config, Prettier, jest) mirrors `adchain-frontend`. A husky **pre-commit** hook runs all three gates (`lint:check`, `typecheck`, `test`) and blocks the commit on any failure.
