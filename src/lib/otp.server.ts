/**
 * Server-only WhatsApp OTP engine for password reset.
 * Never import this from client-reachable modules.
 */
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { normalizePhone } from "./phone";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_SENDS = 3;

export class OtpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function hashOtp(otp: string, phone: string): string {
  return createHash("sha256").update(`${phone}:${otp}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function findUserByPhone(phone: string): Promise<string> {
  const db = await admin();
  const { data, error } = await db
    .from("profiles")
    .select("id, phone")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  if (error) throw new OtpError("Something went wrong. Please try again.", 500);
  if (!data) throw new OtpError("This WhatsApp number is not registered.", 404);
  return data.id;
}

function buildMessage(otp: string): string {
  return [
    "*Kelola Verification*",
    "",
    "Your verification code is:",
    "",
    otp,
    "",
    "This code will expire in 5 minutes.",
    "Do not share this code with anyone.",
  ].join("\n");
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const token = process.env["FONNTE_TOKEN"];
  if (!token) {
    console.warn("[otp] FONNTE_TOKEN missing — WhatsApp delivery skipped.");
    throw new OtpError(
      "WhatsApp service is not configured yet. Please contact the administrator.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ target: phone, message, countryCode: "62" }),
    });
  } catch (error) {
    console.error("[otp] WhatsApp request failed", error);
    throw new OtpError("Could not reach the WhatsApp service. Please try again.", 502);
  }

  const bodyText = await response.text();
  if (!response.ok) {
    console.error(`[otp] WhatsApp provider error [${response.status}]: ${bodyText}`);
    throw new OtpError("Failed to send the OTP. Please try again in a moment.", 502);
  }
  try {
    const parsed = JSON.parse(bodyText) as { status?: boolean; reason?: string };
    if (parsed.status === false) {
      console.error(`[otp] WhatsApp provider rejected: ${parsed.reason ?? bodyText}`);
      throw new OtpError(parsed.reason ?? "Failed to send the OTP. Please try again.", 502);
    }
  } catch (error) {
    if (error instanceof OtpError) throw error;
    // Non-JSON success body is acceptable.
  }
}

/** Step 1 — validate the number, mint an OTP and deliver it over WhatsApp. */
export async function requestOtp(rawPhone: string): Promise<{ phone: string; expiresAt: string }> {
  const phone = normalizePhone(rawPhone);
  const userId = await findUserByPhone(phone);
  const db = await admin();

  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await db
    .from("password_reset_otps")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_MAX_SENDS) {
    throw new OtpError("Too many OTP requests. Please wait 10 minutes and try again.", 429);
  }

  // Invalidate every previous code for this number.
  await db
    .from("password_reset_otps")
    .update({ used: true })
    .eq("phone_number", phone)
    .eq("used", false);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const { error } = await db.from("password_reset_otps").insert({
    user_id: userId,
    phone_number: phone,
    otp_hash: hashOtp(otp, phone),
    expires_at: expiresAt,
  });
  if (error) throw new OtpError("Something went wrong. Please try again.", 500);

  await sendWhatsApp(phone, buildMessage(otp));
  return { phone, expiresAt };
}

interface VerifiedOtp {
  id: string;
  userId: string;
}

/** Verifies an OTP without consuming it. Increments the attempt counter on failure. */
export async function verifyOtp(rawPhone: string, otp: string): Promise<VerifiedOtp> {
  const phone = normalizePhone(rawPhone);
  if (!/^\d{6}$/.test(otp)) throw new OtpError("Invalid OTP.", 400);

  const db = await admin();
  const { data, error } = await db
    .from("password_reset_otps")
    .select("id, user_id, otp_hash, expires_at, attempt, used")
    .eq("phone_number", phone)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new OtpError("Something went wrong. Please try again.", 500);
  if (!data) throw new OtpError("No active OTP. Please request a new code.", 400);

  if (new Date(data.expires_at).getTime() < Date.now()) {
    await db.from("password_reset_otps").update({ used: true }).eq("id", data.id);
    throw new OtpError("This OTP has expired. Please request a new code.", 400);
  }

  if (!safeEqual(data.otp_hash, hashOtp(otp, phone))) {
    const attempt = data.attempt + 1;
    const exhausted = attempt >= MAX_ATTEMPTS;
    await db
      .from("password_reset_otps")
      .update({ attempt, used: exhausted })
      .eq("id", data.id);
    throw new OtpError(
      exhausted
        ? "Too many incorrect attempts. This OTP is no longer valid — please request a new code."
        : `Invalid OTP. ${MAX_ATTEMPTS - attempt} attempt(s) left.`,
      400,
    );
  }

  return { id: data.id, userId: data.user_id };
}

/** Step 3 — consume the OTP, rotate the password and revoke every existing session. */
export async function resetPassword(
  rawPhone: string,
  otp: string,
  password: string,
): Promise<void> {
  const verified = await verifyOtp(rawPhone, otp);
  const db = await admin();

  const { error } = await db.auth.admin.updateUserById(verified.userId, { password });
  if (error) {
    console.error("[otp] password update failed", error);
    throw new OtpError("We couldn't update your password. Please try again.", 500);
  }

  await db.auth.admin.signOut(verified.userId, "global").catch(() => undefined);
  await db.from("password_reset_otps").delete().eq("user_id", verified.userId);
}
