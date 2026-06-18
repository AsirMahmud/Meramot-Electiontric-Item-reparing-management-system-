import { useState } from "react";
import { sendVerificationOtp, verifyOtp } from "@/lib/api";
import { X, CheckCircle, ShieldCheck } from "lucide-react";

type Props = {
  token: string;
  channel: "email" | "phone";
  contactValue: string;
  isVerified: boolean;
  onVerified: () => void;
};

export default function VerificationSection({ token, channel, contactValue, isVerified, onVerified }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError("");
    setMessage("");
    setShowOtpInput(false);
    setOtp("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await sendVerificationOtp(token, channel);
      setMessage(res.message || "OTP sent successfully.");
      setShowOtpInput(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError("Please enter OTP.");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await verifyOtp(token, channel, otp);
      setMessage(res.message || "Verified successfully.");
      setShowOtpInput(false);
      onVerified();
      setTimeout(() => handleCloseModal(), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isVerified ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {isVerified ? <CheckCircle size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">{channel === "email" ? "Email" : "Phone"}</p>
              <p className="text-sm font-medium text-slate-800">{contactValue}</p>
            </div>
          </div>
          {isVerified ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Verified
            </span>
          ) : (
            <button
              onClick={handleOpenModal}
              className="rounded-lg bg-accent-dark px-4 py-2 text-xs font-semibold text-white hover:bg-accent-dark/90 shadow-sm"
            >
              Verify {channel === "email" ? "Email" : "Phone"}
            </button>
          )}
        </div>
      </div>

      {isModalOpen && !isVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl relative">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="bg-gradient-to-br from-mint-300 to-mint-100 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-accent-dark shadow-sm mb-3">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-accent-dark">Verify your {channel}</h3>
              <p className="mt-1 text-sm text-slate-700">We'll send a code to <span className="font-semibold">{contactValue}</span></p>
            </div>
            
            <div className="p-6">
              {!showOtpInput ? (
                <div className="text-center">
                  <p className="mb-6 text-sm text-slate-600">Click the button below to receive your one-time password (OTP).</p>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full rounded-2xl bg-accent-dark py-3 text-sm font-semibold text-white transition hover:bg-accent-dark/90 disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send Verification Code"}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-sm text-slate-600 text-center">Enter the OTP sent to your {channel}</p>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.25em] outline-none focus:border-accent-dark mb-4"
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || !otp}
                    className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                  <button 
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="mt-4 w-full text-center text-xs font-medium text-slate-500 hover:text-accent-dark"
                  >
                    Didn't receive the code? Resend
                  </button>
                </div>
              )}

              {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-600">{message}</p>}
              {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
