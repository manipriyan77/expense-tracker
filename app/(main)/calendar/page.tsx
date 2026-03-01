"use client";

import { redirect } from "next/navigation";

export default function CalendarPage() {
  redirect("/analytics?tab=calendar");
}
