"use client";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-mint shadow-md">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="Meramot logo" width={32} height={32} />
        <Link href="/" className="text-2xl font-bold text-darkGrey">
          Meramot
        </Link>
      </div>

      <div className="hidden md:flex gap-6 text-grey font-medium">
        <Link href="/courier">Courier Pickup</Link>
        <Link href="/repair">In-shop Repair</Link>
        <Link href="/parts">Spare Parts</Link>
      </div>

      <input
        className="border border-grey/50 rounded-md px-3 py-1 text-sm w-48 md:w-64"
        placeholder="Search for repairs"
      />
    </nav>
  );
}
