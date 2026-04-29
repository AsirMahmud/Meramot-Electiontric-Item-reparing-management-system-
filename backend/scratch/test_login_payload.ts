async function testLogin() {
  const res = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "mustahid000@gmail.com",
      password: "Mustahid123#"
    })
  });
  
  const data = await res.json();
  console.log("Login Response:", JSON.stringify(data, null, 2));
  
  if (data.token) {
    const parts = data.token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      console.log("Token Payload:", payload);
    }
  }
}

testLogin();
