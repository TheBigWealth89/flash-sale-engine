import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    if (req.accepts("html")) {
      return res.redirect("/login");
    }
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string, role: string };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    res.clearCookie("token");
    if (req.accepts("html")) {
      return res.redirect("/login");
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireRole(role: string) {
  return function (req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user && req.user.role === role) {
      next();
    } else {
      if (req.accepts("html")) {
        return res.status(403).send("Forbidden: You do not have access to this resource.");
      }
      return res.status(403).json({ error: "Forbidden" });
    }
  };
}