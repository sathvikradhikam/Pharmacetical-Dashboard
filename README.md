# 🧬 Drug-Sync Nexus  
### The Next-Gen Pharmacy Management Dashboard – Secure, Intelligent, Full-Stack

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20-6cc24a?logo=nodedotjs)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-47A248?logo=mongodb)](https://mongodb.com)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red)](https://github.com/sathvikradhikam)

> A **role-based, OCR-powered, QR-traceable** pharmacy ecosystem that brings hospital-grade precision and safety to every counter.


## 🚀 Why Drug-Sync Nexus is Different

| Feature                          | Traditional Systems | Drug-Sync Nexus                          |
|----------------------------------|---------------------|------------------------------------------|
| Prescription Entry               | Manual typing only  | **OCR scanning** (Tesseract.js) + manual |
| Medication Traceability          | None / Barcode      | **Encrypted QR** with batch, expiry, dosage |
| Access Control                   | Basic roles         | Granular RBAC (Admin → Doctor → Pharmacist → Staff) |
| Billing                          | Error-prone         | Auto-tax, discount, **PDF receipts** (jsPDF) |
| Expiry & Stock Alerts            | Manual checks       | Real-time dashboard alerts               |
| Deployment                       | Heavy desktop apps  | Pure web – works on any device           |

## ✨ Killer Features

- 🔐 **Secure Auth** – JWT + bcrypt hashed passwords  
- 👥 **Role-Based Access Control** (Admin / Doctor / Pharmacist / Staff)  
- 🏥 **Smart Prescription Module**  
  - Upload handwritten/digital prescription → instant OCR extraction  
  - Edit & confirm before saving  
- 📦 **Real-Time Inventory** with low-stock & expiry alerts  
- 🧾 **Professional Billing** – tax, discount, instant PDF invoice & prescription print  
- 📊 **Live Analytics Dashboard** – sales, stock levels, recent activity  
- 🔗 **QR Traceability Integration** (separate Python microservice)  
  → Generates tamper-proof QR labels containing:  
  `Patient | Drug | Dosage | Batch | Expiry | Auth Code`  

## 🛠 Tech Stack

| Layer         | Technology                                                                 |
|---------------|----------------------------------------------------------------------------|
| Frontend      | HTML5, CSS3, Vanilla JS (ES6), Tesseract.js, jsPDF                         |
| Backend       | Node.js + Express.js                                                       |
| Auth          | JWT + bcrypt                                                               |
| Database      | MongoDB (Mongoose ODM)                                                     |
| QR Service    | Python FastAPI/Flask + qrcode + Pillow (modular & scalable)                |
| Deployment    | Works locally or on any static + Node host (Render, Vercel + Railway, etc.)|

## Quick Start

```bash
# Clone the repo
git clone https://github.com/sathvikradhikam/Drug-Sync-Nexus.git
cd Drug-Sync-Nexus

# Install backend dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env → add your MongoDB URI & strong JWT secret

# Start the server (use nodemon for auto-restart)
nodemon server.js
# or
node server.js

# Open frontend
Open index.html in browser OR serve the public folder:
npx serve
```


## Modules & Role-Based Permissions

| Feature / Module              | Admin | Doctor | Pharmacist | Staff     |
|-------------------------------|-------|--------|------------|-----------|
| Dashboard & Analytics         | ✅    | ✅     | ✅         | Limited   |
| User Management               | ✅    | ❌     | ❌         | ❌        |
| Add/Edit/Delete Medicines     | ✅    | ❌     | ✅         | ❌        |
| View Medicine Inventory       | ✅    | ✅     | ✅         | ✅ (View) |
| Create Prescription           | ✅    | ✅     | ✅         | ❌        |
| OCR Prescription Scanning     | ✅    | ✅     | ✅         | ❌        |
| Edit/Approve Prescription     | ✅    | ❌     | ✅         | ❌        |
| Generate QR Code Labels       | ✅    | ❌     | ✅         | ❌        |
| Billing & Invoicing           | ✅    | ❌     | ✅         | ✅        |
| Apply Discount / Tax          | ✅    | ❌     | ✅         | ✅ (Limited) |
| Print Receipts & Prescriptions| ✅    | ❌     | ✅         | ✅        |
| View Bills History            | ✅    | ✅     | ✅         | ✅ (Own)  |
| Low Stock & Expiry Alerts    | ✅    | ✅     | ✅         | ✅ (View) |
| System Settings               | ✅    | ❌     | ❌         | ❌        |


## 📄 License

MIT License © 2025

## 👨‍💻 Author

Sathvik A R

Drug-Sync Nexus – Because every pill deserves precision and every patient deserves safety. 💊✨

⭐ Star this repo if you found it useful!
