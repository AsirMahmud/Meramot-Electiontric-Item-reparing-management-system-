async function main() {
  const res = await fetch('https://meramot-backend.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'test', password: 'test' })
  });
  console.log(res.status);
  console.log(await res.text());
}
main();
