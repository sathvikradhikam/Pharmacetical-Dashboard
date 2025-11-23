const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  role: Joi.string().valid('admin', 'pharmacist', 'staff').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Please provide email and password'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordMatch = await user.matchPassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = user.getSignedJwtToken();

        // Remove password from output
        user.password = undefined;

        res.status(200).json({
            success: true,
            status: 'success',
            message: 'Login successful',
            data: {
                token: token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    phone: user.phone
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Server error during login'
        });
    }
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        // Accept role from request body
        const { fullName, email, password, role } = req.body;

        // Validate required fields
        if (!fullName || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Please provide full name, email, password, and role'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate role
        const validRoles = ['admin', 'doctor', 'pharmacist', 'staff'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Invalid role selected'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'User already exists with this email'
            });
        }

        // Generate username from email
        const username = email.split('@')[0].toLowerCase();

        // Create user with selected role
        const user = await User.create({
            fullName,
            username,
            email,
            password,
            role
        });

        // Generate token
        const token = user.getSignedJwtToken();

        // Remove password from output
        user.password = undefined;

        res.status(201).json({
            success: true,
            status: 'success',
            message: 'Account created successfully',
            data: {
                token: token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Email already registered'
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                status: 'error',
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Server error during registration'
        });
    }
});



// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error getting user data'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

module.exports = router;
