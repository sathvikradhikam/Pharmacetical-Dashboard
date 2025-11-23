const express = require('express');
const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Today's statistics
    const [
      todayPrescriptions,
      todayRevenue,
      todayCustomers,
      lowStockCount,
      expiringMedicinesCount,
      totalMedicines,
      totalUsers,
      pendingPrescriptions
    ] = await Promise.all([
      // Today's prescriptions count
      Prescription.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      }),
      
      // Today's revenue
      Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lt: endOfDay },
            status: 'finalized',
            paymentStatus: { $in: ['paid', 'partially-paid'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' }
          }
        }
      ]),
      
      // Today's unique customers
      Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lt: endOfDay },
            status: 'finalized'
          }
        },
        {
          $group: {
            _id: '$customer.name'
          }
        },
        {
          $count: 'uniqueCustomers'
        }
      ]),
      
      // Low stock medicines count
      Medicine.countDocuments({
        isActive: true,
        $expr: { $lte: ['$stock.current', '$stock.minimum'] }
      }),
      
      // Expiring medicines count (within 6 months)
      Medicine.countDocuments({
        isActive: true,
        expiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months
        }
      }),
      
      // Total medicines count
      Medicine.countDocuments({ isActive: true }),
      
      // Total users count
      User.countDocuments({ isActive: true }),
      
      // Pending prescriptions
      Prescription.countDocuments({ status: 'pending' })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        todayStats: {
          prescriptions: todayPrescriptions,
          revenue: todayRevenue[0]?.totalRevenue || 0,
          customers: todayCustomers[0]?.uniqueCustomers || 0
        },
        alertStats: {
          lowStock: lowStockCount,
          expiringMedicines: expiringMedicinesCount,
          pendingPrescriptions
        },
        generalStats: {
          totalMedicines,
          totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching dashboard statistics'
    });
  }
});

// @desc    Get recent activities
// @route   GET /api/dashboard/activities
// @access  Private
router.get('/activities', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent prescriptions
    const recentPrescriptions = await Prescription.find()
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .populate('createdBy', 'fullName')
      .select('prescriptionId patient.name createdAt createdBy');

    // Get recent bills
    const recentBills = await Bill.find({ status: 'finalized' })
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .populate('createdBy', 'fullName')
      .select('billNumber customer.name grandTotal createdAt createdBy');

    // Combine and sort activities
    const activities = [
      ...recentPrescriptions.map(prescription => ({
        id: prescription._id,
        type: 'prescription',
        title: 'New prescription added',
        description: `Prescription ${prescription.prescriptionId} for ${prescription.patient.name}`,
        user: prescription.createdBy?.fullName || 'Unknown',
        timestamp: prescription.createdAt,
        icon: 'fas fa-prescription'
      })),
      ...recentBills.map(bill => ({
        id: bill._id,
        type: 'bill',
        title: 'Payment received',
        description: `₹${bill.grandTotal} from ${bill.customer.name}`,
        user: bill.createdBy?.fullName || 'Unknown',
        timestamp: bill.createdAt,
        icon: 'fas fa-money-bill-wave'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, limit);

    res.status(200).json({
      status: 'success',
      data: {
        activities
      }
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching recent activities'
    });
  }
});

// @desc    Get sales chart data
// @route   GET /api/dashboard/sales-chart
// @access  Private
router.get('/sales-chart', protect, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    let startDate, groupBy;

    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const salesData = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'finalized',
          paymentStatus: { $in: ['paid', 'partially-paid'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: '$grandTotal' },
          billCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        chartData: salesData
      }
    });
  } catch (error) {
    console.error('Get sales chart error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching sales chart data'
    });
  }
});

// @desc    Get top selling medicines
// @route   GET /api/dashboard/top-medicines
// @access  Private
router.get('/top-medicines', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { period = 'month' } = req.query;

    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const topMedicines = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'finalized'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.medicineName',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: limit
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        topMedicines
      }
    });
  } catch (error) {
    console.error('Get top medicines error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching top medicines'
    });
  }
});

module.exports = router;
