import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
// import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from "./models.test";

// export const myProvider = customProvider({
//   languageModels: {
//     "chat-model": anthropic("claude-3-5-sonnet"), // Replace xai with anthropic
//     "chat-model-reasoning": wrapLanguageModel({
//       model: groq("deepseek-r1-distill-llama-70b"),
//       middleware: extractReasoningMiddleware({ tagName: "think" }),
//     }),
//     "title-model": anthropic("claude-3-5-haiku"),
//     "artifact-model": anthropic("claude-3-5-haiku"),
//   },
// });

export const myProvider = customProvider({
  languageModels: {
    "chat-model": openai("gpt-4o-mini"), // Replace xai with anthropic
    "chat-model-reasoning": wrapLanguageModel({
      model: groq("deepseek-r1-distill-llama-70b"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4o-mini"),
    "artifact-model": openai("gpt-4o-mini"),
  },
});