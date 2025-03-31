export type Document = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Suggestion = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Chat = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
};


export type Message = {
    id: string;
    chatId: string;
    role: "user" | "assistant";
    parts: Array<{ type: "text"; text: string }>;
    createdAt: Date;
    updatedAt: Date;
}