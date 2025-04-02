import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";

import { ChatIdClient } from "./client";

const ChatIdPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <ChatIdClient />;
};
export default ChatIdPage;
