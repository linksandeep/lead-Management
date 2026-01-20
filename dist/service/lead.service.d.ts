export declare const importLeadsFromGoogleSheetService: (sheetUrl: string) => Promise<{
    insertedCount: number;
    duplicateCount: number;
    duplicateLeads: {
        row: number;
        name: any;
        email: any;
        phone: any;
        reason: string;
    }[];
}>;
//# sourceMappingURL=lead.service.d.ts.map