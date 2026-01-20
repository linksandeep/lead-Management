import { Request, Response, NextFunction } from 'express';
import { CorsOptions } from 'cors';
export declare const errorHandler: (error: any, _req: Request, res: Response, _next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const createRateLimiter: (windowMs: number, max: number) => import("express-rate-limit").RateLimitRequestHandler;
export declare const corsOptions: CorsOptions;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const bodyParserErrorHandler: (error: any, _req: Request, res: Response, next: NextFunction) => void;
export declare const validateContentType: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (_req: Request, res: Response, next: NextFunction) => void;
export declare const healthCheck: (_req: Request, res: Response) => void;
//# sourceMappingURL=index.d.ts.map