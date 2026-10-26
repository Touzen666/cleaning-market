import crypto from "node:crypto";
export function hashCleaningPassword(password: string) {
  const salt = crypto.randomBytes(16);
  return `${salt.toString("hex")}:${crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex")}`;
}
export function verifyCleaningPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (
    !salt ||
    !hash ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{64}$/.test(hash)
  )
    return false;
  return crypto.timingSafeEqual(
    crypto.pbkdf2Sync(password, Buffer.from(salt, "hex"), 100000, 32, "sha256"),
    Buffer.from(hash, "hex"),
  );
}
