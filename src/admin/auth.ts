import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'telegram-bot-admin-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

export interface TokenPayload {
  adminId: number;
  username: string;
  role: 'admin' | 'superadmin';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  admin?: TokenPayload;
}

export function generateToken(adminId: number, username: string, role: 'admin' | 'superadmin'): string {
  console.log(`🔑 [Auth] Generating token for admin: ${username} (ID: ${adminId})`);
  
  const payload: TokenPayload = {
    adminId,
    username,
    role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  console.log(`✅ [Auth] Token generated for: ${username}`);
  
  return token;
}

export function generateRefreshToken(adminId: number, username: string, role: 'admin' | 'superadmin'): string {
  console.log(`🔄 [Auth] Generating refresh token for admin: ${username}`);
  
  const payload: TokenPayload = {
    adminId,
    username,
    role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  console.log(`✅ [Auth] Refresh token generated for: ${username}`);
  
  return token;
}

export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  console.log(`🔍 [Auth] Verifying token for: ${req.method} ${req.path}`);
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('❌ [Auth] No authorization header provided');
    res.status(401).json({ error: 'No authorization header provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('❌ [Auth] Invalid authorization format');
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    console.log(`✅ [Auth] Token verified for admin: ${decoded.username} (ID: ${decoded.adminId})`);
    
    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('❌ [Auth] Token expired');
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ [Auth] Invalid token');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    console.error('❌ [Auth] Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
}

export function refreshToken(token: string): { success: boolean; newToken?: string; error?: string } {
  console.log('🔄 [Auth] Attempting to refresh token');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as TokenPayload;
    
    const tokenExp = decoded.exp || 0;
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    
    if (now - tokenExp > sevenDaysInSeconds) {
      console.log('❌ [Auth] Token too old to refresh');
      return { success: false, error: 'Token too old to refresh. Please login again.' };
    }

    const newToken = generateToken(decoded.adminId, decoded.username, decoded.role);
    console.log(`✅ [Auth] Token refreshed for: ${decoded.username}`);
    
    return { success: true, newToken };
  } catch (error) {
    console.error('❌ [Auth] Token refresh error:', error);
    return { success: false, error: 'Failed to refresh token' };
  }
}

export function requireRole(...allowedRoles: ('admin' | 'superadmin')[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      console.log('❌ [Auth] No admin in request for role check');
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.admin.role)) {
      console.log(`❌ [Auth] Role ${req.admin.role} not in allowed roles: ${allowedRoles.join(', ')}`);
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    console.log(`✅ [Auth] Role check passed: ${req.admin.role}`);
    next();
  };
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}
