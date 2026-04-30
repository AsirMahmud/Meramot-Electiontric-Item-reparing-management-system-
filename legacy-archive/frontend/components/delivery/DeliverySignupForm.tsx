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
    nidDocumentUrl: "",
    educationDocumentUrl: "",
    cvDocumentUrl: "",
  });
  const [error, setError] = useState("");
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.nidDocumentUrl || !form.educationDocumentUrl || !form.cvDocumentUrl) {
      const missing: string[] = [];
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
        nidDocumentUrl: form.nidDocumentUrl.trim(),
        educationDocumentUrl: form.educationDocumentUrl.trim(),
        cvDocumentUrl: form.cvDocumentUrl.trim(),
      });
      router.replace("/delivery");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
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
              <label className="text-sm font-semibold text-[#163625]">NID Document Upload</label>
              {!form.nidDocumentUrl ? (
                <div className="rounded-xl border border-[#d9e5d5] p-3">
                  <UploadDropzone
                    endpoint="deliveryNidUploader"
                    onUploadError={(uploadError: Error) => {
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
                      } else {
                        setNidUploadError("Upload finished but URL was not returned. Please try again.");
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
                  NID document uploaded successfully.
                </div>
              )}
              {nidUploadError ? <p className="text-xs font-medium text-red-700">{nidUploadError}</p> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-[#163625]">Educational Document Upload</label>
              {!form.educationDocumentUrl ? (
                <div className="rounded-xl border border-[#d9e5d5] p-3">
                  <UploadDropzone
                    endpoint="deliveryEducationUploader"
                    onUploadError={(uploadError: Error) => {
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
                      } else {
                        setEducationUploadError("Upload finished but URL was not returned. Please try again.");
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
                  Educational document uploaded successfully.
                </div>
              )}
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
                    onUploadError={(uploadError: Error) => {
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
                      } else {
                        setCvUploadError("Upload finished but URL was not returned. Please try again.");
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
                  CV uploaded successfully.
                </div>
              )}
              {cvUploadError ? (
                <p className="text-xs font-medium text-red-700">{cvUploadError}</p>
              ) : null}
            </div>
          </div>

          {!form.nidDocumentUrl || !form.educationDocumentUrl || !form.cvDocumentUrl ? (
            <p className="text-xs font-medium text-[#163625]/70">
              Upload NID, education document, and CV to enable registration.
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
    </div>
  );
}
