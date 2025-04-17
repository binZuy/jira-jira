"use client";

import { useGetRoom } from "@/features/rooms/api/use-get-room";
import { useRoomId } from "@/features/rooms/hooks/use-room-id";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";

import { PageLoader } from "@/components/page-loader";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageError } from "@/components/page-error";
import { useState } from "react";
// import { EditRoomModal } from "@/features/rooms/components/edit-room-modal";

export const RoomIdClient = () => {
  const roomId = useRoomId();
  const { data: room, isLoading: isLoadingRoom } = useGetRoom({
    roomId,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoadingRoom) {
    return <PageLoader />;
  }
  if (!room) {
    return <PageError message="Room not found" />;
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <p className="text-lg font-semibold">{room.name}</p>
          <p className="text-md font-muted-200">{room.roomType}</p>
        </div>

        <div>
          <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
            <PencilIcon className="size-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>
      <TaskViewSwitcher hideProjectFilter />
      
      {/* {isModalOpen && (
        <EditRoomModal room={room} onClose={() => setIsModalOpen(false)} />
      )} */}
    </div>
  );
};
