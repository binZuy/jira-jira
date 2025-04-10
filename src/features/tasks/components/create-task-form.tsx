"use client";

import { createTaskSchema } from "../schemas";
import { useCreateTask } from "../api/use-create-task";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import Image from "next/image";

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
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { DatePicker } from "@/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/features/members/components/members-avatar";
import { TaskStatus } from "../types";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { FileIcon, XIcon } from "lucide-react";

interface CreateTaskFormProps {
  onCancel?: () => void;
  projectOptions: {
    id: string;
    name: string;
    imageUrl: string;
  }[];
  memberOptions: { id: string; name: string }[];
}

export const CreateTaskForm = ({
  onCancel,
  projectOptions,
  memberOptions,
}: CreateTaskFormProps) => {
  const workspaceId = useWorkspaceId();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useCreateTask();

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema.omit({ workspaceId: true })),
    defaultValues: {
      workspaceId,
      attachments: [],
    },
  });

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    const formData = {
      ...values, 
      workspaceId,
      attachments: values.attachments || [],
      dueDate: values.dueDate?.toISOString(),
    }

    mutate({ form: formData }, {
      onSuccess: () => {
        form.reset();
        onCancel?.();
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    form.setValue("attachments", files);
  };

  const removeAttachment = (index: number) => {
    const attachments: File[] = form.getValues("attachments") || [];
    const updatedAttachments = attachments.filter((_, i) => i !== index);
    form.setValue("attachments", updatedAttachments);
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-semibold">Create a new task</CardTitle>
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
                    <FormLabel className="text-sm font-medium">Task Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter task name" className="rounded-md" />
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
                    <FormLabel className="text-sm font-medium">Due Date</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Project</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
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
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Assignee</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormLabel className="text-sm font-medium">Status</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                        <SelectItem value={TaskStatus.TODO}>To do</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                        <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
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
                      <FormLabel className="text-sm font-medium">Attachments</FormLabel>
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
                        className="rounded-md"
                      >
                        Upload Files
                      </Button>
                    </div>
                    {field.value && field.value.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {field.value.map((file: File, index: number) => {
                          const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
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
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-md"
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
                className={cn("rounded-md", !onCancel && "invisible")}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={isPending} className="rounded-md">
                Create Task
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
