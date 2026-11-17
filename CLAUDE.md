# Project Rules for Claude

## Skills — always load before relevant work

### graphify
Invoke the `graphify` skill for **any** question about this codebase: architecture, file relationships, tracing a data flow, understanding what a module does, or any "where is X / how does Y work" query. If `graphify-out/` exists in the project root, treat every such question as a graphify query first before reading individual files.

### ponytail
Invoke the `ponytail` skill for **any** UI/styling work in this project — component design, Tailwind class choices, layout decisions, or any visual change to the app. Load it before writing or editing any component, page, or CSS.
