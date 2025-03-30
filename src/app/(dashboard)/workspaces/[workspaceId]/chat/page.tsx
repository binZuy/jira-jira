import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";

import { ChatClient } from "./client";

const ChatPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <ChatClient />;
};
export default ChatPage;
