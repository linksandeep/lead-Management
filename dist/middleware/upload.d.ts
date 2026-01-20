import { Request, Response, NextFunction } from 'express';
export declare const uploadExcel: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const handleUploadError: (err: any, _req: Request, res: Response, next: NextFunction) => void;
export declare const validateFilePresence: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=upload.d.ts.map