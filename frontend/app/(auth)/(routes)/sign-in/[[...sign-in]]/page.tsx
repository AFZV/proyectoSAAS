import { SignIn, UserButton } from "@clerk/nextjs";

export default function Page() {
  return <SignIn path="/sign-in" />;
}
