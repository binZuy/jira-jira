// import { ProjectAnalyticsResponseType } from "@/features/projects/api/use-get-project-analytics";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Clock, AlertCircle, CheckCircle2, ListTodo, BarChart3 } from "lucide-react";

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
    overdueTaskCount: number;
    overdueTaskDifference: number;
  };
}

export const Analytics = ({ data }: AnalyticsProps) => {
  if (!data) return null;

  const stats = [
    {
      title: "Total Tasks",
      value: data.taskCount,
      difference: data.taskDifference,
      icon: ListTodo
    },
    {
      title: "Assigned Tasks",
      value: data.assignedTaskCount,
      difference: data.assignedTaskDifference,
      icon: Briefcase
    },
    {
      title: "Completed Tasks",
      value: data.completedTaskCount,
      difference: data.completedTaskDifference,
      icon: CheckCircle2
    },
    {
      title: "Overdue Tasks",
      value: data.overdueTaskCount,
      difference: data.overdueTaskDifference,
      icon: AlertCircle
    }
  ];

  const allValuesZero = stats.every(stat => stat.value === 0 && stat.difference === 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Statistics</CardTitle>
            <Badge variant="outline" className="bg-muted">
              {stats.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allValuesZero ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No statistics available yet. Start creating and managing tasks to see analytics!</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-x-visible scrollbar-hide hover:scrollbar-default">
            {stats.map((stat) => (
              <div key={stat.title} className="min-w-[240px] md:min-w-0">
                <Card className="h-full transition-all duration-200 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.difference > 0 ? '+' : ''}{stat.difference} from last month
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};