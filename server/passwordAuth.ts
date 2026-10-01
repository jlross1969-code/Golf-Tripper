import crypto from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { authTokens, passwordCredentials, users } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { sendPlainEmail } from "./email";
import { burnPasswordCheck, hashPassword, hashToken, isEmail, newToken, normaliseEmail, validatePassword, verifyPassword } from "./passwordCrypto";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

// Failed sign-ins per email, held in memory (resets on restart; the IP rate limit is the backstop).
const failures = new Map<string, { count: number; lockedUntil: number }>();

function appUrl(req: Request) {
  return ENV.publicAppUrl || `${req.protocol}://${req.get("host")}`;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

async function findUserByEmail(email: string) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`);
  return rows;
}

async function issueSession(req: Request, res: Response, user: { openId: string; name: string | null }) {
  const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: SESSION_MS });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: SESSION_MS });
}

async function storeToken(purpose: "verify_email" | "reset_password", email: string, ttlMs: number, extra: { name?: string; passwordHash?: string } = {}) {
  const db = await requireDb();
  const { token, tokenHash } = newToken();
  await db.insert(authTokens).values({ purpose, email, tokenHash, expiresAt: new Date(Date.now() + ttlMs), ...extra });
  return token;
}

/** Marks a token used exactly once; returns the row only for the caller that wins the race. */
async function consumeToken(purpose: "verify_email" | "reset_password", token: unknown) {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const db = await requireDb();
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date()))).limit(1);
  if (!row) return null;
  const [result] = await db.update(authTokens).set({ usedAt: new Date() }).where(and(eq(authTokens.id, row.id), isNull(authTokens.usedAt)));
  return (result as { affectedRows?: number }).affectedRows === 1 ? row : null;
}

async function setCredential(userId: number, passwordHash: string) {
  const db = await requireDb();
  await db.insert(passwordCredentials).values({ userId, passwordHash }).onDuplicateKeyUpdate({ set: { passwordHash } });
}

export function registerPasswordAuthRoutes(app: Express) {
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Try again later." } }));

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const email = normaliseEmail(req.body?.email);
      const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 100) : "";
      const passwordError = validatePassword(req.body?.password);
      if (!isEmail(email) || !name) return res.status(400).json({ error: "Enter your name and a valid email address" });
      if (passwordError) return res.status(400).json({ error: passwordError });

      const existing = await findUserByEmail(email);
      const db = await requireDb();
      const hasCredential = existing.length
        ? (await db.select({ id: passwordCredentials.id }).from(passwordCredentials).where(eq(passwordCredentials.userId, existing[0].id)).limit(1)).length > 0
        : false;
      if (hasCredential) {
        // Same response as a new sign-up so the form cannot be used to discover accounts.
        void sendPlainEmail({ to: email, subject: "Golf Trip App sign-in", text: `Someone tried to create an account with this email address, but you already have one.\n\nSign in at ${appUrl(req)}/login, or reset your password if you have forgotten it.` });
      } else {
        const token = await storeToken("verify_email", email, VERIFY_TTL_MS, { name, passwordHash: await hashPassword(req.body.password) });
        void sendPlainEmail({ to: email, subject: "Confirm your Golf Trip App email", text: `Hi ${name},\n\nConfirm your email to finish creating your account (link valid for 24 hours):\n\n${appUrl(req)}/verify-email?token=${token}\n\nIf you did not ask for this, ignore this email.` });
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] register failed", error);
      res.status(500).json({ error: "Could not create the account" });
    }
  });

  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const row = await consumeToken("verify_email", req.body?.token);
      if (!row || !row.passwordHash) return res.status(400).json({ error: "This link is invalid or has expired" });
      const matches = await findUserByEmail(row.email);
      const db = await requireDb();
      let user = matches[0];
      if (user) {
        // Existing (for example Manus) account: proving the email lets them add a password, never changes role.
        const [credential] = await db.select({ id: passwordCredentials.id }).from(passwordCredentials).where(eq(passwordCredentials.userId, user.id)).limit(1);
        if (credential) return res.status(400).json({ error: "This email already has a password. Sign in or reset it." });
      } else {
        const openId = `local_${crypto.randomUUID()}`;
        await db.insert(users).values({ openId, name: row.name, email: row.email, loginMethod: "password", lastSignedIn: new Date() });
        [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      }
      await setCredential(user.id, row.passwordHash);
      await issueSession(req, res, user);
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] verify failed", error);
      res.status(500).json({ error: "Could not verify the email" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const fail = () => res.status(401).json({ error: "Incorrect email or password" });
    try {
      const email = normaliseEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password.slice(0, 200) : "";
      if (!isEmail(email) || !password) return fail();
      const state = failures.get(email);
      if (state && state.lockedUntil > Date.now()) return res.status(429).json({ error: "Too many failed attempts. Try again in a few minutes." });

      const db = await requireDb();
      const candidates = await findUserByEmail(email);
      let signedIn: (typeof candidates)[number] | null = null;
      for (const user of candidates) {
        const [credential] = await db.select().from(passwordCredentials).where(eq(passwordCredentials.userId, user.id)).limit(1);
        if (credential && (await verifyPassword(password, credential.passwordHash))) { signedIn = user; break; }
      }
      if (!candidates.length) await burnPasswordCheck(password);
      if (!signedIn) {
        const count = (state?.count ?? 0) + 1;
        failures.set(email, { count, lockedUntil: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
        return fail();
      }
      failures.delete(email);
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, signedIn.id));
      await issueSession(req, res, signedIn);
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] login failed", error);
      res.status(500).json({ error: "Could not sign in" });
    }
  });

  app.post("/api/auth/forgot", async (req: Request, res: Response) => {
    try {
      const email = normaliseEmail(req.body?.email);
      if (isEmail(email) && (await findUserByEmail(email)).length) {
        const token = await storeToken("reset_password", email, RESET_TTL_MS);
        void sendPlainEmail({ to: email, subject: "Reset your Golf Trip App password", text: `Use this link to choose a new password (valid for 1 hour):\n\n${appUrl(req)}/reset-password?token=${token}\n\nIf you did not ask for this, ignore this email.` });
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] forgot failed", error);
      res.json({ ok: true });
    }
  });

  app.post("/api/auth/reset", async (req: Request, res: Response) => {
    try {
      const passwordError = validatePassword(req.body?.password);
      if (passwordError) return res.status(400).json({ error: passwordError });
      const row = await consumeToken("reset_password", req.body?.token);
      if (!row) return res.status(400).json({ error: "This link is invalid or has expired" });
      const [user] = await findUserByEmail(row.email);
      if (!user) return res.status(400).json({ error: "This link is invalid or has expired" });
      await setCredential(user.id, await hashPassword(req.body.password));
      failures.delete(row.email);
      // Any other outstanding reset links for this email are now void.
      const db = await requireDb();
      await db.update(authTokens).set({ usedAt: new Date() }).where(and(eq(authTokens.email, row.email), eq(authTokens.purpose, "reset_password"), isNull(authTokens.usedAt)));
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] reset failed", error);
      res.status(500).json({ error: "Could not reset the password" });
    }
  });
}
