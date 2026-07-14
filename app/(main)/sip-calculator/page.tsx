"use client";

import { redirect } from "next/navigation";

export default function SipCalculatorPage() {
  redirect("/planners?tab=sip");
}
