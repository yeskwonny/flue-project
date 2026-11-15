import { Hono } from "hono";
import { createAgentRouter } from "@flue/runtime/routing";
import { WhereIsIt } from "./agents/where.ts";
import { channel as telegram } from "./channels/telegram.ts";

const app = new Hono();

// Telegram is the only public entrance. The agent is not mounted over HTTP,
// so conversations cannot be read or written directly from the internet.
app.route("/channels/telegram", telegram.route());

// TEMPORARY debug route, guarded by the webhook secret. Remove after debugging.
app.use("/debug/*", async (c, next) => {
  if (c.req.header("x-debug-secret") !== process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN) {
    return c.json({ error: "Not Allowed" }, 401);
  }
  await next();
});
app.route("/debug/agent", createAgentRouter(WhereIsIt));

export default app;
