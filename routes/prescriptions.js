const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/prescriptions/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation schema
const prescriptionSchema = Joi.object({
  patient: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    age: Joi.number().min(0).max(150).optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    address: Joi.string().optional(),
    patientId: Joi.string().optional()
  }).required(),
  doctor: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    qualification: Joi.string().optional(),
    registrationNumber: Joi.string().optional(),
    hospital: Joi.string().optional(),
    contact: Joi.string().pattern(/^[6-9]\d{9}$/).optional()
  }).required(),
  medicines: Joi.array().items(
    Joi.object({
      medicineName: Joi.string().required(),
      dosage: Joi.string().required(),
      frequency: Joi.string().valid('once-daily', 'twice-daily', 'thrice-daily', 'four-times-daily', 'as-needed', 'other').required(),
      duration: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      instructions: Joi.string().optional()
    })
  ).min(1).required(),
  prescriptionDate: Joi.date().optional(),
  diagnosis: Joi.string().optional(),
  symptoms: Joi.array().items(Joi.string()).optional(),
  vitalSigns: Joi.object({
    bloodPressure: Joi.string().optional(),
    pulse: Joi.string().optional(),
    temperature: Joi.string().optional(),
    weight: Joi.string().optional()
  }).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional()
});

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      startDate = '',
      endDate = '',
      sortBy = 'prescriptionDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { 'patient.name': { $regex: search, $options: 'i' } },
        { 'doctor.name': { $regex: search, $options: 'i' } },
        { prescriptionId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.prescriptionDate = {};
      if (startDate) query.prescriptionDate.$gte = new Date(startDate);
      if (endDate) query.prescriptionDate.$lte = new Date(endDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const prescriptions = await Prescription.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'fullName username')
      .populate('dispensedBy', 'fullName username');

    const total = await Prescription.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        prescriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching prescriptions'
    });
  }
});

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('createdBy', 'fullName username')
      .populate('dispensedBy', 'fullName username')
      .populate('medicines.medicine', 'name brand category pricing');

    if (!prescription) {
      return res.status(404).json({
        status: 'error',
        message: 'Prescription not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        prescription
      }
    });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching prescription'
    });
  }
});

// @desc    Create prescription
// @route   POST /api/prescriptions
// @access  Private (Staff and above)
router.post('/', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    // Validate input
    const { error, value } = prescriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Try to match medicines with inventory
    const medicinesWithReferences = await Promise.all(
      value.medicines.map(async (med) => {
        const medicine = await Medicine.findOne({
          name: { $regex: med.medicineName, $options: 'i' },
          isActive: true
        });

        return {
          ...med,
          medicine: medicine ? medicine._id : null
        };
      })
    );

    // Create prescription
    const prescription = await Prescription.create({
      ...value,
      medicines: medicinesWithReferences,
      createdBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      message: 'Prescription created successfully',
      data: {
        prescription
      }
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error creating prescription'
    });
  }
});

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private (Staff and above)
router.put('/:id', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        status: 'error',
        message: 'Prescription not found'
      });
    }

    // Validate input
    const { error, value } = prescriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Try to match medicines with inventory
    const medicinesWithReferences = await Promise.all(
      value.medicines.map(async (med) => {
        const medicine = await Medicine.findOne({
          name: { $regex: med.medicineName, $options: 'i' },
          isActive: true
        });

        return {
          ...med,
          medicine: medicine ? medicine._id : null
        };
      })
    );

    // Update prescription
    const updatedPrescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        ...value,
        medicines: medicinesWithReferences,
        updatedBy: req.user.id
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Prescription updated successfully',
      data: {
        prescription: updatedPrescription
      }
    });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating prescription'
    });
  }
});

// @desc    Delete prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Pharmacist and above)
router.delete('/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        status: 'error',
        message: 'Prescription not found'
      });
    }

    await Prescription.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deleting prescription'
    });
  }
});

// @desc    Upload and scan prescription image
// @route   POST /api/prescriptions/scan
// @access  Private (Staff and above)
router.post('/scan', protect, authorize('staff', 'pharmacist', 'admin'), upload.single('prescription'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload an image file'
      });
    }

    const startTime = Date.now();

    // Perform OCR on the uploaded image
    const { data: { text, confidence } } = await Tesseract.recognize(
      req.file.path,
      process.env.TESSERACT_LANG || 'eng',
      {
        logger: m => console.log(m)
      }
    );

    const processingTime = Date.now() - startTime;

    // Save scan result
    const scanResult = {
      extractedText: text,
      confidence: Math.round(confidence),
      processingTime
    };

    res.status(200).json({
      status: 'success',
      message: 'Prescription scanned successfully',
      data: {
        scanResult,
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      }
    });
  } catch (error) {
    console.error('Scan prescription error:', error);
    
    // Delete uploaded file if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error scanning prescription'
    });
  }
});

// @desc    Update prescription status
// @route   PATCH /api/prescriptions/:id/status
// @access  Private (Staff and above)
router.patch('/:id/status', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'dispensed', 'partially-dispensed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status'
      });
    }

    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        status: 'error',
        message: 'Prescription not found'
      });
    }

    prescription.status = status;
    prescription.updatedBy = req.user.id;

    if (status === 'dispensed' || status === 'partially-dispensed') {
      prescription.dispensedBy = req.user.id;
      prescription.dispensedAt = new Date();
    }

    await prescription.save();

    res.status(200).json({
      status: 'success',
      message: 'Prescription status updated successfully',
      data: {
        prescription
      }
    });
  } catch (error) {
    console.error('Update prescription status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating prescription status'
    });
  }
});

module.exports = router;
