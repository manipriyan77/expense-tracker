"use client";

import { redirect } from "next/navigation";

export default function EmergencyFundPage() {
  redirect("/planners?tab=emergency");
}
