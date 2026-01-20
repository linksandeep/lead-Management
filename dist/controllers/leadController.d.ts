import { Request, Response } from 'express';
export declare const getLeads: (req: Request, res: Response) => Promise<void>;
export declare const getLeadById: (req: Request, res: Response) => Promise<void>;
export declare const createLead: (req: Request, res: Response) => Promise<void>;
export declare const updateLead: (req: Request, res: Response) => Promise<void>;
export declare const deleteLead: (req: Request, res: Response) => Promise<void>;
export declare const assignLeads: (req: Request, res: Response) => Promise<void>;
export declare const unassignLeads: (req: Request, res: Response) => Promise<void>;
export declare const bulkUpdateStatus: (req: Request, res: Response) => Promise<void>;
export declare const addNote: (req: Request, res: Response) => Promise<void>;
export declare const getMyLeads: (req: Request, res: Response) => Promise<void>;
export declare const getDistinctFolders: (req: Request, res: Response) => Promise<void>;
export declare const getMyLeadsStats: (req: Request, res: Response) => Promise<void>;
export declare const getFolderCounts: (req: Request, res: Response) => Promise<void>;
export declare const importLeadsFromGoogleSheet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=leadController.d.ts.map