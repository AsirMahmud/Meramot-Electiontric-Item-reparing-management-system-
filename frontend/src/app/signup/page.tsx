"use client";
import { useState } from "react";

export default function Signup() {
  const [data, setData] = useState({ username: "", email: "", password: "", confirm: "" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-mint">
      <form className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h2 className="text-xl font-bold text-center">Create Account</h2>
        <input
          className="w-full border p-2 rounded"
          placeholder="Username"
          value={data.username}
        />
        <input
          className="w-full border p-2 rounded"
          type="email"
          placeholder="Email"
          value={data.email}
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="Password"
          value={data.password}
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="Confirm Password"
          value={data.confirm}
        />
        <button className="w-full bg-mintDark text-darkGrey py-2 rounded">
          Sign Up
        </button>
        <div className="text-center text-sm text-grey">or continue with</div>
        <button className="w-full bg-grey text-white py-2 rounded">
          Continue with Email
        </button>
      </form>
    </div>
  );
}
