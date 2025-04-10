"use client";

import { createWorkspaceSchema } from "../schemas";
import { useCreateWorkspace } from "../api/use-create-workspace";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui-vercel/dialog";
import { Button } from "@/components/ui-vercel/button";
import { Input } from "@/components/ui-vercel/input";
import { Separator } from "@/components/ui-vercel/separator";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateWorkspaceFormProps {
  onCancel?: () => void;
}

export const CreateWorkspaceForm = ({ onCancel }: CreateWorkspaceFormProps) => {
  const { mutate, isPending } = useCreateWorkspace();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof createWorkspaceSchema>>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createWorkspaceSchema>) => {
    const finalValues = {
      ...values,
      image: values.image instanceof File ? values.image : "",
    };

    mutate(
      { form: finalValues },
      {
        onSuccess: ({ data }) => {
          form.reset();
          router.push(`/workspaces/${data.$id}`);
        },
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create a new workspace</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="text-base font-semibold">
              Workspace Name
            </label>
            <Input
              {...form.register("name")}
              id="name"
              placeholder="Enter workspace name"
              className="mt-1.5"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden border">
                {form.watch("image") ? (
                  <Image
                    src={
                      form.watch("image") instanceof File
                        ? URL.createObjectURL(form.watch("image") as File)
                        : form.watch("image") as string
                    }
                    alt="Workspace icon"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-500" />
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold">Workspace Icon</p>
                <p className="text-sm text-gray-500">JPG, PNG, SVG, JPEG, max 1mb</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 text-sm h-8"
                  onClick={() => inputRef.current?.click()}
                >
                  Upload Image
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".jpg, .png, .jpeg, .svg"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            disabled={isPending}
            className="text-gray-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            disabled={isPending || !form.watch("name").trim()}
            className="bg-gray-500 text-white hover:bg-gray-600"
          >
            Create Workspace
          </Button>
        </div>
      </form>
    </div>
  );
};
