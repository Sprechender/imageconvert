import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Memorize the most recent result to avoid recomputing identical class strings
let lastInputs: ClassValue[] | null = null;
let lastResult: string | null = null;

export function cn(...inputs: ClassValue[]) {
  // Check if inputs match the last call
  if (lastInputs && 
      inputs.length === lastInputs.length &&
      inputs.every((input, i) => input === lastInputs![i])) {
    return lastResult!;
  }

  // Compute new result and cache it
  const result = twMerge(clsx(inputs));
  lastInputs = inputs;
  lastResult = result;
  return result;
}
