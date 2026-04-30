"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";
import { UploadDropzone } from "@/lib/uploadthing";

export default function DeliverySignupForm() {
  const router = useRouter();
  const { register, loading } = useDeliveryAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "",
    profilePictureUrl: "",
    nidDocumentUrl: "",
    educationDocumentUrl: "",
    cvDocumentUrl: "",
  });
  const [error, setError] = useState("");
  const [profilePictureUploading, setProfilePictureUploading] = useState(false);
  const [profilePictureUploadError, setProfilePictureUploadError] = useState("");
  const [nidUploading, setNidUploading] = useState(false);
  const [nidUploadError, setNidUploadError] = useState("");
  const [educationUploading, setEducationUploading] = useState(false);
  const [educationUploadError, setEducationUploadError] = useState("");
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState("");
  const [deliveryVerifcationWaiting, setDeliveryVerifcationWaiting] = useState(false);
  function resolveUploadedUrl(file: {
    ufsUrl?: string;
    url?: string;
    appUrl?: string;
    serverData?: { fileUrl?: string };
  }) {
    return file.serverData?.fileUrl ?? file.ufsUrl ?? file.url ?? file.appUrl ?? "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.profilePictureUrl || !form.nidDocumentUrl || !form.educationDocumentUrl || !form.cvDocumentUrl) {
      const missing: string[] = [];
      if (!form.profilePictureUrl) missing.push("profile picture");
      if (!form.nidDocumentUrl) missing.push("NID document");
      if (!form.educationDocumentUrl) missing.push("education document");
      if (!form.cvDocumentUrl) missing.push("CV document");
      setError(`Please upload: ${missing.join(", ")}.`);
      return;
    }
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        vehicleType: form.vehicleType.trim() || undefined,
        profilePictureUrl: form.profilePictureUrl.trim(),
        nidDocumentUrl: form.nidDocumentUrl.trim(),
        educationDocumentUrl: form.educationDocumentUrl.trim(),
        cvDocumentUrl: form.cvDocumentUrl.trim(),
      });
      setDeliveryVerifcationWaiting(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register");
    }
  }

  return (deliveryVerifcationWaiting?<div>
    wait for verification
  </div>:( <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-[#d9e5d5] bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#163625]">Create partner account</h1>
          <p className="mt-2 text-sm font-medium text-[#163625]/60">
            Submit your profile for approval. Username and password are auto-generated and sent to your email after approval.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-[#d9e5d5] px-4 py-3 text-[#163625] outline-none focus:border-[#4C9E36] focus:ring-2 focus:ring-[#E4FCD5]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#163625]">Phone</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-[#d9e5d5] px-4 py-3 text-[#163625] outline-none focus:border-[#4C9E36] focus:ring-2 focus:ring-[#E4FCD5]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">Email</label>
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-[#d9e5d5] px-4 py-3 text-[#163625] outline-none focus:border-[#4C9E36] focus:ring-2 focus:ring-[#E4FCD5]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">Vehicle (optional)</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                className="w-full rounded-xl border border-[#d9e5d5] px-4 py-3 text-[#163625] outline-none focus:border-[#4C9E36] focus:ring-2 focus:ring-[#E4FCD5]"
              >
                <option value="">Select</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">Profile Picture Upload</label>
              {!form.profilePictureUrl ? (
                <div className="rounded-xl border border-[#d9e5d5] p-3">
                  <UploadDropzone
                    endpoint="deliveryProfilePictureUploader"
                    onUploadBegin={() => {
                      setProfilePictureUploading(true);
                      setProfilePictureUploadError("");
                    }}
                    onUploadError={(uploadError: Error) => {
                      setProfilePictureUploading(false);
                      setProfilePictureUploadError(uploadError.message);
                    }}
                    onClientUploadComplete={(
                      res: Array<{
                        ufsUrl?: string;
                        url?: string;
                        appUrl?: string;
                        serverData?: { fileUrl?: string };
                      }>,
                    ) => {
                      const first = res?.[0];
                      const uploadedUrl = first ? resolveUploadedUrl(first) : "";
                      if (uploadedUrl) {
                        setForm((f) => ({ ...f, profilePictureUrl: uploadedUrl }));
                        setProfilePictureUploadError("");
                        setProfilePictureUploading(false);
                      } else {
                        setProfilePictureUploadError("Upload finished but URL was not returned. Please try again.");
                        setProfilePictureUploading(false);
                      }
                    }}
                    appearance={{
                      button:
                        "ut-ready:bg-[#163625] ut-uploading:bg-[#163625]/70 ut-label:text-[#163625] ut-allowed-content:text-[#163625]/70",
                      container: "border-0",
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Profile picture uploaded successfully.{" "}
                  <a href={form.profilePictureUrl} target="_blank" rel="noreferrer" className="underline font-semibold">
                    View file
                  </a>
                </div>
              )}
              {profilePictureUploading ? (
                <p className="text-xs font-medium text-[#163625]/70">Uploading profile picture...</p>
              ) : null}
              {profilePictureUploadError ? (
                <p className="text-xs font-medium text-red-700">{profilePictureUploadError}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">NID Document Upload</label>
              {!form.nidDocumentUrl ? (
                <div className="rounded-xl border border-[#d9e5d5] p-3">
                  <UploadDropzone
                    endpoint="deliveryNidUploader"
                    onUploadBegin={() => {
                      setNidUploading(true);
                      setNidUploadError("");
                    }}
                    onUploadError={(uploadError: Error) => {
                      setNidUploading(false);
                      setNidUploadError(uploadError.message);
                    }}
                    onClientUploadComplete={(
                      res: Array<{
                        ufsUrl?: string;
                        url?: string;
                        appUrl?: string;
                        serverData?: { fileUrl?: string };
                      }>,
                    ) => {
                      const first = res?.[0];
                      const uploadedUrl = first ? resolveUploadedUrl(first) : "";
                      if (uploadedUrl) {
                        setForm((f) => ({ ...f, nidDocumentUrl: uploadedUrl }));
                        setNidUploadError("");
                        setNidUploading(false);
                      } else {
                        setNidUploadError("Upload finished but URL was not returned. Please try again.");
                        setNidUploading(false);
                      }
                    }}
                    appearance={{
                      button:
                        "ut-ready:bg-[#163625] ut-uploading:bg-[#163625]/70 ut-label:text-[#163625] ut-allowed-content:text-[#163625]/70",
                      container: "border-0",
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  NID document uploaded successfully.{" "}
                  <a href={form.nidDocumentUrl} target="_blank" rel="noreferrer" className="underline font-semibold">
                    View file
                  </a>
                </div>
              )}
              {nidUploading ? <p className="text-xs font-medium text-[#163625]/70">Uploading NID document...</p> : null}
              {nidUploadError ? <p className="text-xs font-medium text-red-700">{nidUploadError}</p> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">Educational Document Upload</label>
              {!form.educationDocumentUrl ? (
                <div className="rounded-xl border border-[#d9e5d5] p-3">
                  <UploadDropzone
                    endpoint="deliveryEducationUploader"
                    onUploadBegin={() => {
                      setEducationUploading(true);
                      setEducationUploadError("");
                    }}
                    onUploadError={(uploadError: Error) => {
                      setEducationUploading(false);
                      setEducationUploadError(uploadError.message);
                    }}
                    onClientUploadComplete={(
                      res: Array<{
                        ufsUrl?: string;
                        url?: string;
                        appUrl?: string;
                        serverData?: { fileUrl?: string };
                      }>,
                    ) => {
                      const first = res?.[0];
                      const uploadedUrl = first ? resolveUploadedUrl(first) : "";
                      if (uploadedUrl) {
                        setForm((f) => ({ ...f, educationDocumentUrl: uploadedUrl }));
                        setEducationUploadError("");
                        setEducationUploading(false);
                      } else {
                        setEducationUploadError("Upload finished but URL was not returned. Please try again.");
                        setEducationUploading(false);
                      }
                    }}
                    appearance={{
                      button:
                        "ut-ready:bg-[#163625] ut-uploading:bg-[#163625]/70 ut-label:text-[#163625] ut-allowed-content:text-[#163625]/70",
                      container: "border-0",
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Educational document uploaded successfully.{" "}
                  <a href={form.educationDocumentUrl} target="_blank" rel="noreferrer" className="underline font-semibold">
                    View file
                  </a>
                </div>
              )}
              {educationUploading ? (
                <p className="text-xs font-medium text-[#163625]/70">Uploading educational document...</p>
              ) : null}
              {educationUploadError ? (
                <p className="text-xs font-medium text-red-700">{educationUploadError}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">CV Upload (PDF)</label>
              {!form.cvDocumentUrl ? (
                <div className="rounded-xl border border-[#d9e5d5] p-3">
                  <UploadDropzone
                    endpoint="deliveryCvUploader"
                    onUploadBegin={() => {
                      setCvUploading(true);
                      setCvUploadError("");
                    }}
                    onUploadError={(uploadError: Error) => {
                      setCvUploading(false);
                      setCvUploadError(uploadError.message);
                    }}
                    onClientUploadComplete={(
                      res: Array<{
                        ufsUrl?: string;
                        url?: string;
                        appUrl?: string;
                        serverData?: { fileUrl?: string };
                      }>,
                    ) => {
                      const first = res?.[0];
                      const uploadedUrl = first ? resolveUploadedUrl(first) : "";
                      if (uploadedUrl) {
                        setForm((f) => ({ ...f, cvDocumentUrl: uploadedUrl }));
                        setCvUploadError("");
                        setCvUploading(false);
                      } else {
                        setCvUploadError("Upload finished but URL was not returned. Please try again.");
                        setCvUploading(false);
                      }
                    }}
                    appearance={{
                      button:
                        "ut-ready:bg-[#163625] ut-uploading:bg-[#163625]/70 ut-label:text-[#163625] ut-allowed-content:text-[#163625]/70",
                      container: "border-0",
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  CV uploaded successfully.{" "}
                  <a href={form.cvDocumentUrl} target="_blank" rel="noreferrer" className="underline font-semibold">
                    View file
                  </a>
                </div>
              )}
              {cvUploading ? <p className="text-xs font-medium text-[#163625]/70">Uploading CV...</p> : null}
              {cvUploadError ? (
                <p className="text-xs font-medium text-red-700">{cvUploadError}</p>
              ) : null}
            </div>
          </div>

          {!form.profilePictureUrl || !form.nidDocumentUrl || !form.educationDocumentUrl || !form.cvDocumentUrl ? (
            <p className="text-xs font-medium text-[#163625]/70">
              Upload profile picture, NID, education document, and CV to enable registration.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[#163625] py-3.5 text-base font-bold text-[#E4FCD5] transition hover:bg-[#0d2217] disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#163625]/70">
          Already have a partner account?{" "}
          <Link href="/delivery/login" className="font-bold text-[#163625] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>)
   
  );
}
