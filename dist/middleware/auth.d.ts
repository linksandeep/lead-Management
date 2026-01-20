import { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: 'admin' | 'user';
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => void;
export declare const generateToken: (payload: Omit<JwtPayload, "iat" | "exp">) => string;
export declare const verifyToken: (token: string) => JwtPayload | null;
//# sourceMappingURL=auth.d.ts.map