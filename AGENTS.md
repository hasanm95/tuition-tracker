<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Skills — always load before relevant work

### graphify
Invoke the `graphify` skill for **any** question about this codebase: architecture, file relationships, tracing a data flow, understanding what a module does, or any "where is X / how does Y work" query. If `graphify-out/` exists in the project root, treat every such question as a graphify query first before reading individual files.

### ponytail
Invoke the `ponytail` skill for **any** UI/styling work in this project — component design, Tailwind class choices, layout decisions, or any visual change to the app. Load it before writing or editing any component, page, or CSS.
