"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoalsAnalysisPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/goals?tab=intelligence");
  }, [router]);
  return null;
}
