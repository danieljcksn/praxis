import "server-only";
import { sanitizeProfile, type BodyProfile } from "./engine";

/** Held in the deployment environment because this repository is public. */
export function defaultProfile(): BodyProfile | null {
  try {
    return sanitizeProfile(JSON.parse(process.env.TRAINING_PROFILE ?? "null"));
  } catch {
    return null;
  }
}
