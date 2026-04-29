"use client";

import { MapPin } from "lucide-react";

type NavbarLocationButtonProps = {
  label: string;
  onClick: () => void;
};

export default function NavbarLocationButton({ label, onClick }: NavbarLocationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--accent-dark)] hover:bg-[var(--mint-50)]"
    >
      <MapPin size={18} className="shrink-0 text-[var(--accent-dark)]" />
      <span className="max-w-[260px] truncate">{label}</span>
    </button>
  );
}
