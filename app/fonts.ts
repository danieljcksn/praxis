import { Instrument_Sans, Instrument_Serif } from "next/font/google";

/** Interface voice: a compact modern grotesque. Variable 400–700, so every
 *  weight in the scale comes from one file. Used for everything that is read
 *  rather than looked at. */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-family",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/** Display voice: high-contrast serif, 400 only. Deliberately rationed — page
 *  titles, the practice clock, and the wordmark. Nothing smaller than 20px. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-family",
  display: "swap",
  fallback: ["ui-serif", "Georgia", "serif"],
});
