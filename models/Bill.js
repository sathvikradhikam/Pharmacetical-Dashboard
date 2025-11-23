const mongoose = require('mongoose');

// Bill item schema (without medicine reference requirement)
const billItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine'
  },
  medicineName: {
    type: String,
    required: [true, 'Medicine name is required']
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 12, // 12% GST
    min: [0, 'Tax rate cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0
  }
});

// Main bill schema (without billNumber)
const billSchema = new mongoose.Schema({
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    address: {
      type: String,
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true
    }
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'net-banking', 'other'],
    required: [true, 'Payment method is required']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially-paid', 'refunded'],
    default: 'pending'
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: [0, 'Amount paid cannot be negative']
  },
  changeGiven: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'finalized', 'cancelled'],
    default: 'finalized'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-validate middleware to calculate item totals
billSchema.pre('validate', function(next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      if (item.quantity && item.unitPrice) {
        // Calculate total price for each item
        item.totalPrice = Math.round((item.quantity * item.unitPrice) * 100) / 100;
        
        // Calculate tax amount
        const taxableAmount = item.totalPrice - (item.discount || 0);
        item.taxAmount = Math.round((taxableAmount * (item.taxRate || 12)) / 100 * 100) / 100;
      }
    });
  }
  next();
});

// Pre-save middleware to calculate totals
billSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate totals from items
    this.subtotal = Math.round(this.items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;
    this.totalDiscount = Math.round(this.items.reduce((sum, item) => sum + (item.discount || 0), 0) * 100) / 100;
    this.totalTax = Math.round(this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0) * 100) / 100;
    this.grandTotal = Math.round((this.subtotal - this.totalDiscount + this.totalTax) * 100) / 100;
  }
  
  // Calculate change given for cash payments
  if (this.paymentMethod === 'cash' && this.amountPaid > this.grandTotal) {
    this.changeGiven = Math.round((this.amountPaid - this.grandTotal) * 100) / 100;
  } else {
    this.changeGiven = 0;
  }
  
  // Determine payment status based on amount paid
  if (this.amountPaid >= this.grandTotal) {
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partially-paid';
  } else {
    this.paymentStatus = 'pending';
  }
  
  next();
});

// Index for better search performance
billSchema.index({ 'customer.name': 'text', 'customer.phone': 1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ paymentStatus: 1 });
billSchema.index({ status: 1 });

// Virtual for bill reference (using MongoDB ObjectId as reference)
billSchema.virtual('billReference').get(function() {
  return `BILL-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Virtual for payment due
billSchema.virtual('amountDue').get(function() {
  return Math.max(0, this.grandTotal - this.amountPaid);
});

// Instance method to check if bill is fully paid
billSchema.methods.isFullyPaid = function() {
  return this.amountPaid >= this.grandTotal;
};

// Static method to find bills by payment status
billSchema.statics.findByPaymentStatus = function(status) {
  return this.find({ paymentStatus: status });
};

// Static method to get today's sales
billSchema.statics.getTodaysSales = function() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  return this.find({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
    status: 'finalized'
  });
};

module.exports = mongoose.model('Bill', billSchema);
