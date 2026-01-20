import mongoose, { Document } from 'mongoose';
export interface IStatus extends Document {
    name: string;
    isDefault: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IStatus, {}, {}, {}, mongoose.Document<unknown, {}, IStatus, {}, {}> & IStatus & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Status.d.ts.map