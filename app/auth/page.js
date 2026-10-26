import { Suspense } from "react";
import TopBar from "@/components/TopBar";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log in or sign up" };

export default function AuthPage() {
  return (
    <main className="page">
      <TopBar />
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
