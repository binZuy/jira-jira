import { hc } from "hono/client";

import { AppType } from "@/app/api/[[...route]]/route";

// Client: for user like a new user to create new task
export const client = hc<AppType>(process.env.NEXT_PUBLIC_APP_URL!);