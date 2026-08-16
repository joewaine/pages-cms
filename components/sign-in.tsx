"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { emailOtp, signIn } from "@/lib/auth-client";
import { getAuthCallbackURL, getSafeRedirect } from "@/lib/auth-redirect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OtpVerificationForm } from "@/components/otp-verification-form";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [submittingMethod, setSubmittingMethod] = useState<
    "github" | "email" | "otp" | null
  >(null);
  const isSubmitting = submittingMethod !== null;

  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "";
  const redirectParam = searchParams.get("redirect") || "";
  const safeRedirect = getSafeRedirect(redirectParam);
  const callbackURL = getAuthCallbackURL(safeRedirect);
  const errorCallbackURL =
    safeRedirect === "/"
      ? "/sign-in"
      : `/sign-in?redirect=${encodeURIComponent(safeRedirect)}`;

  const getErrorMessage = (value: string) => {
    if (value.toLowerCase() !== "unable_to_get_user_info") return value;
    return [
      "GitHub denied profile access. Re-authorize Pages CMS in GitHub Settings > Applications > Authorized GitHub Apps / Authorized OAuth Apps, then try again.",
      "https://github.com/settings/applications",
    ].join(" ");
  };

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error), { duration: 12000 });
  }, [error]);

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) setEmail(email.trim().toLowerCase());
  }, [searchParams]);

  const handleGithubSignIn = async () => {
    setSubmittingMethod("github");
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL,
        errorCallbackURL,
        disableRedirect: true,
      });
      if (result.error?.message) {
        toast.error(result.error.message);
        setSubmittingMethod(null);
        return;
      }

      if (result.data?.url) {
        window.location.assign(result.data.url);
        return;
      }

      setSubmittingMethod(null);
      toast.error("Could not start GitHub sign-in. Please try again.");
    } catch (error: any) {
      toast.error(error?.message || "Could not start GitHub sign-in.");
      setSubmittingMethod(null);
    }
  };

  const handleEmailSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Invalid email");
      return;
    }

    setSubmittingMethod("email");
    try {
      const result = await emailOtp.sendVerificationOtp({
        email: normalizedEmail,
        type: "sign-in",
      });

      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }

      setEmail(normalizedEmail);
      setOtp("");
      setStep("otp");
      toast.success("We sent you a sign-in code.", { duration: 8000 });
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handleOtpSignIn = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    setSubmittingMethod("otp");
    try {
      const result = await signIn.emailOtp({
        email,
        otp,
      });

      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }

      window.location.assign(safeRedirect);
    } finally {
      setSubmittingMethod(null);
    }
  };

  const resetToFullSignIn = () => {
    setStep("email");
    setOtp("");
  };

  const legalCopy = (
    <p className="text-sm text-muted-foreground text-center">
      Questions? Email{" "}
      <a className="underline hover:decoration-muted-foreground/50" href={`mailto:${BRAND.supportEmail}`}>
        {BRAND.supportEmail}
      </a>
      .
    </p>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 flex justify-center items-center">
      <div className="sm:max-w-[340px] w-full">
        {step === "otp" ? (
          <div className="space-y-6">
            <OtpVerificationForm
              busy={isSubmitting}
              emailLabel={email}
              otp={otp}
              pending={submittingMethod === "otp"}
              resendDisabled={submittingMethod === "otp"}
              resendPending={submittingMethod === "email"}
              onChange={setOtp}
              onResend={() => void handleEmailSignIn()}
              onSignInAnotherWay={resetToFullSignIn}
              onSubmit={async (event) => {
                event.preventDefault();
                await handleOtpSignIn();
              }}
            />
            {legalCopy}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <svg className="size-7" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 2 L30 16 L16 30 L2 16 Z" />
                </svg>
              </div>
              <h1 className="text-lg font-medium tracking-tight">
                Sign in to edit your site
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the email{" "}
                {BRAND.owner}{" "}
                set you up with and we&apos;ll send a 6-digit code.
              </p>
            </div>
            <form
              className="space-y-2"
              onSubmit={async (event) => {
                event.preventDefault();
                await handleEmailSignIn();
              }}
            >
              <Input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoFocus
                disabled={isSubmitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Email me a code
                {submittingMethod === "email" && (
                  <Loader className="size-4 animate-spin" />
                )}
              </Button>
            </form>
            {/* GitHub sign-in is for the site owner/admin only; clients use email. */}
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              onClick={handleGithubSignIn}
              disabled={isSubmitting}
            >
              Site owner? Sign in with GitHub
              {submittingMethod === "github" && (
                <Loader className="inline size-3 ml-1 animate-spin" />
              )}
            </button>
            {legalCopy}
          </div>
        )}
      </div>
    </div>
  );
}
