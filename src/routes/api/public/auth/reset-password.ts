import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkPasswordStrength, isValidIndonesianPhone } from "@/lib/phone";
import { OtpError, resetPassword } from "@/lib/otp.server";

const schema = z.object({
  phone: z.string().trim().refine(isValidIndonesianPhone, { message: "Invalid WhatsApp number." }),
  otp: z.string().trim().regex(/^\d{6}$/, "Invalid OTP."),
  password: z
    .string()
    .max(72)
    .refine((value) => checkPasswordStrength(value).valid, {
      message: "Password must be at least 8 characters and include uppercase, lowercase and a number.",
    }),
});

export const Route = createFileRoute("/api/public/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = schema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.issues[0]?.message ?? "Invalid request." },
              { status: 400 },
            );
          }
          await resetPassword(parsed.data.phone, parsed.data.otp, parsed.data.password);
          return Response.json({ ok: true });
        } catch (error) {
          if (error instanceof OtpError) {
            return Response.json({ error: error.message }, { status: error.status });
          }
          console.error("[api] reset-password", error);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
