import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex w-full items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
