"use client";

import { ResponsiveModal } from "@/components/responsive-modal";

import { CreateRoomForm } from "./create-room-form";
import { useCreateRoomModal } from "@/features/rooms/hooks/use-create-room-modal";

export const CreateRoomModal = () => {
  const { isOpen, setIsOpen, close } = useCreateRoomModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <CreateRoomForm onCancel={close} />
    </ResponsiveModal>
  );
};
