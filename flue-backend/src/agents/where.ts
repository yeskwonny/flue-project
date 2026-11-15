"use agent";
import {
  useInitialData,
  useModel,
  usePersistentState,
  useTool,
} from "@flue/runtime";
import { postMessage } from "../channels/telegram.ts";
import * as v from "valibot";

type Item = { location: string; previous?: string; updatedAt: string };

const chatData = v.object({
  type: v.literal("chat"),
  chatId: v.number(),
  messageThreadId: v.optional(v.number()),
  directMessagesTopicId: v.optional(v.number()),
  chatTitle: v.optional(v.string()),
});

const businessChatData = v.object({
  type: v.literal("business-chat"),
  businessConnectionId: v.string(),
  chatId: v.number(),
  messageThreadId: v.optional(v.number()),
  directMessagesTopicId: v.optional(v.number()),
  chatTitle: v.optional(v.string()),
});

const initialDataSchema = v.optional(
  v.variant("type", [chatData, businessChatData]),
);

export function WhereIsIt() {
  useModel("cloudflare/@cf/google/gemma-4-26b-a4b-it", {
    thinkingLevel: "off",
  });
  const [items, setItems] = usePersistentState<Record<string, Item>>(
    "items",
    {},
  );
  // get message data from telegram and using this tool from telegram
  const telegram = useInitialData<v.InferOutput<typeof initialDataSchema>>();

  if (telegram) {
    useTool(postMessage(telegram));
  }
  useTool({
    name: "record_location",
    description:
      "Call this whenever the user says they put, stored, or moved an item somewhere. Saves the item name and its location. If the item already exists, the old location is kept as 'previous'.",
    input: v.object({ item: v.string(), location: v.string() }),
    async run({ data }) {
      const previous = items[data.item]?.location;
      const updatedAt = new Date().toISOString().slice(0, 10);
      setItems((prev) => ({
        ...prev,
        [data.item]: {
          location: data.location,
          previous: prev[data.item]?.location,
          updatedAt,
        },
      }));
      return {
        output: {
          item: data.item,
          location: data.location,
          previous,
          updatedAt,
        },
      };
    },
  });
  useTool({
    name: "find_location",
    description:
      "Call this whenever the user asks where an item is. Put only the item name in query. Returns matching saved items with their location and last recorded date.",
    input: v.object({ query: v.string() }),
    async run({ data }) {
      const matches: (Item & { name: string })[] = [];
      for (const name of Object.keys(items)) {
        if (name.includes(data.query)) {
          matches.push({
            name,
            location: items[name].location,
            updatedAt: items[name].updatedAt,
          });
        }
      }
      if (matches.length === 0) {
        return { output: { found: false } };
      }

      return { output: { found: true, matches: matches } };
    },
  });

  return `You are an assistant that remembers where the user keeps their belongings.

Saving
- Always save and search item names in short lowercase English (e.g. "passport", not "my passport" or "여권"). Translate if the user writes in another language.
- Keep details that tell similar items apart in the name (e.g. "usb-c charger", "laptop charger"), so different items do not overwrite each other.
- If the user mentions a generic item (e.g. "charger") and a similar item is already saved, ask whether it is the same one or a different one before saving.
- If the item or the location is missing, ask for it.
- After moving an item, mention both the previous and the new location.
- You can only save an item name and its location. If the user gives other details (color, type, owner), do not claim you will remember them. Say you can only save the name and location, and offer to save it under a more specific name instead.

Finding
- When the user asks where something is, never answer from the conversation history. Always call find_location first.
- If a specific search finds nothing, try one broader search (e.g. "laptop charger" -> "charger"). If that finds something, say it is saved under the broader name and ask if that is the one.
- If nothing is found, say there is no record. Never guess a location.
- When found, tell the location and the last recorded date.
- If several items match, ask which one the user means.

Replying
- Reply in the same language the user writes in. Keep replies short.
- Only say something was saved or updated after the tool call succeeded. If a tool fails, say it failed.
- When post_telegram_message is available, send exactly one reply per user message with it, and do not write anything else.
- If the user sends /start or a greeting, briefly explain what you do with one example (e.g. "여권을 침실 서랍에 넣었어").`;
}
WhereIsIt.initialData = initialDataSchema;
