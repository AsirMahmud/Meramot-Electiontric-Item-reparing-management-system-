"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import {
  checkUsername,
  signup,
  getVendorApplicationStatus,
  deliveryRegister,
} from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { UploadDropzone } from "@/lib/uploadthing";

type Mode = "login" | "signup";
type UsernameStatus = "idle" | "checking" | "available" | "taken";

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function getPasswordBar(password: string) {
  const checks = getPasswordChecks(password);
  const passed = Object.values(checks).filter(Boolean).length;

  if (!password) {
    return {
      width: "20%",
      color: "bg-red-500",
      label: "Weak",
      acceptable: false,
    };
  }

  if (passed <= 2) {
    return {
      width: "30%",
      color: "bg-red-500",
      label: "Weak",
      acceptable: false,
    };
  }

  if (passed <= 4) {
    return {
      width: "65%",
      color: "bg-yellow-400",
      label: "Medium",
      acceptable: false,
    };
  }

  return {
    width: "100%",
    color: "bg-green-500",
    label: "Strong",
    acceptable: true,
  };
}

type SessionUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  role?: string | null;
  accessToken?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeIdentifier(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function sessionMatchesIdentifier(user: SessionUser | undefined, identifier: string) {
  const expectedIdentifier = normalizeIdentifier(identifier);

  if (!expectedIdentifier || !user) {
    return false;
  }

  return [user.email, user.username].some(
    (value) => normalizeIdentifier(value) === expectedIdentifier
  );
}

export default function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  const [isDelivery, setIsDelivery] = useState(false);
  const [vehicleType, setVehicleType] = useState("");
  const [nidDocumentUrl, setNidDocumentUrl] = useState("");
  const [educationDocumentUrl, setEducationDocumentUrl] = useState("");
  const [cvDocumentUrl, setCvDocumentUrl] = useState("");
  const [nidUploadError, setNidUploadError] = useState("");
  const [educationUploadError, setEducationUploadError] = useState("");
  const [cvUploadError, setCvUploadError] = useState("");

  function resolveUploadedUrl(file: {
    ufsUrl?: string;
    url?: string;
    appUrl?: string;
    serverData?: { fileUrl?: string };
  }) {
    return file.serverData?.fileUrl ?? file.ufsUrl ?? file.url ?? file.appUrl ?? "";
  }

  const passwordChecks = useMemo(
    () => getPasswordChecks(form.password),
    [form.password]
  );

  const passwordBar = useMemo(
    () => getPasswordBar(form.password),
    [form.password]
  );

  useEffect(() => {
    if (!isSignup) return;

    const username = form.username.trim();

    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setUsernameStatus("checking");
        const result = await checkUsername(username);
        setUsernameStatus(result.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.username, isSignup]);

  async function getCurrentSessionUser(): Promise<SessionUser | undefined> {
    const sessionResponse = await fetch("/api/auth/session", {
      cache: "no-store",
    });

    if (!sessionResponse.ok) {
      return undefined;
    }

    const sessionData = await sessionResponse.json().catch(() => undefined);
    return sessionData?.user as SessionUser | undefined;
  }

  async function getCurrentSessionUserWithRetry(
    expectedIdentifier?: string
  ): Promise<SessionUser | undefined> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const user = await getCurrentSessionUser();

      if (!user?.role && !user?.accessToken) {
        await sleep(250);
        continue;
      }

      if (!expectedIdentifier || sessionMatchesIdentifier(user, expectedIdentifier)) {
        return user;
      }

      await sleep(250);
    }

    const finalUser = await getCurrentSessionUser();

    if (!expectedIdentifier || sessionMatchesIdentifier(finalUser, expectedIdentifier)) {
      return finalUser;
    }

    return undefined;
  }

  async function redirectByRole(user?: SessionUser) {
    if (!user) {
      router.replace("/");
      router.refresh();
      return;
    }

    if (user.role === "ADMIN") {
      router.replace("/admin/vendors");
      router.refresh();
      return;
    }

    if (user.role === "VENDOR") {
      if (!user.accessToken) {
        router.replace("/vendor/onboarding");
        return;
      }

      try {
        const vendorStatus = await getVendorApplicationStatus(user.accessToken);
        const application = vendorStatus?.application;

        if (application?.status === "APPROVED" && application?.setupComplete) {
          router.replace("/vendor/dashboard");
          router.refresh();
          return;
        }

        if (application?.status === "APPROVED") {
          router.replace("/vendor/setup-shop");
          return;
        }

        router.replace("/vendor/onboarding");
        return;
      } catch {
        router.replace("/vendor/onboarding");
        return;
      }
    }

    router.replace("/");
    router.refresh();
  }

  async function authenticateWithCredentials(
    identifier: string,
    password: string,
    failureMessage: string
  ) {
    const loginResult = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (loginResult?.error) {
      throw new Error(failureMessage);
    }

    const user = await getCurrentSessionUserWithRetry(identifier);

    if (!user) {
      throw new Error(
        "Authentication succeeded, but the active session did not refresh correctly. Please try again."
      );
    }

    return user;
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!form.name.trim()) throw new Error("Full name is required.");
        if (!form.email.trim()) throw new Error("Email is required.");
        if (!form.phone.trim()) throw new Error("Phone number is required.");
        
        if (isDelivery) {
          if (!nidDocumentUrl || !educationDocumentUrl || !cvDocumentUrl) {
            const missing: string[] = [];
            if (!nidDocumentUrl) missing.push("NID document");
            if (!educationDocumentUrl) missing.push("Education document");
            if (!cvDocumentUrl) missing.push("CV document");
            throw new Error(`Please upload: ${missing.join(", ")}.`);
          }
          
          await deliveryRegister({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            vehicleType: vehicleType.trim() || undefined,
            nidDocumentUrl: nidDocumentUrl.trim(),
            educationDocumentUrl: educationDocumentUrl.trim(),
            cvDocumentUrl: cvDocumentUrl.trim(),
          });
          
          router.replace("/delivery");
          router.refresh();
          return;
        }

        if (!form.username.trim()) throw new Error("Username is required.");
        if (!form.email.trim()) throw new Error("Email is required.");
        if (!form.phone.trim()) throw new Error("Phone number is required.");
        if (!form.password) throw new Error("Password is required.");

        if (usernameStatus === "taken") {
          throw new Error("Please choose a different username.");
        }

        if (!passwordBar.acceptable) {
          throw new Error("Please choose a stronger password.");
        }

        if (form.password !== form.confirm) {
          throw new Error("Passwords do not match.");
        }

        await signup({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        });

        const user = await authenticateWithCredentials(
          form.email.trim(),
          form.password,
          "Signup worked, but automatic login failed."
        );
        await redirectByRole(user);
        return;
      }

      if (!form.email.trim()) {
        throw new Error("Username or email is required.");
      }

      if (!form.password) {
        throw new Error("Password is required.");
      }

      const user = await authenticateWithCredentials(
        form.email.trim(),
        form.password,
        "Invalid credentials."
      );
      await redirectByRole(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");

    try {
      await signIn("google", { callbackUrl: "/auth/post-login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign in.");
    }
  }

  const showPasswordBar =
    isSignup && (passwordFocused || form.password.length > 0);

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-6">
      <div className="flex w-full items-center justify-center">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <Image
            src="/images/meramot.svg"
            alt="Meramot"
            width={240}
            height={80}
            className="h-16 w-auto object-contain md:h-20"
            priority
          />
        </Link>
      </div>
      <div className="rounded-[2rem] border border-white/60 bg-white/90 px-8 py-6 shadow-2xl backdrop-blur">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold leading-tight text-[#214c34]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>

          <p className="mt-1 text-sm text-[#5e6d64]">
            {isSignup
              ? "Sign up to request repairs, compare shops, and save viewed items."
              : "Sign in to continue to your dashboard."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-[#203126] transition hover:bg-secondary"
        >
          <span className="text-base">G</span>
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-[0.2em] text-[#5e6d64]">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#214c34]">
                  Full name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#214c34]">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      username: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Choose a username"
                />
                {form.username.trim() ? (
                  <p className="mt-1 text-xs text-[#5e6d64]">
                    {usernameStatus === "checking" && "Checking username..."}
                    {usernameStatus === "available" && "Username is available."}
                    {usernameStatus === "taken" && "Username is already taken."}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="deliveryCheckbox"
                  checked={isDelivery}
                  onChange={(e) => setIsDelivery(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#4C9E36] focus:ring-[#4C9E36]"
                />
                <label htmlFor="deliveryCheckbox" className="text-sm font-semibold text-[#214c34]">
                  Register as a Delivery Partner
                </label>
              </div>

              {isDelivery ? (
                <div className="space-y-4 rounded-xl border border-border bg-gray-50 p-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#214c34]">Vehicle (optional)</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="">Select a vehicle</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="car">Car</option>
                      <option value="van">Van</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#214c34]">NID Document Upload</label>
                    {!nidDocumentUrl ? (
                      <div className="rounded-xl border border-[#d9e5d5] bg-white p-3">
                        <UploadDropzone
                          endpoint="deliveryNidUploader"
                          onUploadError={(uploadError: Error) => setNidUploadError(uploadError.message)}
                          onClientUploadComplete={(res: any) => {
                            const url = res?.[0] ? resolveUploadedUrl(res[0]) : "";
                            if (url) {
                              setNidDocumentUrl(url);
                              setNidUploadError("");
                            } else {
                              setNidUploadError("Upload finished but URL was not returned.");
                            }
                          }}
                          appearance={{
                            button: "ut-ready:bg-[#214c34] ut-uploading:bg-[#214c34]/70 ut-label:text-white text-sm h-8",
                            container: "border-0 p-2",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        NID document uploaded.
                      </div>
                    )}
                    {nidUploadError ? <p className="mt-1 pl-1 text-xs font-medium text-red-500">{nidUploadError}</p> : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#214c34]">Educational Document Upload</label>
                    {!educationDocumentUrl ? (
                      <div className="rounded-xl border border-[#d9e5d5] bg-white p-3">
                        <UploadDropzone
                          endpoint="deliveryEducationUploader"
                          onUploadError={(uploadError: Error) => setEducationUploadError(uploadError.message)}
                          onClientUploadComplete={(res: any) => {
                            const url = res?.[0] ? resolveUploadedUrl(res[0]) : "";
                            if (url) {
                              setEducationDocumentUrl(url);
                              setEducationUploadError("");
                            } else {
                              setEducationUploadError("Upload finished but URL was not returned.");
                            }
                          }}
                          appearance={{
                            button: "ut-ready:bg-[#214c34] ut-uploading:bg-[#214c34]/70 ut-label:text-white text-sm h-8",
                            container: "border-0 p-2",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Educational document uploaded.
                      </div>
                    )}
                    {educationUploadError ? <p className="mt-1 pl-1 text-xs font-medium text-red-500">{educationUploadError}</p> : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#214c34]">CV Upload (PDF)</label>
                    {!cvDocumentUrl ? (
                      <div className="rounded-xl border border-[#d9e5d5] bg-white p-3">
                        <UploadDropzone
                          endpoint="deliveryCvUploader"
                          onUploadError={(uploadError: Error) => setCvUploadError(uploadError.message)}
                          onClientUploadComplete={(res: any) => {
                            const url = res?.[0] ? resolveUploadedUrl(res[0]) : "";
                            if (url) {
                              setCvDocumentUrl(url);
                              setCvUploadError("");
                            } else {
                              setCvUploadError("Upload finished but URL was not returned.");
                            }
                          }}
                          appearance={{
                            button: "ut-ready:bg-[#214c34] ut-uploading:bg-[#214c34]/70 ut-label:text-white text-sm h-8",
                            container: "border-0 p-2",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        CV uploaded.
                      </div>
                    )}
                    {cvUploadError ? <p className="mt-1 pl-1 text-xs font-medium text-red-500">{cvUploadError}</p> : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-[#214c34]">
              {isSignup ? "Email" : "Username or Email"}
            </label>
            <input
              type="text"
              value={form.email}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder={isSignup ? "you@example.com" : "Username or email"}
            />
          </div>

          {isSignup ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#214c34]">
                Phone number
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="01XXXXXXXXX"
              />
            </div>
          ) : null}

          {(!isSignup || !isDelivery) ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#214c34]">
                  Password
                </label>
                <PasswordInput
                  showStrength={isSignup}
                  value={form.password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      password: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="Enter your password"
                />
              </div>

              {isSignup ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#214c34]">
                      Confirm password
                    </label>
                    <PasswordInput
                      value={form.confirm}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          confirm: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      placeholder="Re-enter your password"
                    />
                    {form.confirm.length > 0 && form.password !== form.confirm ? (
                      <p className="mt-1 text-xs font-medium text-red-500 pl-1">Passwords do not match.</p>
                    ) : null}
                  </div>

                  {showPasswordBar ? (
                    <div className="rounded-2xl bg-[#f6faf4] px-4 py-3 text-xs text-[#58725f]">
                      <p>Password must include:</p>
                      <ul className="mt-2 space-y-1">
                        <li>{passwordChecks.length ? "✓" : "•"} At least 8 characters</li>
                        <li>{passwordChecks.upper ? "✓" : "•"} An uppercase letter</li>
                        <li>{passwordChecks.lower ? "✓" : "•"} A lowercase letter</li>
                        <li>{passwordChecks.number ? "✓" : "•"} A number</li>
                        <li>{passwordChecks.special ? "✓" : "•"} A special character</li>
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your password will be auto-generated and emailed to you upon admin approval.
            </div>
          )}

          {error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183625] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? isSignup
                ? "Creating account..."
                : "Logging in..."
              : isSignup
              ? "Create account"
              : "Sign in"}
          </button>
        </form>
        <div className="mt-4">
        <Link
          href="/vendor/apply"
          className="block w-full rounded-[1.25rem] bg-[#D4AF37] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          Register as a vendor
        </Link>
      </div>
        <p className="mt-5 text-center text-sm text-[#5e6d64]">
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-[#214c34] hover:underline"
          >
            {isSignup ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
}