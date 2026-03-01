"use client";

import { redirect } from "next/navigation";

export default function MutualFundsPage() {
  redirect("/investments?tab=mutual-funds");
}
