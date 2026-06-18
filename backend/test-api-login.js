const fetch = require('node-fetch'); // wait, node 24 has global fetch

async function main() {
  const apiBase = "http://localhost:4000";
  
  // Try to login with the testvendor created earlier
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "testvendor@meramot.com",
      password: "password123"
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

main().catch(console.error);
