import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const AUTH_USERNAME = process.env.AUTH_USERNAME || "admin";
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || "";

const COOKIE_NAME = "etsy-optimizer-token";
const TOKEN_EXPIRY = "24h";

export async function verifyCredentials(
  username: string,
  password: string
): Promise<boolean> {
  if (username !== AUTH_USERNAME) return false;

  // If no hash set yet, accept any password (first-time setup)
  if (!AUTH_PASSWORD_HASH) {
    console.warn(
      "WARNING: No AUTH_PASSWORD_HASH set. Run the hash generator to set one."
    );
    return password === "admin";
  }

  return bcrypt.compare(password, AUTH_PASSWORD_HASH);
}

export function createToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getCookieName(): string {
  return COOKIE_NAME;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
