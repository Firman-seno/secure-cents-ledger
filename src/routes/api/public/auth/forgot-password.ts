import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isValidIndonesianPhone } from "@/lib/phone";
import { OtpError, requestOtp } from "@/lib/otp.server";

const schema = z.object({
  phone: z.string().trim().min(8).max(20).refine(isValidIndonesianPhone, {
    message: "Please enter a valid Indonesian WhatsApp number.",
  }),
});

export const Route = createFileRoute("/api/public/auth/forgot-password")({
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
          const result = await requestOtp(parsed.data.phone);
          return Response.json({ ok: true, expiresAt: result.expiresAt });
        } catch (error) {
          if (error instanceof OtpError) {
            return Response.json({ error: error.message }, { status: error.status });
          }
          console.error("[api] forgot-password", error);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
