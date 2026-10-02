import crypto from "node:crypto";

const KEY_LENGTH = 64;
const COST = { N: 16384, r: 8, p: 1 };

function scrypt(password: string, salt: Buffer, cost = COST): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, { ...cost, maxmem: 64 * 1024 * 1024 }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Format: scrypt$N$r$p$salt$hash (base64). The parameters are stored so cost can be raised later. */
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt);
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), { N: Number(N), r: Number(r), p: Number(p) });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Work factor spent on unknown emails so response time does not reveal whether an account exists. */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummyHash);
}

export function newToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < 10) return "Use at least 10 characters";
  if (password.length > 128) return "Use at most 128 characters";
  if (/^(.)\1+$/.test(password)) return "Choose a less repetitive password";
  return null;
}

export const normaliseEmail = (email: unknown) => (typeof email === "string" ? email.trim().toLowerCase() : "");
export const isEmail = (email: string) => email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
