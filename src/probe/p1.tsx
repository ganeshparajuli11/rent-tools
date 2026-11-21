/**
 * The colours a status may use (docs/DESIGN_SYSTEM.md §1). Colour is never
 * the only signal: every pill also shows its word.
 */
export type StatusTone =
  | "good"
  | "bad"
  | "warn"
  | "info"
  | "orange"
  | "neutral"
  | "outline";
