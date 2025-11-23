const mongoose = require('mongoose');

const medicineItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: false // Allow manual entry without medicine reference
  },
  medicineName: {
    type: String,
    required: [true, 'Medicine name is required']
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['once-daily', 'twice-daily', 'thrice-daily', 'four-times-daily', 'as-needed', 'other']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  instructions: {
    type: String,
    default: 'Take as directed by physician'
  }
});

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age seems unrealistic']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
    },
    address: {
      type: String,
      trim: true
    },
    patientId: {
      type: String,
      sparse: true // Allow multiple documents with null values
    }
  },
  doctor: {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    qualification: {
      type: String,
      trim: true
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    hospital: {
      type: String,
      trim: true
    },
    contact: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
    }
  },
  medicines: [medicineItemSchema],
  prescriptionDate: {
    type: Date,
    required: [true, 'Prescription date is required'],
    default: Date.now
  },
  diagnosis: {
    type: String,
    trim: true
  },
  symptoms: [String],
  vitalSigns: {
    bloodPressure: String,
    pulse: String,
    temperature: String,
    weight: String
  },
  allergies: [String],
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'dispensed', 'partially-dispensed', 'cancelled'],
    default: 'pending'
  },
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dispensedAt: {
    type: Date
  },
  scannedImage: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  },
  scanResult: {
    extractedText: String,
    confidence: Number,
    processingTime: Number
  },
  totalAmount: {
    type: Number,
    default: 0
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

// Generate prescription ID
prescriptionSchema.pre('save', async function(next) {
  if (!this.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), date.getDate()),
        $lt: new Date(year, date.getMonth(), date.getDate() + 1)
      }
    });
    
    this.prescriptionId = `RX${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Index for better search performance
prescriptionSchema.index({ 'patient.name': 'text', 'doctor.name': 'text' });
prescriptionSchema.index({ prescriptionDate: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ prescriptionId: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
