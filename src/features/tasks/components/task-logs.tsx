import { useGetLogs } from "../api/use-get-logs";
import { MemberAvatar } from "@/features/members/components/members-avatar";
import { formatDistanceToNow } from "date-fns";

interface TaskLogsProps {
  taskId: string;
}

export const TaskLogs = ({ taskId }: TaskLogsProps) => {
  const { data: logs, isLoading } = useGetLogs({ taskId });

  if (isLoading) {
    return <div>Loading activity...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Activity</h3>
      <div className="space-y-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {logs?.map((log: any) => (
          <div key={log.id} className="flex gap-x-2">
            <MemberAvatar name={log.user?.name} className="size-8" />
            <div className="flex-1">
              <div className="flex items-center gap-x-2">
                <p className="font-semibold">{log.user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(log.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="text-sm">{log.action}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
