import { Hono } from "hono";
import { channel as telegram } from "./channels/telegram.ts";

const app = new Hono();

// Telegram is the only public entrance. The agent is not mounted over HTTP,
// so conversations cannot be read or written directly from the internet.
app.route("/channels/telegram", telegram.route());

export default app;
