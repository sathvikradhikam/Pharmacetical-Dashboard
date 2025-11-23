Drug-Sync Nexus: Pharmacy Management Dashboard
A full-stack, role-based pharmacy management system—supporting secure billing, OCR-based prescription scanning, inventory tracking, role-driven access, and integration with QR code traceability for medication safety.

🚀 Features
Secure Authentication: User registration and login with hashed passwords and JWT sessions.

Role-Based Access:

Admin: Full access to all modules

Pharmacist: Prescription, inventory, billing

Doctor: Prescription module only

Staff: Configurable minimum access

Inventory Management: Add, edit, search, and monitor medicines with real-time stock and expiry alerts.

Prescription Module:

Manual & OCR-based entry using Tesseract.js (browser-based prescription text extraction)

Edit and confirm extracted content before saving

Billing & Invoicing: Automated, accurate bill generation with tax/discount, PDF printing for receipts and prescriptions (jsPDF).

Dashboard & Analytics: Real-time statistics and alerts for sales, stock, and recent activities.

QR Code Integration:

Integrates with a Python QR code service (see separate QR project: Pharmacetical-QR)

Generates QR labels for medication packaging, encoding dosing, expiry, batch, and safety data.

🛠️ Tech Stack
Frontend: HTML5, CSS3, JavaScript (ES6), Tesseract.js, jsPDF

Backend: Node.js, Express.js, JWT, bcrypt, Mongoose (MongoDB)

Database: MongoDB (collections: users, medicines, prescriptions, bills, etc.)

QR Service: Python (Flask/FastAPI), qrcode, Pillow (see separate QR module)

📦 Installation
Clone the Repository:

text
git clone https://github.com/yourusername/your-pharmacy-dashboard.git
cd your-pharmacy-dashboard
Install Backend Dependencies:

text
npm install
Configure Environment Variables:

Copy .env.example to .env

Add your MongoDB URI and JWT secret:

text
MONGODB_URI=mongodb://localhost:27017/drug_sync_nexus
JWT_SECRET=your_super_secret_jwt_key
Run the Server:

text
node server.js
(Or use nodemon for hot reload)

Frontend Use:

Open index.html in your browser, or serve the folder with a simple static server.


💡 Usage
Register: Create an account with full name, email, password, and select a role.

Login: Enter your credentials and access authorized modules.

Inventory: Add and manage medicines; monitor for stock and expiry.

Prescriptions: Doctors upload or write prescriptions; pharmacists can OCR scan and dispense.

QR Code: On fulfilling a prescription, generate and print QR for packaging.

Billing: Create bills, apply discounts/tax, and print receipts.

📖 License
This project is licensed under the MIT License.

🤝 Acknowledgements
Tesseract.js for OCR

MongoDB

Node.js

Express.js

jsPDF

Pharmacetical-QR for QR integration

🌐 Authors
Sathvik Radhikam — GitHub
