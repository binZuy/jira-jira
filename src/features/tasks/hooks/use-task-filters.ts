import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

import { TaskStatus, Priority } from "@/lib/types/enums";

export const useTaskFilters = () => {
  return useQueryStates({
    projectId: parseAsString,
    status: parseAsStringEnum(Object.values(TaskStatus)),
    priority: parseAsStringEnum(Object.values(Priority)),
    assigneeId: parseAsString,
    search: parseAsString,
    dueDate: parseAsString,
  });
};
