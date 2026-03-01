"use client";

import { redirect } from "next/navigation";

export default function BillsPage() {
  redirect("/recurring?tab=bills");
}
