/** Collision-resistant id. Uses crypto.randomUUID where available (all modern
 *  browsers), falling back to a timestamp+random string for exotic runtimes. */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
