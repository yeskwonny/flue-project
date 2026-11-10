import { createAgentRouter } from "@flue/runtime/routing";
import { Hono } from "hono";
import { WhereIsIt } from "./agents/where";
import { channel as telegram } from "./channels/telegram.ts";

const app = new Hono();
// project the agent
app.use("/agents/*", async (context, next) => {
  const auth = context.req.header("Authorization");

  if (!auth?.includes("TRUSTME")) {
    return context.json({ error: "Not Allowed" }, 401);
  }

  await next();
});

app.route("/agents/where-is-it", createAgentRouter(WhereIsIt));
app.route("/channels/telegram", telegram.route());
export default app;
