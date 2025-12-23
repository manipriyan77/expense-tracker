"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function CheckEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Get email from URL params if available
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase().auth.getSession();
      if (session) {
        router.push("/");
      }
    };

    checkAuth();

    // Set up a listener for auth state changes
    const { data: { subscription } } = supabase().auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          router.push("/");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const { error } = await supabase().auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        alert(`Error resending email: ${error.message}`);
      } else {
        alert("Confirmation email sent! Please check your inbox.");
      }
    } catch (error) {
      console.error("Error resending email:", error);
      alert("Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">
            Check your email
          </CardTitle>
          <CardDescription>
            We've sent a confirmation link to {email || "your email address"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Click the link in the email to complete your registration.</p>
            <p>If you don't see the email, check your spam folder.</p>
          </div>

          <div className="space-y-3">
            {email && (
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                disabled={isResending}
              >
                {isResending ? "Sending..." : "Resend confirmation email"}
              </Button>
            )}

            <div className="text-center">
              <Link
                href="/sign-in"
                className="text-sm text-blue-600 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
