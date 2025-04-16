"use client";

import { createTaskSchema } from "../schemas";

import { z } from "zod";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { DatePicker } from "@/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/features/members/components/members-avatar";
import { Task, TaskStatus } from "@/lib/types/enums";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useUpdateTask } from "../api/use-update-task";
import { useRef } from "react";
import { FileIcon, XIcon } from "lucide-react";

interface EditTaskFormProps {
  onCancel?: () => void;
  projectOptions: {
    id: string;
    name: string;
    imageUrl: string;
  }[];
  memberOptions: { id: string; name: string }[];
  initialValues: Task;
}

export const EditTaskForm = ({
  onCancel,
  projectOptions,
  memberOptions,
  initialValues,
}: EditTaskFormProps) => {
  const { mutate, isPending } = useUpdateTask();
  const inputRef = useRef<HTMLInputElement | null>(null);
  console.log(initialValues);
  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(
      createTaskSchema.omit({ workspaceId: true, description: true })
    ),
    defaultValues: {
      ...initialValues,
      dueDate: initialValues.dueDate
        ? new Date(initialValues.dueDate)
        : undefined,
      attachments: [],
    },
  });

  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = event.target.files;
  //   if (files) {
  //     const newAttachments = Array.from(files);
  //     form.setValue("attachments", [
  //       ...(form.getValues("attachments") || []),
  //       ...newAttachments,
  //     ]);
  //   }
  // };

  // const removeAttachment = (index: number) => {
  //   const attachments = (form.getValues("attachments") || []).filter(
  //     (attachment): attachment is File => attachment instanceof File
  //   );
  //   attachments.splice(index, 1);
  //   form.setValue("attachments", attachments);
  // };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    form.setValue("attachments", files);
  };

  const removeAttachment = (index: number) => {
    const attachments: File[] = form.getValues("attachments") || [];
    const updatedAttachments = attachments.filter((_, i) => i !== index);
    form.setValue("attachments", updatedAttachments);
  };

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    const formData = {
      ...values,
      attachments: values.attachments || [],
      dueDate: values.dueDate?.toISOString(),
    };

    mutate(
      { form: formData, param: { taskId: initialValues.id } },
      {
        onSuccess: () => {
          form.reset();
          onCancel?.();
        },
      }
    );
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Edit Task</CardTitle>
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
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter task name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>

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
                        {memberOptions.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-x-2">
                              <MemberAvatar
                                className="size-6"
                                name={member.name}
                              />
                              {member.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>

                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        <SelectItem value={TaskStatus.TODO}>To do</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>
                          In Progress
                        </SelectItem>
                        <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                        <SelectItem value={TaskStatus.OUT_OF_SERVICE}>
                          Out Of Service
                        </SelectItem>
                        <SelectItem value={TaskStatus.OUT_OF_ORDER}>
                          Out Of Order
                        </SelectItem>
                        <SelectItem value={TaskStatus.PICK_UP}>
                          Pick Up
                        </SelectItem>
                        <SelectItem value={TaskStatus.READY_FOR_INSPECTION}>
                          Inspection Ready
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>

                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        {projectOptions.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-x-2">
                              <ProjectAvatar
                                className="size-6"
                                name={project.name}
                                image={project.imageUrl}
                              />
                              {project.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <div className="flex flex-col gap-y-2">
                    <div className="flex flex-col gap-y-2">
                      <p className="text-sm font-medium">Attachments</p>
                      <p className="text-sm text-muted-foreground">
                        Upload files (Images, PDF, DOC, XLS) up to 1MB
                      </p>
                      <input
                        className="hidden"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.svg,.pdf,.doc,.docx,.xls,.xlsx"
                        ref={inputRef}
                        onChange={handleFileChange}
                        disabled={isPending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                        disabled={isPending}
                      >
                        Upload Files
                      </Button>
                    </div>
                    {(initialValues.attachments?.length || 0) > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        {(initialValues.attachments ?? []).map((attachment) => (
                          <div
                            key={attachment.fileId}
                            className="relative flex items-center gap-x-2 p-2 border rounded-md"
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
                              <a
                                href={attachment.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-500 hover:underline truncate"
                              >
                                {attachment.fileName}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {field.value && field.value.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {field.value.map((file: File, index: number) => {
                          // Compute the preview URL on the fly for images.
                          const preview = file.type.startsWith("image/")
                            ? URL.createObjectURL(file)
                            : undefined;
                          return (
                            <div
                              key={index}
                              className="relative flex items-center gap-x-2 p-2 border rounded-md"
                            >
                              {preview ? (
                                <div className="relative w-12 h-12 rounded-md overflow-hidden">
                                  <Image
                                    src={preview}
                                    alt={file.name}
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
                                <p className="text-sm font-medium truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8"
                                onClick={() => removeAttachment(index)}
                                disabled={isPending}
                              >
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </div>
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
                className={cn(!onCancel && "invisible")}
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
  );
};
