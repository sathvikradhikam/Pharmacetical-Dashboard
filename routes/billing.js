const express = require('express');
const Joi = require('joi');
const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Validation schema (without billNumber)
const billSchema = Joi.object({
  customer: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().optional(),
    gstNumber: Joi.string().optional()
  }).required(),
  items: Joi.array().items(
    Joi.object({
      medicineName: Joi.string().required(),
      batchNumber: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      discount: Joi.number().min(0).optional(),
      taxRate: Joi.number().min(0).optional()
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'net-banking', 'other').required(),
  amountPaid: Joi.number().min(0).optional(),
  prescription: Joi.string().optional(),
  notes: Joi.string().optional()
});

// @desc    Get all bills
// @route   GET /api/billing
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      paymentStatus = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const bills = await Bill.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'fullName username')
      .populate('prescription', 'prescriptionId');

    const total = await Bill.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        bills,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching bills'
    });
  }
});

// @desc    Create bill
// @route   POST /api/billing
// @access  Private (Staff and above)
router.post('/', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    console.log('Received bill data:', req.body);

    // Validate input
    const { error, value } = billSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }

    const { customer, items, paymentMethod, amountPaid = 0, prescription, notes } = value;

    // Process items and check stock
    const processedItems = [];
    
    for (const item of items) {
      // Try to find medicine in inventory
      const medicine = await Medicine.findOne({
        $or: [
          { name: { $regex: new RegExp(item.medicineName, 'i') } },
          { genericName: { $regex: new RegExp(item.medicineName, 'i') } }
        ],
        batchNumber: item.batchNumber,
        isActive: true
      });

      // Check stock if medicine exists
      if (medicine && medicine.stock.current < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for ${item.medicineName}. Available: ${medicine.stock.current}, Required: ${item.quantity}`
        });
      }

      // Add to processed items
      processedItems.push({
        medicine: medicine ? medicine._id : null,
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: item.taxRate || 12
      });

      // Update stock if medicine exists
      if (medicine) {
        medicine.stock.current -= item.quantity;
        medicine.updatedBy = req.user.id;
        await medicine.save();
      }
    }

    // Create bill (totals will be calculated automatically by pre-save middleware)
    const billData = {
      customer,
      items: processedItems,
      paymentMethod,
      amountPaid,
      prescription: prescription || undefined,
      notes: notes || undefined,
      createdBy: req.user.id
    };

    const bill = await Bill.create(billData);

    // Update prescription status if linked
    if (prescription) {
      await Prescription.findByIdAndUpdate(
        prescription,
        {
          status: 'dispensed',
          dispensedBy: req.user.id,
          dispensedAt: new Date(),
          updatedBy: req.user.id
        }
      );
    }

    console.log('Bill created successfully with ID:', bill._id);

    res.status(201).json({
      status: 'success',
      message: 'Bill created successfully',
      data: {
        bill
      }
    });

  } catch (error) {
    console.error('Create bill error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error: ' + validationErrors.join(', ')
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Server error creating bill: ' + error.message
    });
  }
});

// @desc    Get single bill
// @route   GET /api/billing/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('createdBy', 'fullName username')
      .populate('prescription', 'prescriptionId')
      .populate('items.medicine', 'name genericName');

    if (!bill) {
      return res.status(404).json({
        status: 'error',
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        bill
      }
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching bill'
    });
  }
});

// @desc    Update bill
// @route   PUT /api/billing/:id
// @access  Private (Staff and above)
router.put('/:id', protect, authorize('staff', 'pharmacist', 'admin'), async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({
        status: 'error',
        message: 'Bill not found'
      });
    }

    // Update bill
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Bill updated successfully',
      data: {
        bill: updatedBill
      }
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating bill'
    });
  }
});

// @desc    Delete bill
// @route   DELETE /api/billing/:id
// @access  Private (Pharmacist and above)
router.delete('/:id', protect, authorize('pharmacist', 'admin'), async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({
        status: 'error',
        message: 'Bill not found'
      });
    }

    // Update status to cancelled instead of deleting
    bill.status = 'cancelled';
    bill.updatedBy = req.user.id;
    await bill.save();

    res.status(200).json({
      status: 'success',
      message: 'Bill cancelled successfully'
    });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deleting bill'
    });
  }
});

module.exports = router;

// @desc    Delete bill
// @route   DELETE /api/billing/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        // Soft delete - update status instead of actual deletion
        await Bill.findByIdAndUpdate(req.params.id, {
            status: 'deleted',
            updatedBy: req.user.id,
            deletedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Bill deleted successfully'
        });
    } catch (error) {
        console.error('Delete bill error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting bill'
        });
    }
});
