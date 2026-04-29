import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

const token = jwt.sign(
  {
    sub: "cmojtrgnp0000b2oo1aglfvjz", // admin user id from list_users.ts
    username: "mustahid000",
    email: "mustahid000@gmail.com",
    role: "ADMIN",
  },
  env.jwtSecret,
  { expiresIn: "7d" }
);

console.log(token);
process.exit(0);
