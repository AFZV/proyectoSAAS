import { SignIn, UserButton } from "@clerk/nextjs";
import LoginPage from "./components/LoginPage/LoginPage";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
export default async function Page() {
  const { userId } = auth();

  if (userId) redirect("/");
  return <LoginPage />;
}
