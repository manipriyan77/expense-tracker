"use client";

import { redirect } from "next/navigation";

export default function GoldPage() {
  redirect("/investments?tab=gold");
}
