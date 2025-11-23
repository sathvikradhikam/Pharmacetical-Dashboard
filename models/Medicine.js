const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['tablet', 'syrup', 'injection', 'cream', 'capsule', 'drops', 'powder', 'other']
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required']
  },
  strength: {
    type: String,
    required: [true, 'Strength is required']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required']
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    unique: true
  },
  manufacturingDate: {
    type: Date,
    required: [true, 'Manufacturing date is required']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(value) {
        return value > this.manufacturingDate;
      },
      message: 'Expiry date must be after manufacturing date'
    }
  },
  stock: {
    current: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    minimum: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock cannot be negative']
    },
    maximum: {
      type: Number,
      default: 1000,
      min: [1, 'Maximum stock must be at least 1']
    }
  },
  pricing: {
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: [0, 'MRP cannot be negative']
    }
  },
  description: {
    type: String,
    trim: true
  },
  sideEffects: [String],
  contraindications: [String],
  storageConditions: {
    type: String,
    default: 'Store in a cool, dry place'
  },
  prescriptionRequired: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  supplier: {
    name: String,
    contact: String,
    address: String
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

// Index for better search performance
medicineSchema.index({ name: 'text', genericName: 'text', brand: 'text' });
medicineSchema.index({ category: 1, isActive: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ 'stock.current': 1 });

// Virtual for stock status
medicineSchema.virtual('stockStatus').get(function() {
  if (this.stock.current <= 0) return 'out-of-stock';
  if (this.stock.current <= this.stock.minimum) return 'low-stock';
  return 'in-stock';
});

// Virtual for expiry status
medicineSchema.virtual('expiryStatus').get(function() {
  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(now.getMonth() + 6);
  
  if (this.expiryDate <= now) return 'expired';
  if (this.expiryDate <= sixMonthsFromNow) return 'expiring-soon';
  return 'valid';
});

// Pre-save middleware to update stock alerts
medicineSchema.pre('save', function(next) {
  if (this.stock.current < this.stock.minimum) {
    // You can implement notification logic here
    console.log(`⚠️  Low stock alert for ${this.name}: ${this.stock.current} remaining`);
  }
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);
