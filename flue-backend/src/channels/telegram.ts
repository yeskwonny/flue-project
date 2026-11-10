import type { Message } from "grammy/types";
import * as v from "valibot";
import { WhereIsIt } from "../agents/where.ts";
import { Api } from "grammy";
import { createTelegramChannel, type TelegramConversationRef } from "@flue/telegram";
import { defineTool, dispatch } from "@flue/runtime";

export const client = new Api(process.env.TELEGRAM_BOT_TOKEN!);

export const channel = createTelegramChannel({
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN!,

  // Path: /channels/telegram/webhook
  async webhook({ update }) {
    const incoming = update.message ?? update.channel_post ?? update.business_message;
    if (!incoming) return;
    console.log("[telegram] chat id:", incoming.chat.id);
    const conversation = conversationFromMessage(incoming);
    await dispatch(WhereIsIt, {
      id: channel.instanceId(conversation),
      initialData: conversationData(conversation, incoming),
      message: {
        kind: "signal",
        type: "telegram.message",
        body: messageBody(incoming),
        attributes: { updateId: String(update.update_id) },
      },
    });
  },
});

function messageBody(message: Message): string {
  if (message.text !== undefined) return message.text;
  if (message.caption !== undefined) return message.caption;
  return "[non-text message]";
}

function conversationFromMessage(message: Message): TelegramConversationRef {
  const topic = {
    ...(message.message_thread_id === undefined ? {} : { messageThreadId: message.message_thread_id }),
    ...(message.direct_messages_topic?.topic_id === undefined
      ? {}
      : { directMessagesTopicId: message.direct_messages_topic.topic_id }),
  };
  return message.business_connection_id
    ? { type: "business-chat", businessConnectionId: message.business_connection_id, chatId: message.chat.id, ...topic }
    : { type: "chat", chatId: message.chat.id, ...topic };
}

function conversationData(conversation: TelegramConversationRef, message: Message) {
  return {
    type: conversation.type,
    chatId: conversation.chatId,
    ...(conversation.type === "business-chat" ? { businessConnectionId: conversation.businessConnectionId } : {}),
    ...(conversation.messageThreadId === undefined ? {} : { messageThreadId: conversation.messageThreadId }),
    ...(conversation.directMessagesTopicId === undefined ? {} : { directMessagesTopicId: conversation.directMessagesTopicId }),
    ...(message.chat.title === undefined ? {} : { chatTitle: message.chat.title }),
  };
}

export function postMessage(ref: TelegramConversationRef) {
  return defineTool({
    name: "post_telegram_message",
    description: "Send your reply to the user in Telegram. Every answer to the user must go through this tool.",
    input: v.object({ text: v.pipe(v.string(), v.minLength(1)) }),
    async run({ data }) {
      const message = await client.sendMessage(ref.chatId, data.text, {
        ...(ref.type === "business-chat" ? { business_connection_id: ref.businessConnectionId } : {}),
        ...(ref.messageThreadId ? { message_thread_id: ref.messageThreadId } : {}),
        ...(ref.directMessagesTopicId ? { direct_messages_topic_id: ref.directMessagesTopicId } : {}),
      });
      return { output: { messageId: message.message_id } };
    },
  });
}
