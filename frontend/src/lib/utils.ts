import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Automatically fixes grammar and capitalization for service titles.
 * Uses intelligent title-casing to correct vendor input errors.
 */
export function formatServiceTitle(text: string | null | undefined): string {
  if (!text) return "";
  
  // Replace multiple spaces with single space, trim
  const cleanText = text.replace(/\s+/g, " ").trim();
  
  // Intelligent title case (capitalizes first letter of each word, lowers the rest)
  return cleanText.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, (match) => match.toUpperCase());
}
