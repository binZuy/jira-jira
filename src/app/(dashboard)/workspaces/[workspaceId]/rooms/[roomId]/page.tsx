import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";

import { RoomIdClient } from "./client";

const RoomIdPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <RoomIdClient />;
};
export default RoomIdPage;
