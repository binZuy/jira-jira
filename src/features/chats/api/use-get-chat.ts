import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface UseGetChatProps {
  chatId: string;
}
export const useGetChat = ({ chatId }: UseGetChatProps) => {
  const query = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await client.api.chats[":chatId"].$get({
        param: { chatId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat");
      }

      const { data } = await response.json();

      return data;
    },
  });
  return query;
};
