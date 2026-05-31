import { createHash } from "node:crypto";

export function makeStableUuid(seed) {
  return createHash("sha256")
    .update(seed)
    .digest("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 16);
}
