export const API = process.env.NEXT_PUBLIC_API_URL!;

export async function getShops() {
  const res = await fetch(`${API}/shops`);
  return await res.json();
}

export async function signup(data: any) {
  const res = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function login(data: any) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
