import { SignIn, UserButton } from "@clerk/nextjs";
import LoginPage from "./components/LoginPage/LoginPage";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";


// This page handles the sign-in process using Clerk's SignIn component.
// If the user is already authenticated, they will be redirected to the home page.
// If not, they will see the sign-in form.
export default async function Page() { 
  const { userId } = auth();

  if (userId) redirect("/");
  return <LoginPage />;
}
