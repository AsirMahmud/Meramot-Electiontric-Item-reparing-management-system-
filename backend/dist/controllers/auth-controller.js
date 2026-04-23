import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
function signToken(user) {
    return jwt.sign({
        sub: user.id,
        role: user.role,
        username: user.username,
        email: user.email,
    }, env.jwtSecret, { expiresIn: "7d" });
}
export async function signup(req, res) {
    try {
        const { name, username, email, phone, password } = req.body;
        if (!name || !username || !email || !phone || !password) {
            return res.status(400).json({
                message: "name, username, email, phone, and password are required",
            });
        }
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ username: username.trim() }, { email: email.trim() }],
            },
            select: { id: true },
        });
        if (existing) {
            return res.status(409).json({
                message: "Username or email already exists",
            });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                username: username.trim(),
                email: email.trim(),
                phone: phone.trim(),
                passwordHash,
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
                role: true,
            },
        });
        const token = signToken(user);
        return res.status(201).json({
            message: "Signup successful",
            token,
            user,
        });
    }
    catch (error) {
        console.error("signup error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function login(req, res) {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({
                message: "identifier and password are required",
            });
        }
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier.trim() }, { username: identifier.trim() }],
            },
        });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = signToken(user);
        return res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        console.error("login error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function adminDemoLogin(req, res) {
    try {
        if (env.nodeEnv === "production") {
            return res.status(403).json({
                message: "Demo admin login is disabled in production",
            });
        }
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({
                message: "identifier and password are required",
            });
        }
        const normalizedIdentifier = identifier.trim().toLowerCase();
        const expectedIdentifier = env.demoAdminIdentifier.trim().toLowerCase();
        if (normalizedIdentifier !== expectedIdentifier ||
            password !== env.demoAdminPassword) {
            return res.status(401).json({ message: "Invalid demo admin credentials" });
        }
        const demoUser = {
            id: "demo-admin-user",
            name: env.demoAdminName,
            username: "demo_admin",
            email: env.demoAdminIdentifier,
            phone: null,
            role: "ADMIN",
        };
        const token = signToken({
            id: demoUser.id,
            username: demoUser.username,
            email: demoUser.email,
            role: demoUser.role,
        });
        return res.json({
            message: "Demo admin login successful",
            token,
            user: demoUser,
        });
    }
    catch (error) {
        console.error("admin demo login error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function checkUsername(req, res) {
    try {
        const username = String(req.query.username || "").trim();
        if (!username) {
            return res.status(400).json({ message: "username is required" });
        }
        const existing = await prisma.user.findFirst({
            where: { username },
            select: { id: true },
        });
        return res.json({ available: !existing });
    }
    catch (error) {
        console.error("checkUsername error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function googleExchange(req, res) {
    try {
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }
        let user = await prisma.user.findFirst({
            where: { email: email.trim() },
        });
        if (!user) {
            const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
            let username = baseUsername;
            let counter = 1;
            while (await prisma.user.findFirst({
                where: { username },
                select: { id: true },
            })) {
                username = `${baseUsername}${counter++}`;
            }
            user = await prisma.user.create({
                data: {
                    name: name?.trim() || baseUsername,
                    username,
                    email: email.trim(),
                    phone: `temp-${Date.now()}`,
                    passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
                },
            });
        }
        const token = signToken(user);
        return res.json({
            message: "Google exchange successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        console.error("googleExchange error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
//# sourceMappingURL=auth-controller.js.map