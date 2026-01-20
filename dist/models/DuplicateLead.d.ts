import mongoose from 'mongoose';
declare const DuplicateLead: mongoose.Model<{
    reason: "EMAIL_EXISTS" | "PHONE_EXISTS" | "EMAIL_PHONE_EXISTS";
    originalData: any;
    importedAt: NativeDate;
    existingLeadId?: mongoose.Types.ObjectId | null;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    reason: "EMAIL_EXISTS" | "PHONE_EXISTS" | "EMAIL_PHONE_EXISTS";
    originalData: any;
    importedAt: NativeDate;
    existingLeadId?: mongoose.Types.ObjectId | null;
}, {}, mongoose.DefaultSchemaOptions> & {
    reason: "EMAIL_EXISTS" | "PHONE_EXISTS" | "EMAIL_PHONE_EXISTS";
    originalData: any;
    importedAt: NativeDate;
    existingLeadId?: mongoose.Types.ObjectId | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    reason: "EMAIL_EXISTS" | "PHONE_EXISTS" | "EMAIL_PHONE_EXISTS";
    originalData: any;
    importedAt: NativeDate;
    existingLeadId?: mongoose.Types.ObjectId | null;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    reason: "EMAIL_EXISTS" | "PHONE_EXISTS" | "EMAIL_PHONE_EXISTS";
    originalData: any;
    importedAt: NativeDate;
    existingLeadId?: mongoose.Types.ObjectId | null;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    reason: "EMAIL_EXISTS" | "PHONE_EXISTS" | "EMAIL_PHONE_EXISTS";
    originalData: any;
    importedAt: NativeDate;
    existingLeadId?: mongoose.Types.ObjectId | null;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export default DuplicateLead;
//# sourceMappingURL=DuplicateLead.d.ts.map