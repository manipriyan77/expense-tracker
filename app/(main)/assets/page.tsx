"use client";

import { redirect } from "next/navigation";

export default function AssetsPage() {
  redirect("/net-worth?tab=allocation");
}
