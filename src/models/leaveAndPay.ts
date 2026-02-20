// models/Salary.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISalary extends Document {
  user: mongoose.Types.ObjectId;
  employeeId: string;
  ctc: {
    annual: number;
    breakup: {
      basic: number;
      hra: number;
      conveyance: number;
      medical: number;
      special: number;
      bonus: number;
      gratuity: number;
      pf: number;
      insurance: number;
      otherAllowances?: {
        name: string;
        amount: number;
      }[];
    };
  };
  inHand: {
    monthly: number;
    annual: number;
    breakup: {
      basic: number;
      hra: number;
      conveyance: number;
      medical: number;
      special: number;
      bonus: number;
    };
  };
  deductions: {
    pf: number;
    professionalTax: number;
    incomeTax: number;
    insurance: number;
    otherDeductions?: {
      name: string;
      amount: number;
    }[];
  };
  effectiveDate: Date;
  updatedBy?: mongoose.Types.ObjectId;
  revisionHistory: {
    _id?: mongoose.Types.ObjectId;
    oldCTC: number;
    newCTC: number;
    effectiveDate: Date;
    reason: string;
    updatedBy: mongoose.Types.ObjectId;
    updatedAt: Date;
  }[];
  isActive: boolean;
}

export interface ILeavePolicy extends Document {
  title: string;
  description: string;
  leaveType: 'Sick' | 'Casual' | 'Paid' | 'Unpaid' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Marriage';
  gender?: 'Male' | 'Female' | 'All';
  daysPerYear: number;
  isCarryForward: boolean;
  maxCarryForward?: number;
  isEncashable: boolean;
  applicableTo: ('full-time' | 'part-time' | 'contract' | 'probation' | 'intern' | 'trainee')[];
  minServiceDays?: number; // Minimum service days before eligibility
  proRated: boolean; // Whether leave is pro-rated for mid-year joiners
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeLeaveBalance extends Document {
  user: mongoose.Types.ObjectId;
  employeeId: string;
  year: number;
  balances: {
    leaveType: 'Sick' | 'Casual' | 'Paid' | 'Unpaid' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Marriage';
    allocated: number;
    used: number;
    pending: number;
    remaining: number;
    carriedForward?: number;
    expired?: number;
  }[];
  lastUpdated: Date;
}

export interface IHolidayPolicy extends Document {
  year: number;
  holidays: {
    name: string;
    date: Date;
    type: 'Public' | 'Company-Event' | 'Optional';
    optionalFor?: ('full-time' | 'part-time' | 'contract' | 'probation' | 'intern' | 'trainee')[];
  }[];
  flexibleHolidays?: number; // Number of flexible holidays employee can choose
  createdAt: Date;
  updatedAt: Date;
}

// Salary Schema
const salarySchema = new Schema<ISalary>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  employeeId: { 
    type: String, 
    required: true,
    index: true 
  },
  ctc: {
    annual: { type: Number, required: true },
    breakup: {
      basic: { type: Number, required: true },
      hra: { type: Number, required: true },
      conveyance: { type: Number, required: true },
      medical: { type: Number, required: true },
      special: { type: Number, required: true },
      bonus: { type: Number, required: true },
      gratuity: { type: Number, required: true },
      pf: { type: Number, required: true },
      insurance: { type: Number, required: true },
      otherAllowances: [{
        name: { type: String },
        amount: { type: Number }
      }]
    }
  },
  inHand: {
    monthly: { type: Number, required: true },
    annual: { type: Number, required: true },
    breakup: {
      basic: { type: Number, required: true },
      hra: { type: Number, required: true },
      conveyance: { type: Number, required: true },
      medical: { type: Number, required: true },
      special: { type: Number, required: true },
      bonus: { type: Number, required: true }
    }
  },
  deductions: {
    pf: { type: Number, required: true },
    professionalTax: { type: Number, required: true },
    incomeTax: { type: Number, required: true },
    insurance: { type: Number, required: true },
    otherDeductions: [{
      name: { type: String },
      amount: { type: Number }
    }]
  },
  effectiveDate: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  updatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  revisionHistory: [{
    oldCTC: { type: Number, required: true },
    newCTC: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    reason: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now }
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// Leave Policy Schema
const leavePolicySchema = new Schema<ILeavePolicy>({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  leaveType: { 
    type: String, 
    enum: ['Sick', 'Casual', 'Paid', 'Unpaid', 'Maternity', 'Paternity', 'Bereavement', 'Marriage'],
    required: true,
    unique: true 
  },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'All'],
    default: 'All'
  },
  daysPerYear: { 
    type: Number, 
    required: true,
    min: 0 
  },
  isCarryForward: { 
    type: Boolean, 
    default: false 
  },
  maxCarryForward: { 
    type: Number,
    min: 0 
  },
  isEncashable: { 
    type: Boolean, 
    default: false 
  },
  applicableTo: [{
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'probation', 'intern', 'trainee']
  }],
  minServiceDays: { 
    type: Number,
    default: 0 
  },
  proRated: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// Employee Leave Balance Schema
const employeeLeaveBalanceSchema = new Schema<IEmployeeLeaveBalance>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeId: { 
    type: String, 
    required: true 
  },
  year: { 
    type: Number, 
    required: true 
  },
  balances: [{
    leaveType: { 
      type: String, 
      enum: ['Sick', 'Casual', 'Paid', 'Unpaid', 'Maternity', 'Paternity', 'Bereavement', 'Marriage'],
      required: true 
    },
    allocated: { 
      type: Number, 
      required: true,
      default: 0 
    },
    used: { 
      type: Number, 
      required: true,
      default: 0 
    },
    pending: { 
      type: Number, 
      required: true,
      default: 0 
    },
    remaining: { 
      type: Number, 
      required: true 
    },
    carriedForward: { 
      type: Number,
      default: 0 
    },
    expired: { 
      type: Number,
      default: 0 
    }
  }],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Compound index to ensure one record per user per year
employeeLeaveBalanceSchema.index({ user: 1, year: 1 }, { unique: true });

// Holiday Policy Schema
const holidayPolicySchema = new Schema<IHolidayPolicy>({
  year: { 
    type: Number, 
    required: true,
    unique: true 
  },
  holidays: [{
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { 
      type: String, 
      enum: ['Public', 'Company-Event', 'Optional'],
      required: true 
    },
    optionalFor: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'probation', 'intern', 'trainee']
    }]
  }],
  flexibleHolidays: { 
    type: Number,
    default: 0 
  }
}, { timestamps: true });

// Indexes
salarySchema.index({ employeeId: 1 });
salarySchema.index({ user: 1 });
salarySchema.index({ isActive: 1 });

// Methods for salary
salarySchema.methods.calculateMonthlyInHand = function(): number {
  return this.inHand.monthly;
};

salarySchema.methods.getTaxBreakup = function(): any {
  // Calculate tax breakup based on Indian tax slabs
  const annualIncome = this.inHand.annual;
  let tax = 0;
  
  // Simplified tax calculation (you can make this more complex)
  if (annualIncome > 1000000) {
    tax = (annualIncome - 1000000) * 0.3 + 125000;
  } else if (annualIncome > 500000) {
    tax = (annualIncome - 500000) * 0.2 + 12500;
  } else if (annualIncome > 250000) {
    tax = (annualIncome - 250000) * 0.05;
  }
  
  return {
    annualIncome,
    taxableIncome: annualIncome,
    taxAmount: tax,
    cess: tax * 0.04,
    totalTax: tax * 1.04
  };
};

// Export models
export const Salary = mongoose.model<ISalary>('Salary', salarySchema);
export const LeavePolicy = mongoose.model<ILeavePolicy>('LeavePolicy', leavePolicySchema);
export const EmployeeLeaveBalance = mongoose.model<IEmployeeLeaveBalance>('EmployeeLeaveBalance', employeeLeaveBalanceSchema);
export const HolidayPolicy = mongoose.model<IHolidayPolicy>('HolidayPolicy', holidayPolicySchema);