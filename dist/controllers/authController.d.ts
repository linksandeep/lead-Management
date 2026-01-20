import { Request, Response } from 'express';
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: Request, res: Response) => Promise<void>;
export declare const updateProfile: (req: Request, res: Response) => Promise<void>;
export declare const changePassword: (req: Request, res: Response) => Promise<void>;
export declare const logout: (_req: Request, res: Response) => Promise<void>;
export declare const dangerReset: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map