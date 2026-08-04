import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isValidIndonesianPhone } from "@/lib/phone";
import { OtpError, verifyOtp } from "@/lib/otp.server";

const schema = z.object({
  phone: z.string().trim().refine(isValidIndonesianPhone, { message: "Invalid WhatsApp number." }),
  otp: z.string().trim().regex(/^\d{6}$/, "Invalid OTP."),
});

export const Route = createFileRoute("/api/public/auth/verify-otp")({
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
          await verifyOtp(parsed.data.phone, parsed.data.otp);
          return Response.json({ ok: true });
        } catch (error) {
          if (error instanceof OtpError) {
            return Response.json({ error: error.message }, { status: error.status });
          }
          console.error("[api] verify-otp", error);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
