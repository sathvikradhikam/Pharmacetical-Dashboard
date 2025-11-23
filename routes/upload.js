const express = require('express');
const router = express.Router();

// Temporary route for testing
router.get('/test', (req, res) => {
  res.json({ message: 'Upload route working' });
});

module.exports = router;
