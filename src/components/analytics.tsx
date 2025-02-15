// import { ProjectAnalyticsResponseType } from "@/features/projects/api/use-get-project-analytics";
import { ScrollArea, ScrollBar} from "@/components/ui/scroll-area";
import { AnalyticsCard } from "./analytics-card";
import { DottedSeparator } from "./dotted-separator";
interface AnalyticsProps {
  data?: {
    taskCount: number;
    taskDifference: number;
    projectCount?: number;
    projectDifference?: number;
    assignedTaskCount: number;
    assignedTaskDifference: number;
    completedTaskCount: number;
    completedTaskDifference: number;
    incompletedTaskCount: number;
    incompletedTaskDifference: number;
    overdueTaskCount: number;
    overdueTaskDifference: number;
  };
}

export const Analytics = ({ data }:AnalyticsProps) => {
    if(!data) return null;
  return (
    <ScrollArea className="border rounded-lg w-full whitespace-nowrap shrink-0">
        <div className="w-full flex flex-row">
            <div className="flex items-center flex-1">
                <AnalyticsCard
                title="Total tasks"
                value={data.taskCount}
                variant={data.taskDifference > 0 ? "up":"down"}
                increaseValue={data.taskDifference} />
                <DottedSeparator direction="vertical" />
            </div>
            <div className="flex items-center flex-1">
                <AnalyticsCard
                title="Assigned Tasks"
                value={data.assignedTaskCount}
                variant={data.assignedTaskDifference > 0 ? "up":"down"}
                increaseValue={data.assignedTaskDifference} />
                <DottedSeparator direction="vertical" />
            </div>
            <div className="flex items-center flex-1">
                <AnalyticsCard
                title="Completed Tasks"
                value={data.completedTaskCount}
                variant={data.completedTaskDifference > 0 ? "up":"down"}
                increaseValue={data.completedTaskDifference} />
                <DottedSeparator direction="vertical" />
            </div>
            <div className="flex items-center flex-1">
                <AnalyticsCard
                title="Overdue Tasks"
                value={data.overdueTaskCount}
                variant={data.overdueTaskDifference> 0 ? "up":"down"}
                increaseValue={data.overdueTaskDifference} />
                <DottedSeparator direction="vertical" />
            </div>
            <div className="flex items-center flex-1">
                <AnalyticsCard
                title="Incompleted Tasks"
                value={data.incompletedTaskCount}
                variant={data.incompletedTaskDifference > 0 ? "up":"down"}
                increaseValue={data.incompletedTaskDifference} />
                <DottedSeparator direction="vertical" />
            </div>
        </div>
        <ScrollBar orientation="horizontal"/>
    </ScrollArea>
)
}