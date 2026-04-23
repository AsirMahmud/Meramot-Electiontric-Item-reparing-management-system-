"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getProfile, updateProfile } from "@/lib/api";

type Profile = {
  id?: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Partial<Profile>>({});

  const token = (session?.user as { accessToken?: string } | undefined)
    ?.accessToken;

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then((data: any) => {
        const nextProfile = data?.user ?? data;
        setProfile(nextProfile);
        setDraft(nextProfile);
      })
      .catch(() => setMessage("Could not load profile."));
  }, [token]);

  const firstName = useMemo(() => {
    return (
      profile?.name?.trim()?.split(" ")[0] ||
      (session?.user as { username?: string } | undefined)?.username
        ?.trim()
        ?.split(" ")[0] ||
      "User"
    );
  }, [profile, session]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
        <div className="mx-auto max-w-4xl">Loading profile...</div>
      </main>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-[var(--accent-dark)] hover:opacity-90"
          >
            <Image
              src="/images/meramot.svg"
              alt="Meramot"
              width={150}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[var(--accent-dark)] bg-[var(--card)] px-5 py-2 text-sm font-semibold text-[var(--accent-dark)]"
          >
            Back to home
          </Link>
        </div>

        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">
                Hi, {firstName}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Manage your customer details here.
              </p>
            </div>

            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[var(--mint-100)] text-3xl font-bold text-[var(--accent-dark)]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Full name", "name"],
              ["Username", "username"],
              ["Email", "email"],
              ["Phone", "phone"],
              ["Address", "address"],
              ["City", "city"],
              ["Area", "area"],
            ].map(([label, key]) => (
              <div
                key={key}
                className="rounded-3xl border border-[var(--border)] bg-[var(--mint-50)] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {label}
                </p>

                {editing && !["username", "email"].includes(key) ? (
                  <input
                    value={String(draft[key as keyof Profile] ?? "")}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-base font-medium text-[var(--foreground)]"
                  />
                ) : (
                  <p className="mt-2 text-base font-medium text-[var(--foreground)]">
                    {String(profile?.[key as keyof Profile] ?? "Not provided")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white"
              >
                Edit profile
              </button>
            ) : (
              <>
                <button
                  onClick={async () => {
                    if (!token) return;

                    try {
                      const updated: any = await updateProfile(token, draft);
                      const nextProfile = updated?.user ?? updated;
                      setProfile(nextProfile);
                      setDraft(nextProfile);
                      setEditing(false);
                      setMessage("Profile updated.");
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Could not update profile."
                      );
                    }
                  }}
                  className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white"
                >
                  Save changes
                </button>

                <button
                  onClick={() => {
                    setDraft(profile || {});
                    setEditing(false);
                  }}
                  className="rounded-full border border-[var(--accent-dark)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--accent-dark)]"
                >
                  Cancel
                </button>
              </>
            )}

            <Link
              href="/orders"
              className="rounded-full border border-[var(--accent-dark)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--accent-dark)]"
            >
              My orders
            </Link>
          </div>

          {message && (
            <p className="mt-4 text-sm text-[var(--accent-dark)]">{message}</p>
          )}
        </div>
      </div>
    </main>
  );
}