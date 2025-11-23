const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');
require('dotenv').config();

const sampleMedicines = [
  {
    name: "Paracetamol 500mg",
    genericName: "Paracetamol",
    brand: "MedPlus",
    category: "tablet",
    dosage: "500mg",
    strength: "500mg",
    manufacturer: "MedPlus Pharma",
    batchNumber: "BATCH001",
    manufacturingDate: "2023-06-01",
    expiryDate: "2025-06-01",
    stock: { current: 150, minimum: 30, maximum: 500 },
    pricing: { purchasePrice: 1.5, sellingPrice: 2.0, mrp: 2.5 },
    description: "Pain relief tablet for headaches and fever",
    prescriptionRequired: true,
    createdBy: null // Will be set when seeding
  },
  {
    name: "Amoxicillin 250mg",
    genericName: "Amoxicillin",
    brand: "HealWell",
    category: "other",
    dosage: "250mg",
    strength: "250mg",
    manufacturer: "HealWell Labs",
    batchNumber: "BATCH002",
    manufacturingDate: "2023-07-15",
    expiryDate: "2025-07-15",
    stock: { current: 100, minimum: 20, maximum: 400 },
    pricing: { purchasePrice: 3.0, sellingPrice: 3.5, mrp: 4.0 },
    description: "Antibiotic for bacterial infections",
    prescriptionRequired: true
  },
  {
    name: "Cough Syrup",
    genericName: "Dextromethorphan",
    brand: "SyrupCare",
    category: "syrup",
    dosage: "10ml",
    strength: "10ml",
    manufacturer: "SyrupCare Inc.",
    batchNumber: "BATCH003",
    manufacturingDate: "2023-05-20",
    expiryDate: "2025-05-20",
    stock: { current: 80, minimum: 15, maximum: 300 },
    pricing: { purchasePrice: 25.0, sellingPrice: 30.0, mrp: 35.0 },
    description: "Relief from cough and cold symptoms",
    prescriptionRequired: false
  },
  {
    name: "Hydrocortisone Cream 1%",
    genericName: "Hydrocortisone",
    brand: "DermAid",
    category: "cream",
    dosage: "Apply thin layer",
    strength: "1%",
    manufacturer: "DermAid Pharma",
    batchNumber: "BATCH004",
    manufacturingDate: "2023-06-01",
    expiryDate: "2025-06-01",
    stock: { current: 50, minimum: 10, maximum: 200 },
    pricing: { purchasePrice: 40.0, sellingPrice: 45.0, mrp: 50.0 },
    description: "Anti-inflammatory topical cream",
    prescriptionRequired: false
  },
  {
    name: "Insulin Injection",
    genericName: "Insulin",
    brand: "GlucoCare",
    category: "injection",
    dosage: "Subcutaneous injection",
    strength: "100 IU/ml",
    manufacturer: "GlucoCare Ltd.",
    batchNumber: "BATCH005",
    manufacturingDate: "2023-04-01",
    expiryDate: "2025-04-01",
    stock: { current: 60, minimum: 10, maximum: 150 },
    pricing: { purchasePrice: 300, sellingPrice: 350, mrp: 400 },
    description: "For diabetes management",
    prescriptionRequired: true
  },
  {
    name: "Vitamin D Drops",
    genericName: "Vitamin D3",
    brand: "Sunshine",
    category: "drops",
    dosage: "1ml daily",
    strength: "1000 IU/ml",
    manufacturer: "Sunshine Pharma",
    batchNumber: "BATCH006",
    manufacturingDate: "2023-03-15",
    expiryDate: "2025-03-15",
    stock: { current: 70, minimum: 15, maximum: 250 },
    pricing: { purchasePrice: 150, sellingPrice: 180, mrp: 200 },
    description: "Vitamin D supplement for bone health",
    prescriptionRequired: false
  },
  {
    name: "Calcium Carbonate Powder",
    genericName: "Calcium Carbonate",
    brand: "BoneStrong",
    category: "powder",
    dosage: "One scoop daily",
    strength: "500mg",
    manufacturer: "BoneStrong Labs",
    batchNumber: "BATCH007",
    manufacturingDate: "2023-02-01",
    expiryDate: "2025-02-01",
    stock: { current: 90, minimum: 20, maximum: 500 },
    pricing: { purchasePrice: 50, sellingPrice: 60, mrp: 70 },
    description: "Calcium supplement for bone health",
    prescriptionRequired: false
  },
  {
    name: "Azithromycin 250mg",
    genericName: "Azithromycin",
    brand: "AntiBex",
    category: "other",
    dosage: "250mg",
    strength: "250mg",
    manufacturer: "AntiBex Pharma",
    batchNumber: "BATCH008",
    manufacturingDate: "2023-01-15",
    expiryDate: "2025-01-15",
    stock: { current: 100, minimum: 25, maximum: 400 },
    pricing: { purchasePrice: 10, sellingPrice: 12, mrp: 15 },
    description: "Antibiotic for respiratory infections",
    prescriptionRequired: true
  },
  // Add 12 more medicines to reach 20 total
  {
    name: "Ibuprofen 200mg",
    genericName: "Ibuprofen",
    brand: "PainAway",
    category: "tablet",
    dosage: "200mg",
    strength: "200mg",
    manufacturer: "PainAway Labs",
    batchNumber: "BATCH009",
    manufacturingDate: "2023-07-01",
    expiryDate: "2025-07-01",
    stock: { current: 130, minimum: 30, maximum: 600 },
    pricing: { purchasePrice: 2.0, sellingPrice: 2.5, mrp: 3.0 },
    description: "Anti-inflammatory pain reliever",
    prescriptionRequired: true
  },
  {
    name: "Metformin 500mg",
    genericName: "Metformin",
    brand: "GlucoHeal",
    category: "tablet",
    dosage: "500mg",
    strength: "500mg",
    manufacturer: "GlucoHeal Pharma",
    batchNumber: "BATCH010",
    manufacturingDate: "2023-03-10",
    expiryDate: "2025-03-10",
    stock: { current: 125, minimum: 20, maximum: 500 },
    pricing: { purchasePrice: 5.0, sellingPrice: 6.0, mrp: 7.0 },
    description: "Diabetes medication",
    prescriptionRequired: true
  },
  {
    name: "Ciprofloxacin 500mg",
    genericName: "Ciprofloxacin",
    brand: "BioAntibio",
    category: "other",
    dosage: "500mg",
    strength: "500mg",
    manufacturer: "BioAntibio Pharma",
    batchNumber: "BATCH011",
    manufacturingDate: "2023-05-15",
    expiryDate: "2025-05-15",
    stock: { current: 85, minimum: 15, maximum: 350 },
    pricing: { purchasePrice: 7.0, sellingPrice: 8.0, mrp: 9.5 },
    description: "Broad-spectrum antibiotic",
    prescriptionRequired: true
  },
  {
    name: "Ampicillin Injection",
    genericName: "Ampicillin",
    brand: "InjectoCare",
    category: "injection",
    dosage: "IV/IM injection",
    strength: "500mg",
    manufacturer: "InjectoCare Inc.",
    batchNumber: "BATCH012",
    manufacturingDate: "2023-06-20",
    expiryDate: "2025-06-20",
    stock: { current: 40, minimum: 10, maximum: 100 },
    pricing: { purchasePrice: 25.0, sellingPrice: 30.0, mrp: 35.0 },
    description: "Injectable antibiotic",
    prescriptionRequired: true
  },
  {
    name: "Eye Drops Saline",
    genericName: "Sodium Chloride",
    brand: "EyeCare",
    category: "drops",
    dosage: "2-3 drops",
    strength: "0.9%",
    manufacturer: "EyeCare Pharma",
    batchNumber: "BATCH013",
    manufacturingDate: "2023-02-28",
    expiryDate: "2025-02-28",
    stock: { current: 60, minimum: 10, maximum: 200 },
    pricing: { purchasePrice: 15.0, sellingPrice: 18.0, mrp: 20.0 },
    description: "Saline solution for eye irrigation",
    prescriptionRequired: false
  },
  {
    name: "Antacid Powder",
    genericName: "Magnesium Hydroxide",
    brand: "DigestEase",
    category: "powder",
    dosage: "1 teaspoon",
    strength: "400mg",
    manufacturer: "DigestEase Labs",
    batchNumber: "BATCH014",
    manufacturingDate: "2023-04-10",
    expiryDate: "2025-04-10",
    stock: { current: 55, minimum: 15, maximum: 150 },
    pricing: { purchasePrice: 20.0, sellingPrice: 25.0, mrp: 30.0 },
    description: "Antacid for heartburn relief",
    prescriptionRequired: false
  },
  {
    name: "Cetirizine 10mg",
    genericName: "Cetirizine",
    brand: "AllergyFree",
    category: "tablet",
    dosage: "10mg",
    strength: "10mg",
    manufacturer: "AllergyFree Pharma",
    batchNumber: "BATCH015",
    manufacturingDate: "2023-05-05",
    expiryDate: "2025-05-05",
    stock: { current: 140, minimum: 40, maximum: 600 },
    pricing: { purchasePrice: 2.0, sellingPrice: 2.5, mrp: 3.0 },
    description: "Antihistamine for allergies",
    prescriptionRequired: false
  },
  {
    name: "Omeprazole Syrup",
    genericName: "Omeprazole",
    brand: "AcidBlock",
    category: "syrup",
    dosage: "10ml",
    strength: "20mg/10ml",
    manufacturer: "AcidBlock Pharma",
    batchNumber: "BATCH016",
    manufacturingDate: "2023-06-18",
    expiryDate: "2025-06-18",
    stock: { current: 70, minimum: 20, maximum: 300 },
    pricing: { purchasePrice: 35.0, sellingPrice: 40.0, mrp: 45.0 },
    description: "Proton pump inhibitor for acid reflux",
    prescriptionRequired: true
  },
  {
    name: "Clotrimazole Cream",
    genericName: "Clotrimazole",
    brand: "FungiCure",
    category: "cream",
    dosage: "Apply twice daily",
    strength: "1%",
    manufacturer: "FungiCure Pharma",
    batchNumber: "BATCH017",
    manufacturingDate: "2023-04-25",
    expiryDate: "2025-04-25",
    stock: { current: 45, minimum: 15, maximum: 200 },
    pricing: { purchasePrice: 30.0, sellingPrice: 35.0, mrp: 40.0 },
    description: "Antifungal cream",
    prescriptionRequired: false
  },
  {
    name: "Diclofenac Injection",
    genericName: "Diclofenac",
    brand: "PainStop",
    category: "injection",
    dosage: "IM injection",
    strength: "75mg/ml",
    manufacturer: "PainStop Inc.",
    batchNumber: "BATCH018",
    manufacturingDate: "2023-07-10",
    expiryDate: "2025-07-10",
    stock: { current: 30, minimum: 10, maximum: 100 },
    pricing: { purchasePrice: 15.0, sellingPrice: 18.0, mrp: 22.0 },
    description: "Injectable anti-inflammatory",
    prescriptionRequired: true
  },
  {
    name: "Nasal Drops",
    genericName: "Xylometazoline",
    brand: "BreathEasy",
    category: "drops",
    dosage: "2-3 drops",
    strength: "0.1%",
    manufacturer: "BreathEasy Labs",
    batchNumber: "BATCH019",
    manufacturingDate: "2023-02-15",
    expiryDate: "2025-02-15",
    stock: { current: 50, minimum: 15, maximum: 250 },
    pricing: { purchasePrice: 12.0, sellingPrice: 15.0, mrp: 18.0 },
    description: "Nasal decongestant drops",
    prescriptionRequired: false
  },
  {
    name: "Protein Powder",
    genericName: "Whey Protein",
    brand: "HealthBoost",
    category: "powder",
    dosage: "1 scoop daily",
    strength: "30g protein",
    manufacturer: "HealthBoost Labs",
    batchNumber: "BATCH020",
    manufacturingDate: "2023-03-05",
    expiryDate: "2025-03-05",
    stock: { current: 25, minimum: 5, maximum: 100 },
    pricing: { purchasePrice: 800, sellingPrice: 900, mrp: 1000 },
    description: "Protein supplement for muscle building",
    prescriptionRequired: false
  }
];

async function seedMedicines() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/drug_sync_nexus');
    console.log('Connected to MongoDB');

    // Clear existing medicines (optional)
    await Medicine.deleteMany({});
    console.log('Cleared existing medicines');

    // Find an admin user to set as creator, or use null
    const User = require('./models/User');
    const adminUser = await User.findOne({ role: 'admin' });
    const createdBy = adminUser ? adminUser._id : null;

    // Set createdBy for all medicines
    const medicinesWithCreator = sampleMedicines.map(medicine => ({
      ...medicine,
      createdBy
    }));

    // Insert sample medicines
    const insertedMedicines = await Medicine.insertMany(medicinesWithCreator);
    console.log(`✅ Successfully inserted ${insertedMedicines.length} medicines`);

    // Display summary
    const summary = {};
    insertedMedicines.forEach(medicine => {
      summary[medicine.category] = (summary[medicine.category] || 0) + 1;
    });

    console.log('\n📊 Medicine Summary by Category:');
    Object.entries(summary).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} medicines`);
    });

    mongoose.disconnect();
    console.log('\n✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedMedicines();
