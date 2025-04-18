// import {
//   customProvider,
//   extractReasoningMiddleware,
//   wrapLanguageModel,
// } from "ai";
// import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
// import { anthropic } from "@ai-sdk/anthropic";
// // import { isTestEnvironment } from '../constants';
// import {
//   artifactModel,
//   chatModel,
//   reasoningModel,
//   titleModel,
// } from "./models.test";

// // export const myProvider = customProvider({
// //   languageModels: {
// //     "chat-model": anthropic("claude-3-5-sonnet"), // Replace xai with anthropic
// //     "chat-model-reasoning": wrapLanguageModel({
// //       model: groq("deepseek-r1-distill-llama-70b"),
// //       middleware: extractReasoningMiddleware({ tagName: "think" }),
// //     }),
// //     "title-model": anthropic("claude-3-5-haiku"),
// //     "artifact-model": anthropic("claude-3-5-haiku"),
// //   },
// // });

// export const myProvider = customProvider({
//   languageModels: {
//     "chat-model": openai("gpt-4o-mini"), // Replace xai with anthropic
//     "chat-model-reasoning": wrapLanguageModel({
//       model: groq("deepseek-r1-distill-llama-70b"),
//       middleware: extractReasoningMiddleware({ tagName: "think" }),
//     }),
//     "title-model": openai("gpt-4o-mini"),
//     "artifact-model": openai("gpt-4o-mini"),
//   },
// });

import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
// import { groq } from '@ai-sdk/groq';
// import { xai } from '@ai-sdk/xai';
// import { isTestEnvironment } from '../constants';
// import {
//   artifactModel,
//   chatModel,
//   reasoningModel,
//   titleModel,
// } from './models.test';

export const myProvider =
  // ? customProvider({
  //     languageModels: {
  //       'chat-model': chatModel,
  //       'chat-model-reasoning': reasoningModel,
  //       'title-model': titleModel,
  //       'artifact-model': artifactModel,
  //     },
  //   })
  // :
  //  customProvider({
  //     languageModels: {
  //       'chat-model': xai('grok-2-1212'),
  //       'chat-model-reasoning': wrapLanguageModel({
  //         model: groq('deepseek-r1-distill-llama-70b'),
  //         middleware: extractReasoningMiddleware({ tagName: 'think' }),
  //       }),
  //       'title-model': xai('grok-2-1212'),
  //       'artifact-model': xai('grok-2-1212'),
  //     },
  //     imageModels: {
  //       'small-model': xai.image('grok-2-image'),
  //     },
  //   });

  customProvider({
    languageModels: {
      'chat-model': openai('gpt-4o-mini'),
      'chat-model-reasoning': wrapLanguageModel({
        model: openai('gpt-4o-mini'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': openai('gpt-4o-mini'), 
      'artifact-model': openai('gpt-4o-mini'),
    },
  });
