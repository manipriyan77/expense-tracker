"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IncomesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/expenses?tab=income");
  }, [router]);
  return null;
}
