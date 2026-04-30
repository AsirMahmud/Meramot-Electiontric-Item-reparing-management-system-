async function test() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW9qdHJnbnAwMDAwYjJvbzFhZ2xmdmp6IiwidXNlcm5hbWUiOiJtdXN0YWhpZDAwMCIsImVtYWlsIjoibXVzdGFoaWQwMDBAZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzc3NDU2NTI2LCJleHAiOjE3NzgwNjEzMjZ9.J89lIcCsyQ-Qe3lAo9cE6KcgqM7EZyXQDo_Uk0FaYXc";
  
  try {
    const res = await fetch("http://localhost:4000/api/payments/admin/list", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
