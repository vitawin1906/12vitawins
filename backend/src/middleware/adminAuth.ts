import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as storage from "#storage/usersStorage"; // ✅ добавляем правильный импорт

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
      };
    }
  }
}

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log("Admin auth middleware called:", req.method, req.path);

  try {
    const token =
        req.cookies?.adminToken ||
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies?.authToken;

    if (!token) {
      console.log("Admin auth middleware – no token provided");
      return res.status(401).json({ error: "Authentication failed: no token" });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("Decoded token:", decoded);

    // 🔹 1. Проверяем токен типа admin
    if (decoded.type === "admin" && decoded.adminId) {
      const adminUser = await storage.usersStorage.getUserById(decoded.adminId);
      if (adminUser && adminUser.isAdmin) {
        req.admin = { id: String(adminUser.id), email: adminUser.email ?? "unknown" };
        console.log("✅ Authenticated as admin:", req.admin.email);
        return next();
      }
    }

    // 🔹 2. Проверяем Telegram-админа
    if (decoded.telegramId && decoded.telegramId === 131632979) {
      const adminUser = await storage.usersStorage.getUserByEmail("dorosh21@gmail.com");
      if (adminUser && adminUser.isAdmin) {
        req.admin = { id: String(adminUser.id), email: adminUser.email ?? "unknown" };
        console.log("✅ Authenticated as Telegram admin:", req.admin.email);
        return next();
      }
    }

    console.log("❌ Admin auth middleware – no valid admin found");
    return res.status(401).json({ error: "Admin authentication required" });
  } catch (err: any) {
    console.error("Admin auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}
