"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getProfile, updateProfile, type Profile } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Partial<Profile>>({});

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  useEffect(() => {
    if (!token) return;
    getProfile(token).then((data) => { setProfile(data); setDraft(data); }).catch(() => setMessage("Could not load profile."));
  }, [token]);

  const firstName = useMemo(() => profile?.name?.trim()?.split(" ")[0] || (session?.user as { username?: string } | undefined)?.username?.trim()?.split(" ")[0] || "User", [profile, session]);

  if (status === "loading") return <main className="min-h-screen bg-[#E4FCD5] px-4 py-8"><div className="mx-auto max-w-4xl text-[#173726]">Loading profile...</div></main>;
  if (!session?.user) { router.push("/login"); return null; }

  return (
    <main className="min-h-screen bg-[#E4FCD5] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-[#214c34] hover:opacity-90">
            <Image src="/images/meramot.svg" alt="Meramot" width={150} height={48} className="h-10 w-auto object-contain" priority />
          </Link>
          <Link href="/" className="rounded-full border border-[#214c34] bg-white px-5 py-2 text-sm font-semibold text-[#214c34]">Back to home</Link>
        </div>

        <div className="rounded-[2rem] border border-[#d9e5d5] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Profile</p>
              <h1 className="mt-2 text-3xl font-bold text-[#173726]">Hi, {firstName}</h1>
              <p className="mt-2 text-sm text-[#5b7262]">Manage your customer details here.</p>
            </div>
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#d5ead8] text-3xl font-bold text-[#214c34]">{firstName.charAt(0).toUpperCase()}</div>
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
              <div key={key} className="rounded-3xl bg-[#f6faf4] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">{label}</p>
                {editing && !["username", "email"].includes(key) ? (
                  <input value={String(draft[key as keyof Profile] ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))} className="mt-2 w-full rounded-2xl border border-[#cfe0c6] px-4 py-3 text-base font-medium text-[#173726]" />
                ) : (
                  <p className="mt-2 text-base font-medium text-[#173726]">{String(profile?.[key as keyof Profile] ?? "Not provided")}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white">Edit profile</button>
            ) : (
              <>
                <button onClick={async () => {
                  if (!token) return;
                  try {
                    const updated = await updateProfile(token, draft);
                    setProfile(updated.user);
                    setDraft(updated.user);
                    setEditing(false);
                    setMessage("Profile updated.");
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Could not update profile.");
                  }
                }} className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white">Save changes</button>
                <button onClick={() => { setDraft(profile || {}); setEditing(false); }} className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]">Cancel</button>
              </>
            )}
            <Link href="/orders" className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]">My orders</Link>
          </div>
          {message && <p className="mt-4 text-sm text-[#214c34]">{message}</p>}
        </div>
      </div>
    </main>
  );
}
