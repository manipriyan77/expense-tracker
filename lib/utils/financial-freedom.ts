// ─── Financial Freedom (FI) projection ──────────────────────────────────────
//
// Models the "moving target" problem: your FI number keeps rising with
// inflation while your invested corpus (a step-up SIP compounding at an
// expected return) chases it. The crossover age is when the corpus finally
// catches the running FI target — the point of financial independence.
//
// FI target = annual expenses × multiplier, where multiplier = 100 / SWR%.
// e.g. the 33x rule ≈ a 3% safe withdrawal rate; the classic 25x ≈ 4%.

export interface FIInputs {
  currentAge: number;
  endAge: number;
  /** Monthly expense today, in today's money. */
  monthlyExpense: number;
  /** Annual inflation applied to expenses, in %. */
  inflationPct: number;
  /** Expected annual investment return, in %. */
  returnPct: number;
  /** Years of expenses that make you FI (e.g. 33 → 3% SWR). */
  fiMultiplier: number;
  /** Current invested corpus you start with. */
  startingCorpus: number;
  /** Monthly SIP in the first year. */
  startingSIP: number;
  /** Annual SIP step-up, in % (e.g. 10 → increase SIP 10% each year). */
  stepUpPct: number;
}

export interface FIRow {
  age: number;
  /** Inflated monthly expense for this age. */
  monthlyExpense: number;
  /** FI target = annual expense × multiplier. */
  fiTarget: number;
  /** Invested corpus at the start of this age-year. */
  corpus: number;
  /** Monthly SIP contributed during this age-year. */
  sipPerMonth: number;
  /** corpus / fiTarget as a percentage. */
  pctOfFI: number;
  /** Whether the corpus has caught the running FI target. */
  reached: boolean;
}

export interface FIProjection {
  rows: FIRow[];
  /** First age at which corpus ≥ FI target, or null if never within horizon. */
  fiAge: number | null;
  /** Years from today until FI, or null. */
  yearsToFI: number | null;
  /** The row at which FI is reached, or null. */
  fiRow: FIRow | null;
  /** Implied safe withdrawal rate, in % (100 / multiplier). */
  swrPct: number;
}

export function projectFI(inputs: FIInputs): FIProjection {
  const {
    currentAge,
    endAge,
    monthlyExpense,
    inflationPct,
    returnPct,
    fiMultiplier,
    startingCorpus,
    startingSIP,
    stepUpPct,
  } = inputs;

  const rows: FIRow[] = [];
  const rMonthly = returnPct / 100 / 12;
  const infl = inflationPct / 100;
  const stepUp = stepUpPct / 100;

  let corpus = Math.max(0, startingCorpus);
  let sip = Math.max(0, startingSIP);
  let fiAge: number | null = null;
  let fiRow: FIRow | null = null;

  const lastAge = Math.max(endAge, currentAge);

  for (let age = currentAge; age <= lastAge; age++) {
    const yearsOut = age - currentAge;
    const infExpense = monthlyExpense * Math.pow(1 + infl, yearsOut);
    const fiTarget = infExpense * 12 * fiMultiplier;
    const reached = fiTarget > 0 && corpus >= fiTarget;

    const row: FIRow = {
      age,
      monthlyExpense: infExpense,
      fiTarget,
      corpus,
      sipPerMonth: sip,
      pctOfFI: fiTarget > 0 ? (corpus / fiTarget) * 100 : 0,
      reached,
    };
    rows.push(row);

    if (reached && fiAge === null) {
      fiAge = age;
      fiRow = row;
    }

    // Advance one year: 12 monthly SIP contributions compounding at the return,
    // then step up next year's SIP.
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + sip) * (1 + rMonthly);
    }
    sip *= 1 + stepUp;
  }

  return {
    rows,
    fiAge,
    yearsToFI: fiAge === null ? null : fiAge - currentAge,
    fiRow,
    swrPct: fiMultiplier > 0 ? 100 / fiMultiplier : 0,
  };
}

// ─── Inverse: the starting SIP required to be FI in N years ──────────────────
//
// With no starting corpus, the accumulated corpus is linear in the SIP amount,
// so we compute the corpus grown from a ₹1/month step-up SIP and scale.

/** Corpus after `years` from a ₹1/month SIP that steps up `stepUpPct` yearly. */
export function corpusPerUnitSIP(
  years: number,
  returnPct: number,
  stepUpPct: number,
): number {
  const rMonthly = returnPct / 100 / 12;
  const g = stepUpPct / 100;
  let corpus = 0;
  let sip = 1;
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + sip) * (1 + rMonthly);
    }
    sip *= 1 + g;
  }
  return corpus;
}

/** Starting monthly SIP needed to hit the (inflated) FI target in `years`. */
export function requiredStartingSIP(
  monthlyExpenseToday: number,
  years: number,
  opts: {
    inflationPct: number;
    returnPct: number;
    fiMultiplier: number;
    stepUpPct: number;
  },
): number {
  const target =
    monthlyExpenseToday *
    Math.pow(1 + opts.inflationPct / 100, years) *
    12 *
    opts.fiMultiplier;
  const unit = corpusPerUnitSIP(years, opts.returnPct, opts.stepUpPct);
  return unit > 0 ? target / unit : Infinity;
}
