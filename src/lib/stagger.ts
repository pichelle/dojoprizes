// Shared helper for staggered entrance animations (.stagger-in in
// globals.css) -- caps the delay after a handful of items so a long
// list/grid doesn't take forever for the last card to appear.
export function staggerDelay(index: number, stepMs = 45, maxSteps = 10): string {
  return `${Math.min(index, maxSteps) * stepMs}ms`;
}
