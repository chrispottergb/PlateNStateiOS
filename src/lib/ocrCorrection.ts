/**
 * OCR post-processing for license plates.
 *
 * Common US plate formats use mixed alpha/numeric patterns. OCR frequently
 * confuses O↔0 and I↔1. This module applies position-based heuristics to
 * correct those substitutions using known US plate format patterns.
 *
 * Known formats (non-exhaustive):
 *   AAA-0000  (3 alpha + 4 numeric) — e.g. CA, TX, FL
 *   000-AAA   (3 numeric + 3 alpha) — e.g. NY
 *   A000000   (1 alpha + 6 numeric) — e.g. some commercial
 *   AA-000-AA (alpha-numeric mixed) — e.g. some states
 *
 * Strategy: infer per-character type (alpha/numeric) by matching the
 * cleaned plate against the most common patterns, then enforce the expected
 * type with O↔0 / I↔1 swaps only where needed.
 */

type CharType = "alpha" | "numeric" | "any";

// Most common US plate patterns, longest first so the best match wins.
// Each string encodes expected character types: A=alpha, 0=numeric, *=any.
const PATTERNS: string[] = [
  "AAA0000", // CA, TX, FL  (7 chars)
  "0000AAA", // NY-style     (7 chars)
  "AA00000", // 7 chars mixed
  "000AAA0", // 7 chars mixed
  "AAA000",  // 6 chars: 3+3
  "000AAA",  // 6 chars: 3+3
  "AA0000",  // 6 chars
  "0000AA",  // 6 chars
  "A00000",  // 6 chars
  "AA000A",  // 6 chars
  "A0A000",  // 6 chars
  "0A0000",  // 6 chars
  "AA0A00",  // 6 chars
];

function patternToTypes(pattern: string): CharType[] {
  return pattern.split("").map((c) => {
    if (c === "A") return "alpha";
    if (c === "0") return "numeric";
    return "any";
  });
}

function scoreMatch(plate: string, types: CharType[]): number {
  if (plate.length !== types.length) return -1;
  let score = 0;
  for (let i = 0; i < plate.length; i++) {
    const ch = plate[i];
    const t = types[i];
    const isAlpha = /[A-Z]/.test(ch);
    const isNum = /[0-9]/.test(ch);
    if (t === "alpha" && isAlpha) score++;
    else if (t === "numeric" && isNum) score++;
    else if (t === "any") score++;
    // char doesn't match expected type — could be an OCR mistake
  }
  return score;
}

function applyTypes(plate: string, types: CharType[]): string {
  return plate
    .split("")
    .map((ch, i) => {
      const t = types[i];
      if (t === "alpha") {
        // Should be a letter — fix digit→letter substitutions
        if (ch === "0") return "O";
        if (ch === "1") return "I";
      } else if (t === "numeric") {
        // Should be a digit — fix letter→digit substitutions
        if (ch === "O") return "0";
        if (ch === "I") return "1";
      }
      return ch;
    })
    .join("");
}

/**
 * Correct common OCR misreads (O↔0, I↔1) in a raw plate string using
 * position-based heuristics derived from common US plate formats.
 *
 * If no pattern matches the plate length/content, the input is returned
 * unchanged (still uppercased and stripped of non-alphanumeric chars).
 */
export function correctOcrPlate(raw: string): string {
  // Strip non-alphanumeric chars (spaces, dashes, dots) and uppercase
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return cleaned;

  let bestTypes: CharType[] | null = null;
  let bestScore = -1;

  for (const pattern of PATTERNS) {
    const types = patternToTypes(pattern);
    const s = scoreMatch(cleaned, types);
    if (s > bestScore) {
      bestScore = s;
      bestTypes = types;
    }
  }

  if (bestTypes === null || bestScore < 0) return cleaned;

  return applyTypes(cleaned, bestTypes);
}
