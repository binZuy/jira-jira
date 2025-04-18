import { useGetComments } from "../api/use-get-comments";
import { useCreateComment } from "../api/use-create-comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { MemberAvatar } from "@/features/members/components/members-avatar";
import { formatDistanceToNow } from "date-fns";

interface TaskCommentsProps {
  taskId: string;
}

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
  const [content, setContent] = useState("");
  const { data: comments, isLoading } = useGetComments({ taskId });
  const { mutate: createComment, isPending } = useCreateComment();

  const onSubmit = () => {
    if (!content.trim()) return;
    
    createComment(
      {
        param: { taskId },
        json: { content: content.trim() }
      },
      {
        onSuccess: () => {
          setContent("");
        }
      }
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {comments?.map((comment) => (
          <div key={comment.id} className="flex gap-x-2">
            <MemberAvatar 
              name={comment.user?.name}
              className="size-8"
            />
            <div className="flex-1">
              <div className="flex items-center gap-x-2">
                <p className="font-semibold">{comment.user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { 
                    addSuffix: true 
                  })}
                </p>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-x-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1"
        />
        <Button
          onClick={onSubmit}
          disabled={isPending || !content.trim()}
        >
          Post
        </Button>
      </div>
    </div>
  );
};