import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma";
import { env } from "../config/env";

function signToken(user: { id: string; username: string; email: string }) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

export async function signup(req: Request, res: Response) {
  try {
    const { name, username, email, phone, password } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

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
      },
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user,
    });
  } catch (error) {
    console.error("signup error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

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
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function checkUsername(req: Request, res: Response) {
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
  } catch (error) {
    console.error("checkUsername error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}