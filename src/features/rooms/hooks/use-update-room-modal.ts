import { useQueryState, parseAsString } from "nuqs";

export const useEditRoomModal = () => {
  const [roomId, setRoomId] = useQueryState(
    "edit-room",
    parseAsString,
  );

  const open = (id: string) => {
    setRoomId(id);
  };

  const close = () => {
    setRoomId(null);
  };
  return {
    roomId,
    open,
    close,
    setRoomId,
  };
};
