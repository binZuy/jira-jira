"use client";

import { Room, RoomType } from "@/lib/types/enums";
import { updateRoomSchema } from "../schemas";
import { useUpdateRoom } from "@/features/rooms/api/use-update-room";
import { useDeleteRoom } from "@/features/rooms/api/use-delete-room";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ImageIcon } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

interface EditRoomFormProps {
  onCancel?: () => void;
  initialValues: Room;
}

export const EditRoomForm = ({
  onCancel,
  initialValues,
}: EditRoomFormProps) => {
  const { mutate, isPending } = useUpdateRoom();

  const { mutate: deleteRoom, isPending: isDeletingRoom } = useDeleteRoom();

  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Room",
    "This action cannot be undone",
    "destructive"
  );

  const form = useForm<z.infer<typeof updateRoomSchema>>({
    resolver: zodResolver(updateRoomSchema),
    defaultValues: {
      ...initialValues,
    },
  });

  const onSubmit = (values: z.infer<typeof updateRoomSchema>) => {
    const finalValues = {
      ...values,
    };

    mutate({
      json: finalValues,
      param: {
        roomId: String(initialValues.id),
      },
    });
  };

  const handleDelete = async () => {
    const ok = await confirmDelete();

    if (!ok) return;
    deleteRoom(
      {
        param: { roomId: String(initialValues.id) },
      },
      {
        onSuccess: () => {
          toast.success("Delete successfully");
          window.location.href = `/workspaces/${workspaceId}`;
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-y-4">
      <DeleteDialog />
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center gap-x-4 space-y-0 p-7">
          <Button
            size="sm"
            variant="secondary"
            onClick={
              onCancel
                ? onCancel
                : () => router.push(`/workspaces/${workspaceId}`)
            }
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <CardTitle className="text-xl font-bold">
            {initialValues.name}
          </CardTitle>
        </CardHeader>
        <div className="px-7">
          <DottedSeparator />
        </div>
        <CardContent className="p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter room name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <Select
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <FormMessage />
                        <SelectContent>
                          <SelectItem value={RoomType.STANDARD}>
                            Standard
                          </SelectItem>
                          <SelectItem value={RoomType.DELUXE}>
                            Deluxe
                          </SelectItem>
                          <SelectItem value={RoomType.SUITE}>Suite</SelectItem>
                          <SelectItem value={RoomType.PRESIDENT}>
                            President
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DottedSeparator className="py-7" />
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg" disabled={isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="w-full h-full border-none shadow-none">
        <CardContent className="p-7">
          <div className="flex flex-col">
            <h3 className="font-bold">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">
              Deleting a room is irreversible and will remove all associated
              data
            </p>
            <DottedSeparator className="py-7" />
            <Button
              className="mt-6 w-fit ml-auto"
              size="sm"
              variant="destructive"
              type="button"
              disabled={isPending || isDeletingRoom}
              onClick={handleDelete}
            >
              Delete Room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
