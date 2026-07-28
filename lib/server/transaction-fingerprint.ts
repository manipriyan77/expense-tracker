/**
 * Duplicate fingerprint shared by manual entry, CSV import, and any future
 * import path — same formula everywhere so dedup is consistent.
 */
export function buildFingerprint(
  date: string,
  description: string,
  amount: number,
  account: string | null | undefined,
): string {
  const isoDate = String(date).split("T")[0];
  const merchant = description.trim().toLowerCase();
  const amt = amount.toFixed(2);
  const acct = (account ?? "").trim().toLowerCase();
  return `${isoDate}|${merchant}|${amt}|${acct}`;
}
