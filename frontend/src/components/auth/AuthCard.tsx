"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { checkUsername, signup } from "@/lib/api";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!form.name.trim()) throw new Error("Full name is required.");
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

        const loginResult = await signIn("credentials", {
          identifier: form.email.trim(),
          password: form.password,
          redirect: false,
        });

        if (loginResult?.error) {
          throw new Error("Signup worked, but automatic login failed.");
        }
      } else {
        if (!form.email.trim()) {
          throw new Error("Username or email is required.");
        }
        if (!form.password) {
          throw new Error("Password is required.");
        }

        const loginResult = await signIn("credentials", {
          identifier: form.email.trim(),
          password: form.password,
          redirect: false,
        });

        if (loginResult?.error) {
          throw new Error("Invalid credentials.");
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/" });
  }

  const showPasswordBar = isSignup && (passwordFocused || form.password.length > 0);

  return (
    <div className="w-full max-w-[440px]">
      <div className="rounded-[2rem] border border-white/60 bg-white/90 px-8 py-6 shadow-2xl backdrop-blur">
        <div className="mb-4 text-center">
          <div className="mb-3 flex justify-center">
            <Image
              src="/images/meramot.svg"
              alt="Meramot"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold leading-tight text-accent-dark">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Sign up to request repairs, compare shops, and save viewed items."
              : "Log in to continue to your customer dashboard."}
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <input
                className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
                placeholder="Full name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />

              <div>
                <input
                  className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
                  placeholder="Username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                />
                {usernameStatus === "checking" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checking username...
                  </p>
                )}
                {usernameStatus === "available" && (
                  <p className="mt-1 text-xs text-green-600">
                    Username is available.
                  </p>
                )}
                {usernameStatus === "taken" && (
                  <p className="mt-1 text-xs text-red-600">
                    Username already in use.
                  </p>
                )}
              </div>
            </>
          )}

          <input
            className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
            type={isSignup ? "email" : "text"}
            placeholder={isSignup ? "Email" : "Username or email"}
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />

          {isSignup && (
            <input
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          )}

          <input
            className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
            type="password"
            placeholder="Password"
            value={form.password}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
          />

          {showPasswordBar && (
            <div className="rounded-2xl border border-border bg-mint-50 px-3 py-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#d9e5d5]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${passwordBar.color}`}
                  style={{ width: passwordBar.width }}
                />
              </div>
            </div>
          )}

          {isSignup && (
            <input
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
              type="password"
              placeholder="Confirm password"
              value={form.confirm}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirm: event.target.value }))
              }
            />
          )}

          {error ? (
            <p className="text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-2xl bg-accent-dark py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full rounded-2xl border border-border bg-mint-50 py-2.5 text-sm font-semibold text-accent-dark shadow-sm"
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-accent-dark underline underline-offset-4"
          >
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </div>

      {isSignup && (
        <div className="mt-4">
          <Link
            href="/vendor/apply"
            className="block w-full rounded-[1.25rem] bg-[#D4AF37] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            Register as a vendor
          </Link>
        </div>
      )}
    </div>
  );
}