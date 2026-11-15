# AGENTS.md

This is a [Flue](https://flueframework.com) project deployed as a Cloudflare Worker. Flue agents are TypeScript functions that use hooks (`useModel`, `useTool`, `usePersistentState`, ...) and return the system prompt.

It runs one agent, `WhereIsIt`, a Telegram bot that remembers where the user put their belongings.

## Layout

- `src/agents/` — agent modules. A module whose first line is the `'use agent'` directive exports agents: every exported capitalized function is one, and the function name is its durable identity.
- `src/channels/telegram.ts` — Telegram webhook handler and the `post_telegram_message` tool.
- `src/app.ts` — the route map; every route is mounted here explicitly.
- `src/cloudflare.ts` — Worker-level exports and non-HTTP handlers (cron, queues, email). Never a `fetch` handler; HTTP routing belongs in `src/app.ts`.
- `wrangler.jsonc` — Worker config; every agent needs a Durable Object migration entry.

## Commands

- `npm run dev` — start the dev server. Needs `npx wrangler login` because the keyless `cloudflare/...` Workers AI model runs against the real account even locally. That model only resolves inside the Worker, so `flue run` can't exercise the agent.
- `npm run check:types` — typecheck. There is no test suite or linter.
- `npm run deploy` — build and deploy the Worker.
- `npx flue docs search <query>` — search the Flue docs from the terminal (then `flue docs read <path>`). Check these before guessing at Flue APIs.
- `npx flue add` — list blueprints for adding channels, sandboxes, and databases.

## Architecture

Request flow: Telegram webhook → `src/app.ts` (Hono, mounts `/channels/telegram`) → `src/channels/telegram.ts` → `dispatch(WhereIsIt, ...)` → agent in `src/agents/where.ts`.

- **Telegram is the only public entrance.** The agent is deliberately not mounted over HTTP so conversations can't be read or written from the internet. Don't add an `/agents/...` route without that in mind.
- **One durable conversation per Telegram chat/topic.** The instance id comes from `channel.instanceId(conversation)`; each instance is a Durable Object with its own SQLite storage. `usePersistentState("items")` holds the item→location map per conversation.
- **Telegram context reaches the agent via `initialData`.** The channel builds a chat or business-chat ref, validated by the valibot schema on `WhereIsIt.initialData`. The agent only registers `post_telegram_message` when that data is present.
- **Replies only reach the user through `post_telegram_message`.** Plain model text is never sent. A `useAgentFinish` hook appends a `reply-reminder` signal if the turn ended without a successful call to it. Keep the tool name in sync between `telegram.ts` and that hook.
- **Incoming messages are `signal` messages** (`type: "telegram.message"`), not `user` messages.
- **The prompt was tuned through Telegram testing.** Rules like "always call find_location, never answer from history" and "normalize item names to short lowercase English" exist for a reason; change them deliberately.

## Cloudflare specifics

- **Every agent needs a Durable Object migration** in `wrangler.jsonc`. Flue names the class `Flue<Identity>Agent` (e.g. `WhereIsIt` → `FlueWhereIsItAgent`). Adding, renaming, or deleting an agent means appending a new migration tag; never edit existing tags. Renaming the exported function counts as a rename.
- Secrets: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET_TOKEN`, read via `process.env` (`nodejs_compat`). Local values live in `.dev.vars`; production uses `wrangler secret put`.
- Imports use explicit `.ts` extensions (`allowImportingTsExtensions`, `verbatimModuleSyntax`).
