import { Task } from "../types";

import { useState } from "react";
import { PencilIcon, XIcon, FileIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DottedSeparator } from "@/components/dotted-separator";

import { useUpdateTask } from "../api/use-update-task";
import Image from "next/image";
import Link from "next/link";

interface TaskDescriptionProps {
  task: Task;
}

export const TaskDescription = ({ task }: TaskDescriptionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(task.description);

  const { mutate, isPending } = useUpdateTask();

  const handleSave = () => {
    mutate(
      {
        form: { description: value },
        param: { taskId: task.$id },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Overview</p>
        <Button
          onClick={() => setIsEditing((prev) => !prev)}
          size="sm"
          variant="secondary"
        >
          {isEditing ? (
            <XIcon className="size-4 mr-2" />
          ) : (
            <PencilIcon className="size-5 mr-2" />
          )}
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>
      <DottedSeparator className="my-4" />
      {isEditing ? (
        <div className="flex flex-col gap-y-4">
          <Textarea
            placeholder="Add a description..."
            value={value}
            rows={4}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
          />
          <Button
            size="sm"
            className="w-fit ml-auto"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            {task.description || (
              <span className="text-muted-foreground">No description set</span>
            )}
          </div>
          
          {task.attachments && task.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Attachments</h3>
              <div className="grid grid-cols-2 gap-4">
                {task.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-x-2 p-2 border rounded-md"
                  >
                    {attachment.fileType.startsWith("image/") ? (
                      <div className="relative w-12 h-12 rounded-md overflow-hidden">
                        <Image
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                        <FileIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={attachment.fileUrl}
                        target="_blank"
                        className="text-sm font-medium truncate hover:underline"
                      >
                        {attachment.fileName}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
