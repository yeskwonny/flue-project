# flue-backend

A [Flue](https://flueframework.com) agent project.

## Setup

```sh
npm install
```

The Hello agent uses `cloudflare/@cf/zai-org/glm-5.3-flash` on Workers AI through the `AI` binding, so it needs no API key. It does need a Cloudflare login, even in local dev:

```sh
npx wrangler login
```

## Talk to your agent

The `cloudflare/...` provider runs only inside the Worker, so use the dev server rather than `flue run`:

```sh
npm run dev
```

Then, in another terminal:

```sh
curl -X POST http://localhost:5173/agents/hello/my-first-chat \
  -H 'content-type: application/json' \
  -d '{"kind":"user","body":"Say hello!"}'
```

Conversations are durable. Reuse the same id (`my-first-chat`) to continue one.

## Deploy

```sh
npm run deploy
```

## Learn more

- [Flue docs](https://flueframework.com/docs/) — or `npx flue docs` from the terminal.
