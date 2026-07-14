"use client";

import { redirect } from "next/navigation";

export default function FinancialFreedomPage() {
  redirect("/planners?tab=fi");
}
