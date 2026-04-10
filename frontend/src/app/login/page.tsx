"use client";
export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mint">
      <form className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h2 className="text-xl font-bold text-center">Login</h2>
        <input className="w-full border p-2 rounded" placeholder="Email" />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="Password"
        />
        <button className="w-full bg-mintDark text-darkGrey py-2 rounded">
          Log In
        </button>
        <div className="text-center text-sm text-grey">or continue with</div>
        <button className="w-full bg-grey text-white py-2 rounded">
          Continue with Email
        </button>
      </form>
    </div>
  );
}
