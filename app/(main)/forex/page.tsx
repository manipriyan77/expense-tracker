"use client";

import { redirect } from "next/navigation";

export default function ForexPage() {
  redirect("/investments?tab=forex");
}
