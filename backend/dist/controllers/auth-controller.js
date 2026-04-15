import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
function signToken(user) {
    return jwt.sign({
        sub: user.id,
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
        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ username: cleanUsername }, { email: cleanEmail }],
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
                username: cleanUsername,
                email: cleanEmail,
                phone: phone.trim(),
                passwordHash,
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
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
        const cleanIdentifier = identifier.trim();
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: cleanIdentifier.toLowerCase() }, { username: cleanIdentifier }],
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
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("login error:", error);
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
//# sourceMappingURL=auth-controller.js.map