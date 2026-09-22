/** Collision-resistant id. Uses crypto.randomUUID where available (all modern
 *  browsers), falling back to a timestamp+random string for exotic runtimes. */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A short id for records that exist in the thousands.
 *
 *  A UUID is 36 characters. Reading events are the only unbounded array in the
 *  app and every one of them is mirrored into a single sync payload with a
 *  2 MB ceiling, so 26 wasted characters per row is 130 KB at ten thousand
 *  rows. Eleven random base-36 characters give ~57 bits — far more than enough
 *  to keep one person's reading log collision-free. */
export function createShortId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value.toString(36).padStart(11, "0").slice(-11);
}
