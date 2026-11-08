"use agent";
import { useModel, usePersistentState, useTool } from "@flue/runtime";
import * as v from "valibot";

type Item = { location: string; previous?: string; updatedAt: string };

export function WhereIsIt() {
  useModel("cloudflare/@cf/google/gemma-4-26b-a4b-it");
  const [items, setItems] = usePersistentState<Record<string, Item>>(
    "items",
    {},
  );
  useTool({
    name: "record_location",
    description:
      "Call this whenever the user says they put, stored, or moved an item somewhere. Saves the item name and its location. If the item already exists, the old location is kept as 'previous'.",
    input: v.object({ item: v.string(), location: v.string() }),
    async run({ data }) {
      console.log("data", data);
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
      console.log("saved names:", Object.keys(items), "query:", data.query);

      const matches: (Item & { name: string })[] = [];
      for (const name of Object.keys(items)) {
        console.log("name.includes", name.includes(data.query));
        console.log("items[name].location", items[name].location);
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
      console.log("#####matches", matches);
      return { output: { found: true, matches: matches } };
    },
  });
  return `You are an assistant that remembers where the user keeps their belongings.
- When the user asks where something is, never answer from the conversation history. Always call find_location first.
- When saving, use only the short item name as "item" (e.g. "passport", not "my passport").
- If find_location returns nothing, say there is no record. Never guess a location.
- When found, tell the location and the last recorded date.
- If several items match, ask which one the user means.
- If the item or the location is missing, ask for it.`;
}
