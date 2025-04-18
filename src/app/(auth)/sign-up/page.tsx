import { SignUpCard } from "@/features/auth/components/sign-up-card";
import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";

const SignUpPage = async () => {
  const user = await getCurrent();
  console.log(user);
  if (user) redirect("/");
  return <SignUpCard />;
};

export default SignUpPage;
