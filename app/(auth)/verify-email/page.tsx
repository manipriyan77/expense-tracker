import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-md px-4">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <MailCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We sent a verification link to your email address. Please click the
            link to activate your account before signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Didn&apos;t receive an email? Check your spam folder or try signing
            up again.
          </p>
          <Button asChild className="w-full" variant="outline">
            <Link href="/sign-in">Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
