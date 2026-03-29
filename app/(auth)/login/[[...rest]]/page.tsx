import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex w-full items-center justify-center">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
