import { useParams } from "next/navigation";

export const useChatId = () => {
  const params = useParams();
  return params.chatId as string;
};
