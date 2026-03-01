"use client";

import { redirect } from "next/navigation";

export default function SavingsChallengesPage() {
  redirect("/goals?tab=challenges");
}
