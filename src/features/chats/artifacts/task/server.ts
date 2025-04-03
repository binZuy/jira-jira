// import { smoothStream, streamText } from "ai";
// import { myProvider } from "@/lib/ai/providers";
// import { createDocumentHandler } from "@/lib/artifacts/server";
// import { updateDocumentPrompt } from "@/lib/ai/prompts";

// export const taskDocumentHandler = createDocumentHandler<"task">({
//   kind: "task",
  
//   onCreateDocument: async ({ title, dataStream }) => {
//     // Initialize the task artifact with default view
//     dataStream.writeData({
//       type: "view-update",
//       content: "table",
//     });

//     return "Task management interface initialized";
//   },

//   onUpdateDocument: async ({ document, description, dataStream }) => {
//     // Handle different task operations based on the description
//     const { fullStream } = streamText({
//       model: myProvider.languageModel("artifact-model"),
//       system: updateDocumentPrompt(document.content, "task"),
//       experimental_transform: smoothStream({ chunking: "word" }),
//       prompt: description,
//       experimental_providerMetadata: {
//         openai: {
//           prediction: {
//             type: "content",
//             content: document.content,
//           },
//         },
//       },
//     });

//     let response = "";
//     for await (const delta of fullStream) {
//       if (delta.type === "text-delta") {
//         response += delta.textDelta;
//         dataStream.writeData({
//           type: "content-update",
//           content: delta.textDelta,
//         });
//       }
//     }

//     return response;
//   },
// });
