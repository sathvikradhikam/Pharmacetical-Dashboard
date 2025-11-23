const express = require('express');
const Joi = require('joi');
const Medicine = require('../models/Medicine');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Validation schema
const medicineSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  genericName: Joi.string().max(200).optional(),
  brand: Joi.string().max(100).optional(),
  category: Joi.string().valid('tablet', 'syrup', 'injection', 'cream', 'capsule', 'drops', 'powder', 'other').required(),
  dosage: Joi.string().required(),
  strength: Joi.string().required(),
  manufacturer: Joi.string().required(),
  batchNumber: Joi.string().required(),
  manufacturingDate: Joi.date().required(),
  expiryDate: Joi.date().greater(Joi.ref('manufacturingDate')).required(),
  stock: Joi.object({
    current: Joi.number().min(0).required(),
    minimum: Joi.number().min(0).default(10),
    maximum: Joi.number().min(1).default(1000)
  }).required(),
  pricing: Joi.object({
    purchasePrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    mrp: Joi.number().min(0).required()
  }).required(),
  description: Joi.string().optional(),
  sideEffects: Joi.array().items(Joi.string()).optional(),
  contraindications: Joi.array().items(Joi.string()).optional(),
  storageConditions: Joi.string().optional(),
  prescriptionRequired: Joi.boolean().optional(),
  supplier: Joi.object({
    name: Joi.string().optional(),
    contact: Joi.string().optional(),
    address: Joi.string().optional()
  }).optional()
});

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      status = 'active',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = { isActive: status === 'active' };
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (category) {
      query.category = category;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const medicines = await Medicine.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username');

    const total = await Medicine.countDocuments(query);

    // Add virtual fields
    const medicinesWithStatus = medicines.map(medicine => ({
      ...medicine.toObject(),
      stockStatus: medicine.stockStatus,
      expiryStatus: medicine.expiryStatus
    }));

    res.status(200).json({
      status: 'success',
      data: {
        medicines: medicinesWithStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching medicines'
    });
  }
});

// @desc    Get single medicine
// @route   GET /api/medicines/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id)
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username');

    if (!medicine) {
      return res.status(404).json({
        status: 'error',
        message: 'Medicine not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        medicine: {
          ...medicine.toObject(),
          stockStatus: medicine.stockStatus,
          expiryStatus: medicine.expiryStatus
        }
      }
    });
  } catch (error) {
    console.error('Get medicine error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching medicine'
    });
  }
});

// @desc    Create medicine
// @route   POST /api/medicines
// @access  Private (Staff and above)
router.post('/', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    // Validate input
    const { error, value } = medicineSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    // Check if medicine with same batch number exists
    const existingMedicine = await Medicine.findOne({ 
      batchNumber: value.batchNumber 
    });

    if (existingMedicine) {
      return res.status(400).json({
        status: 'error',
        message: 'Medicine with this batch number already exists'
      });
    }

    // Create medicine
    const medicine = await Medicine.create({
      ...value,
      createdBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      message: 'Medicine created successfully',
      data: {
        medicine
      }
    });
  } catch (error) {
    console.error('Create medicine error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error creating medicine'
    });
  }
});

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private (Staff and above)
router.put('/:id', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    // Validate input
    const { error, value } = medicineSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        status: 'error',
        message: 'Medicine not found'
      });
    }

    // Check if batch number is being changed and if new batch number exists
    if (value.batchNumber !== medicine.batchNumber) {
      const existingMedicine = await Medicine.findOne({ 
        batchNumber: value.batchNumber,
        _id: { $ne: req.params.id }
      });

      if (existingMedicine) {
        return res.status(400).json({
          status: 'error',
          message: 'Medicine with this batch number already exists'
        });
      }
    }

    // Update medicine
    const updatedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      {
        ...value,
        updatedBy: req.user.id
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Medicine updated successfully',
      data: {
        medicine: updatedMedicine
      }
    });
  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating medicine'
    });
  }
});

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
// @access  Private (Pharmacist and above)
router.delete('/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        status: 'error',
        message: 'Medicine not found'
      });
    }

    // Soft delete
    medicine.isActive = false;
    medicine.updatedBy = req.user.id;
    await medicine.save();

    res.status(200).json({
      status: 'success',
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    console.error('Delete medicine error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deleting medicine'
    });
  }
});

// @desc    Get low stock medicines
// @route   GET /api/medicines/alerts/low-stock
// @access  Private
router.get('/alerts/low-stock', protect, async (req, res) => {
  try {
    const lowStockMedicines = await Medicine.find({
      isActive: true,
      $expr: { $lte: ['$stock.current', '$stock.minimum'] }
    }).sort({ 'stock.current': 1 });

    res.status(200).json({
      status: 'success',
      data: {
        medicines: lowStockMedicines,
        count: lowStockMedicines.length
      }
    });
  } catch (error) {
    console.error('Get low stock medicines error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching low stock medicines'
    });
  }
});

// @desc    Get expiring medicines
// @route   GET /api/medicines/alerts/expiring
// @access  Private
router.get('/alerts/expiring', protect, async (req, res) => {
  try {
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const expiringMedicines = await Medicine.find({
      isActive: true,
      expiryDate: { 
        $gte: new Date(),
        $lte: sixMonthsFromNow 
      }
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      status: 'success',
      data: {
        medicines: expiringMedicines,
        count: expiringMedicines.length
      }
    });
  } catch (error) {
    console.error('Get expiring medicines error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching expiring medicines'
    });
  }
});

// @desc    Update stock
// @route   PATCH /api/medicines/:id/stock
// @access  Private (Staff and above)
router.patch('/:id/stock', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    const { operation, quantity } = req.body;

    if (!['add', 'subtract', 'set'].includes(operation)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid operation. Use "add", "subtract", or "set"'
      });
    }

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity must be a positive number'
      });
    }

    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        status: 'error',
        message: 'Medicine not found'
      });
    }

    let newStock = medicine.stock.current;

    switch (operation) {
      case 'add':
        newStock += quantity;
        break;
      case 'subtract':
        newStock -= quantity;
        if (newStock < 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Insufficient stock'
          });
        }
        break;
      case 'set':
        newStock = quantity;
        break;
    }

    medicine.stock.current = newStock;
    medicine.updatedBy = req.user.id;
    await medicine.save();

    res.status(200).json({
      status: 'success',
      message: 'Stock updated successfully',
      data: {
        medicine: {
          ...medicine.toObject(),
          stockStatus: medicine.stockStatus
        }
      }
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating stock'
    });
  }
});

module.exports = router;
