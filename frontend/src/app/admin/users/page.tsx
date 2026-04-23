"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

type User = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (role) queryParams.append("role", role);
      if (status) queryParams.append("status", status);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?${queryParams.toString()}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [role, status]); // Re-fetch on filter change

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((user) => (user.id === id ? { ...user, status: newStatus } : user))
        );
      } else {
          const errData = await res.json();
          alert(errData.message || "Failed to update user status");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while updating the user's status.");
    }
  };

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Moderation</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">User Management</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Manage platform users, update roles, and suspend accounts.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-[#D7E2D2] px-4 py-3 text-[#244233] focus:border-[#1F4D2E] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E]"
            />
            <button type="submit" className="rounded-2xl bg-[#1F4D2E] px-6 py-3 font-semibold text-white transition hover:bg-[#183D24]">
                Search
            </button>
        </form>

        <div className="flex gap-4">
            <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-2xl border border-[#D7E2D2] bg-white px-4 py-3 text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
            >
                <option value="">All Roles</option>
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="DELIVERY">Delivery</option>
                <option value="ADMIN">Admin</option>
            </select>

            <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-2xl border border-[#D7E2D2] bg-white px-4 py-3 text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
            >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DELETED">Deleted</option>
            </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading users...</div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-[#D7E2D2] bg-[#E6F0E2]">
                <tr className="text-left text-sm uppercase tracking-[0.18em] text-[#5E7366]">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[#D7E2D2] last:border-b-0">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-[#1F4D2E]">{user.name || user.username}</p>
                      <p className="mt-1 text-sm text-[#6B7C72]">{user.email}</p>
                      <p className="text-sm text-[#6B7C72]">{user.phone || "No phone"}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-[#244233]">{user.role}</td>
                    <td className="px-6 py-5 text-sm">
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${
                          user.status === "ACTIVE"
                            ? "bg-[#E6F0E2] text-[#1F4D2E]"
                            : user.status === "SUSPENDED"
                              ? "bg-[#FEF3C7] text-[#92400E]"
                              : "bg-[#FDEAEA] text-[#8A2A2A]"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {user.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleStatusUpdate(user.id, "SUSPENDED")}
                          className="rounded-full border border-[#B8C8B5] px-4 py-2 text-sm font-semibold text-[#6A3F3F] transition hover:bg-[#F5ECEC]"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusUpdate(user.id, "ACTIVE")}
                          className="rounded-full bg-[#1F4D2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#183D24]"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!users.length && <div className="p-6 text-[#6B7C72]">No users found matching criteria.</div>}
        </div>
      )}
    </section>
  );
}
