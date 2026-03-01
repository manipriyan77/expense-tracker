"use client";

import { redirect } from "next/navigation";

export default function StocksPage() {
  redirect("/investments?tab=stocks");
}
