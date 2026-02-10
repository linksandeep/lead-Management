import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  user: mongoose.Types.ObjectId;
  date: string; // Format: YYYY-MM-DD for easy querying
  checkIn: Date;
  checkOut?: Date;
  workHours: number;
  location: {
    lat: number;
    lng: number;
  };
  status: 'Present' | 'Late' | 'Half-day';
}

const attendanceSchema = new Schema<IAttendance>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date },
  workHours: { type: Number, default: 0 },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: { type: String, enum: ['Present', 'Late', 'Half-day'], default: 'Present' }
}, { timestamps: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);