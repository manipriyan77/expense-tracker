"use client";

import { redirect } from "next/navigation";

export default function BudgetTemplatesPage() {
  redirect("/budgets?tab=templates");
}
