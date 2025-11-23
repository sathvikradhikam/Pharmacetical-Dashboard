// Complete script.js for Drug-Sync Nexus Pharmacy Management System
// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPage = 'dashboard';
let currentMedicines = [];
let currentPrescriptions = [];
let currentBills = [];
let savedPrescriptions = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    loadSavedPrescriptions();
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');
    
    // Get stored token and user
    authToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');
    
    // Validate token
    if (authToken === 'null' || authToken === 'undefined' || !authToken) {
        console.log('No valid token found');
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        showLoginModal();
        setupLoginEventListeners();
        return;
    }
    
    // Parse user data
    try {
        currentUser = JSON.parse(storedUser);
    } catch (error) {
        console.error('Error parsing user data:', error);
        currentUser = null;
        authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        showLoginModal();
        setupLoginEventListeners();
        return;
    }
    
    // Check if user is logged in
    if (authToken && currentUser) {
        console.log('User already logged in, setting up app...');
        setupApp();
    } else {
        console.log('User not logged in, showing login modal...');
        showLoginModal();
        setupLoginEventListeners();
    }
}



// Setup login event listeners
function setupLoginEventListeners() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Login form not found in DOM');
        return;
    }
    
    console.log('Setting up login form event listener');
    loginForm.addEventListener('submit', handleLogin);
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        console.error('Email or password input not found');
        showErrorToast('Login form is not properly configured');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email) {
        showErrorToast('Please enter your email address');
        emailInput.focus();
        return;
    }
    
    if (!password) {
        showErrorToast('Please enter your password');
        passwordInput.focus();
        return;
    }
    
    showLoading();
    
    try {
        console.log('Attempting login with email:', email);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);
        
        hideLoading();
        
        // Check for successful login
        if (response.ok && data.status === 'success' && data.data && data.data.token) {
            // Store auth data
            authToken = data.data.token;
            currentUser = data.data.user;
            
            // Clean and store token
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            console.log('Login successful, token stored:', authToken);
            showSuccessToast('Login successful! Redirecting...');
            
            // Redirect to app after short delay
            setTimeout(() => {
                hideLoginModal();
                setupApp();
                navigateToPage('dashboard');
            }, 1000);
            
        } else {
            // Handle login failure
            const errorMessage = data.message || 'Invalid email or password';
            showErrorToast(errorMessage);
            console.error('Login failed:', errorMessage);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showErrorToast('Connection failed. Please check if the server is running and try again.');
    }
}


async function handleRegister(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('regFullName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const role = document.getElementById('regRole')?.value;  // <-- NEW
    
    // Validation
    if (!fullName) {
        showErrorToast('Please enter your full name');
        document.getElementById('regFullName')?.focus();
        return;
    }
    
    if (!email) {
        showErrorToast('Please enter your email');
        document.getElementById('regEmail')?.focus();
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showErrorToast('Please enter a valid email address');
        document.getElementById('regEmail')?.focus();
        return;
    }
    
    if (!password) {
        showErrorToast('Please enter a password');
        document.getElementById('regPassword')?.focus();
        return;
    }
    
    if (password.length < 6) {
        showErrorToast('Password must be at least 6 characters long');
        document.getElementById('regPassword')?.focus();
        return;
    }

    if (!role) {   // <-- ENSURE ROLE IS SELECTED
        showErrorToast('Please select a role');
        document.getElementById('regRole')?.focus();
        return;
    }
    
    const formData = {
        fullName: fullName,
        email: email,
        password: password,
        role: role           // <-- SEND ROLE TO BACKEND
    };
    
    showLoading();
    
    try {
        console.log('Attempting registration with email:', email);
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        console.log('Registration response status:', response.status);
        const data = await response.json();
        console.log('Registration response data:', data);
        
        hideLoading();
        
        if (response.ok && (data.success || data.status === 'success')) {
            showSuccessToast('Account created successfully! Please login.');
            closeRegisterModal();
            document.getElementById('registerForm')?.reset();
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) {
                loginEmail.value = email;
            }
        } else {
            const errorMessage = data.message || 'Registration failed. Please try again.';
            showErrorToast(errorMessage);
            console.error('Registration failed:', errorMessage);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Registration error:', error);
        showErrorToast('Registration failed. Please check if the server is running and try again.');
    }
}



function logout() {
    console.log('Logging out...');
    
    // Clear auth data
    authToken = null;
    currentUser = null;
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.clear(); // Clear everything to be safe
    
    // Hide main app
    const app = document.getElementById('app');
    if (app) app.style.display = 'none';
    
    // Show login modal
    showLoginModal();
    setupLoginEventListeners();
    
    showSuccessToast('Logged out successfully!');
    
    console.log('Logout complete');
}


// Setup main app after successful login
function setupApp() {
    console.log('Setting up main application...');
    
    // Hide login modal completely
    hideLoginModal();
    
    // Set current date for prescription form
    const today = new Date().toISOString().split('T')[0];
    const prescriptionDateInput = document.getElementById('prescriptionDate');
    if (prescriptionDateInput) {
        prescriptionDateInput.value = today;
    }
    
    // Update user info in navbar
    updateUserInfo();
    
    // Show the main app
    const app = document.getElementById('app');
    if (app) {
        app.style.display = 'block';
        app.style.opacity = '1';
    }
    
    // Setup all functionality
    setupEventListeners();
    setupSidebarToggle();
    
    // Setup role-based access - NEW
    setupRoleBasedAccess();
    
    // Initialize components
    addMedicine();
    addBillingItem();
    
    // Load initial data based on role
    loadInitialDataByRole();
    
    console.log('App setup completed successfully');
}

// Setup role-based navigation
function setupRoleBasedAccess() {
    if (!currentUser || !currentUser.role) return;
    
    const userRole = currentUser.role.toLowerCase();
    
    // Define access permissions
    const rolePermissions = {
        'admin': ['dashboard', 'prescriptions', 'billing', 'inventory'],
        'doctor': ['prescriptions'],
        'pharmacist': ['prescriptions', 'billing', 'inventory'],
        'staff': ['dashboard', 'prescriptions', 'billing']
    };
    
    const allowedPages = rolePermissions[userRole] || ['dashboard'];
    
    // Hide/show navigation links based on role
    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.getAttribute('data-page');
        
        if (allowedPages.includes(page)) {
            link.style.display = 'flex';
        } else {
            link.style.display = 'none';
        }
    });
    
    // Redirect if current page is not allowed
    const currentPageElement = document.querySelector('.page.active');
    if (currentPageElement) {
        const currentPageId = currentPageElement.id;
        if (!allowedPages.includes(currentPageId)) {
            navigateToPage(allowedPages[0]); // Redirect to first allowed page
        }
    }
}
function loadInitialDataByRole() {
    if (!currentUser) return;
    
    const userRole = currentUser.role.toLowerCase();
    
    switch(userRole) {
        case 'admin':
            loadDashboardData();
            break;
        case 'doctor':
            navigateToPage('prescriptions');
            loadPrescriptions();
            break;
        case 'pharmacist':
            navigateToPage('inventory');
            loadMedicines();
            loadInventoryAlerts();
            break;
        case 'staff':
            loadDashboardData();
            break;
        default:
            loadDashboardData();
    }
}




function updateUserInfo() {
    if (currentUser) {
        const userFullName = document.getElementById('userFullName');
        const userRole = document.getElementById('userRole');
        
        if (userFullName) userFullName.textContent = currentUser.fullName;
        
        if (userRole) {
            const role = currentUser.role || 'staff';
            const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
            userRole.innerHTML = `<span class="user-role-badge role-${role}">${roleDisplay}</span>`;
        }
    }
}


// UI Helper Functions
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    const app = document.getElementById('app');
    
    if (loginModal) {
        loginModal.style.display = 'block';
        console.log('Login modal shown');
    }
    
    // Ensure app is hidden
    if (app) {
        app.style.display = 'none';
    }
}

function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    
    if (loginModal) {
        loginModal.style.display = 'none';
        console.log('Login modal hidden');
    }
}


// function hideLoginModal() {
//     const loginModal = document.getElementById('loginModal');
//     if (loginModal) {
//         loginModal.style.display = 'none';
//         console.log('Login modal hidden');
//     }
// }

function showRegisterModal() {
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        registerModal.style.display = 'block';
    }
}

function closeRegisterModal() {
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        registerModal.style.display = 'none';
    }
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.reset();
    }
}

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showSuccessToast(message) {
    const toast = document.getElementById('successToast');
    const successMessage = document.getElementById('successMessage');
    
    if (toast && successMessage) {
        successMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        console.log('Success:', message);
        alert(message);
    }
}

function showErrorToast(message) {
    const toast = document.getElementById('errorToast');
    const errorMessage = document.getElementById('errorMessage');
    
    if (toast && errorMessage) {
        errorMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        console.error('Error:', message);
        alert(message);
    }
}

// Sidebar Toggle Setup
function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
            }
        });
        
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
        
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // File upload for prescription scanning
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
    
    // Tab switching
    setupTabSwitching();
    
    // Filters
    setupFilters();
    
    // Search functionality
    setupSearchFunctionality();
    
    // Amount paid change listener
    const amountPaidInput = document.getElementById('amountPaid');
    if (amountPaidInput) {
        amountPaidInput.addEventListener('input', updateBillingTotal);
    }
}

// Update the apiCall function
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Build headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add auth token if available
    if (authToken && authToken !== 'null' && authToken !== 'undefined') {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const config = {
        ...options,
        headers
    };

    try {
        showLoading();
        const response = await fetch(url, config);
        const data = await response.json();
        
        hideLoading();
        
        if (!response.ok) {
            // Handle 401 Unauthorized - token issues
            if (response.status === 401) {
                console.log('Token invalid or expired, logging out...');
                logout();
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        hideLoading();
        console.error('API Error:', error);
        throw error;
    }
}


// Navigation Functions
function navigateToPage(pageName) {
    // Check if user has access to this page
    if (!hasAccessToPage(pageName)) {
        showErrorToast('You do not have access to this section');
        return;
    }
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const selectedPage = document.getElementById(pageName);
    if (selectedPage) selectedPage.classList.add('active');
    
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    const pageTitle = document.getElementById('pageTitle');
    const titles = {
        'dashboard': 'Dashboard',
        'prescriptions': 'Prescriptions',
        'billing': 'Billing',
        'inventory': 'Inventory'
    };
    if (pageTitle) pageTitle.textContent = titles[pageName] || 'Dashboard';
    
    currentPage = pageName;
    
    switch (pageName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'prescriptions':
            loadPrescriptions();
            break;
        case 'billing':
            loadBills();
            break;
        case 'inventory':
            loadMedicines();
            loadInventoryAlerts();
            break;
    }
}

// Helper function to check page access
function hasAccessToPage(pageName) {
    if (!currentUser || !currentUser.role) return false;
    
    const userRole = currentUser.role.toLowerCase();
    
    const rolePermissions = {
        'admin': ['dashboard', 'prescriptions', 'billing', 'inventory'],
        'doctor': ['prescriptions'],
        'pharmacist': ['prescriptions', 'billing', 'inventory'],
        'staff': ['dashboard', 'prescriptions', 'billing']
    };
    
    const allowedPages = rolePermissions[userRole] || ['dashboard'];
    return allowedPages.includes(pageName);
}


// Dashboard Functions
async function loadDashboardData() {
    try {
        const [statsResponse, activitiesResponse] = await Promise.all([
            apiCall('/dashboard/stats').catch(() => ({ data: null })),
            apiCall('/dashboard/activities').catch(() => ({ data: null }))
        ]);

        // Update dashboard stats with fallback data
        const stats = statsResponse?.data || {
            todayStats: { prescriptions: 15, revenue: 2500, customers: 25 },
            alertStats: { lowStock: 5 }
        };
        
        const todayPrescriptions = document.getElementById('todayPrescriptions');
        const todayRevenue = document.getElementById('todayRevenue');
        const lowStockCount = document.getElementById('lowStockCount');
        const todayCustomers = document.getElementById('todayCustomers');
        
        if (todayPrescriptions) todayPrescriptions.textContent = stats.todayStats?.prescriptions || '15';
        if (todayRevenue) todayRevenue.textContent = `₹${stats.todayStats?.revenue || 2500}`;
        if (lowStockCount) lowStockCount.textContent = stats.alertStats?.lowStock || '5';
        if (todayCustomers) todayCustomers.textContent = stats.todayStats?.customers || '25';

        // Update recent activities with fallback data
        const activities = activitiesResponse?.data?.activities || [
            { icon: 'fas fa-prescription', title: 'New Prescription', description: 'Created prescription for John Doe', timestamp: new Date() },
            { icon: 'fas fa-file-invoice', title: 'Bill Generated', description: 'Generated bill for Mary Smith', timestamp: new Date(Date.now() - 300000) },
            { icon: 'fas fa-pills', title: 'Stock Updated', description: 'Added new batch of Paracetamol', timestamp: new Date(Date.now() - 600000) }
        ];
        
        updateRecentActivities(activities);
        updateNotificationCount();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        updateRecentActivities([]);
    }
}

function updateRecentActivities(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    if (activities.length === 0) {
        activityList.innerHTML = '<p class="no-data">No recent activities found.</p>';
        return;
    }
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <i class="${activity.icon || 'fas fa-info-circle'}"></i>
            <div class="activity-content">
                <p><strong>${activity.title}</strong> - ${activity.description}</p>
                <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
            </div>
        `;
        activityList.appendChild(activityItem);
    });
}

// Prescription Management Functions
async function loadPrescriptions() {
    // displaySavedPrescriptions();
    // Remove saved prescriptions display
    const savedPrescriptionsCard = document.getElementById('savedPrescriptionsCard');
    if (savedPrescriptionsCard) {
        savedPrescriptionsCard.style.display = 'none';
    }
    
    console.log('Prescription scanning ready - no saved prescriptions');
}

// function displaySavedPrescriptions() {
//     const savedPrescriptionsCard = document.getElementById('savedPrescriptionsCard');
//     const savedPrescriptionsList = document.getElementById('savedPrescriptionsList');
    
//     if (!savedPrescriptionsCard || !savedPrescriptionsList) return;
    
//     if (savedPrescriptions.length === 0) {
//         savedPrescriptionsCard.style.display = 'none';
//         return;
//     }
    
//     savedPrescriptionsCard.style.display = 'block';
//     savedPrescriptionsList.innerHTML = '';
    
//     savedPrescriptions.forEach((prescription, index) => {
//         const prescriptionItem = document.createElement('div');
//         prescriptionItem.className = 'prescription-item';
        
//         const date = new Date(prescription.date).toLocaleDateString();
        
//         prescriptionItem.innerHTML = `
//             <div class="prescription-header">
//                 <h4>Prescription ${index + 1}</h4>
//                 <span class="prescription-date">${date}</span>
//             </div>
//             <div class="prescription-text">${prescription.text.substring(0, 200)}...</div>
//             <div class="prescription-actions">
//                 <button class="btn-primary" onclick="printSavedPrescription(${index})">
//                     <i class="fas fa-print"></i> Print
//                 </button>
//                 <button class="btn-secondary" onclick="savePrescriptionAsPDF(${index})">
//                     <i class="fas fa-file-pdf"></i> Save as PDF
//                 </button>
//                 <button class="btn-secondary" onclick="deleteSavedPrescription(${index})">
//                     <i class="fas fa-trash"></i> Delete
//                 </button>
//             </div>
//         `;
        
//         savedPrescriptionsList.appendChild(prescriptionItem);
//     });
// }

// Print Prescription Functions
function printCurrentPrescription() {
    const prescriptionText = getCurrentPrescriptionText();
    if (!prescriptionText) {
        showErrorToast('Please fill in prescription details before printing');
        return;
    }
    
    printPrescription(prescriptionText);
    showSuccessToast('Prescription printed successfully!');
}

function printScannedPrescription() {
    if (!window.currentScanResult) {
        showErrorToast('No scanned prescription available');
        return;
    }
    
    const prescriptionText = formatPrescriptionForPrint(window.currentScanResult.extractedText);
    printPrescription(prescriptionText);
    showSuccessToast('Scanned prescription printed successfully!');
}

function printSavedPrescription(index) {
    if (savedPrescriptions[index]) {
        printPrescription(savedPrescriptions[index].text);
    }
}

function printPrescription(text) {
    if (!text) {
        showErrorToast('No prescription text available to print');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showErrorToast('Popup blocked! Please allow popups to print.');
        return;
    }

    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prescription - ${currentDate}</title>
            <style>
                body { 
                    font-family: 'Times New Roman', serif; 
                    margin: 40px; 
                    color: #000; 
                    line-height: 1.6;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 3px solid #1F2544; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px; 
                }
                .header h1 { 
                    color: #1F2544; 
                    margin: 0; 
                    font-size: 24px; 
                }
                .header p { 
                    margin: 5px 0; 
                    color: #666; 
                }
                .prescription-content { 
                    min-height: 400px; 
                    white-space: pre-wrap; 
                    font-size: 14px; 
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                .footer { 
                    border-top: 1px solid #ddd; 
                    padding-top: 20px; 
                    text-align: center; 
                    color: #666; 
                    font-size: 12px;
                }
                .signature-section {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                }
                .signature-box {
                    text-align: center;
                    width: 200px;
                }
                .signature-line {
                    border-top: 1px solid #000;
                    margin-top: 40px;
                    padding-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Drug-Sync Nexus</h1>
                <p>Pharmacy Management System</p>
                <p>Prescription Document</p>
            </div>
            
            <div class="prescription-info">
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Time:</strong> ${currentTime}</p>
            </div>
            
            <div class="prescription-content">${text}</div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line">Doctor's Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line">Pharmacist's Signature</div>
                </div>
            </div>
            
            <div class="footer">
                <p>This prescription was generated by Drug-Sync Nexus Pharmacy Management System</p>
                <p>For any queries, please contact our pharmacy.</p>
            </div>
            
            <script>
                window.onload = function() { 
                    window.print(); 
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Save Prescription as PDF Functions
function saveCurrentPrescriptionAsPDF() {
    const prescriptionText = getCurrentPrescriptionText();
    if (!prescriptionText) {
        showErrorToast('Please fill in prescription details before saving');
        return;
    }
    
    savePrescriptionAsPDF(null, prescriptionText);
    savePrescriptionLocally(prescriptionText);
}

function saveScannedPrescriptionAsPDF() {
    if (!window.currentScanResult) {
        showErrorToast('No scanned prescription available');
        return;
    }
    
    const prescriptionText = formatPrescriptionForPrint(window.currentScanResult.extractedText);
    savePrescriptionAsPDF(null, prescriptionText);
    savePrescriptionLocally(prescriptionText);
}

function savePrescriptionAsPDF(index, customText = null) {
    let prescriptionText;
    
    if (customText) {
        prescriptionText = customText;
    } else if (index !== null && savedPrescriptions[index]) {
        prescriptionText = savedPrescriptions[index].text;
    } else {
        showErrorToast('No prescription data available');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setTextColor(31, 37, 68);
        doc.text('Drug-Sync Nexus', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(102, 102, 102);
        doc.text('Pharmacy Management System', 105, 30, { align: 'center' });
        doc.text('Prescription Document', 105, 40, { align: 'center' });
        
        doc.setDrawColor(31, 37, 68);
        doc.line(20, 45, 190, 45);
        
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        
        doc.setTextColor(0, 0, 0);
        doc.text(`Date: ${currentDate}`, 20, 60);
        doc.text(`Time: ${currentTime}`, 20, 70);
        
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(prescriptionText, 170);
        doc.text(splitText, 20, 90);
        
        const yPosition = Math.max(200, 90 + splitText.length * 5 + 40);
        doc.line(20, yPosition, 80, yPosition);
        doc.line(120, yPosition, 180, yPosition);
        doc.text("Doctor's Signature", 20, yPosition + 10);
        doc.text("Pharmacist's Signature", 120, yPosition + 10);
        
        doc.setFontSize(8);
        doc.setTextColor(102, 102, 102);
        doc.text('Generated by Drug-Sync Nexus Pharmacy Management System', 105, 280, { align: 'center' });
        
        const fileName = `Prescription_${currentDate.replace(/\//g, '-')}_${currentTime.replace(/:/g, '-')}.pdf`;
        doc.save(fileName);
        
        showSuccessToast('Prescription saved as PDF successfully!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showErrorToast('Error generating PDF. Please try again.');
    }
}

// Helper Functions for Prescriptions
function getCurrentPrescriptionText() {
    const patientName = document.getElementById('patientName')?.value || '';
    const patientAge = document.getElementById('patientAge')?.value || '';
    const patientPhone = document.getElementById('patientPhone')?.value || '';
    const doctorName = document.getElementById('doctorName')?.value || '';
    const diagnosis = document.getElementById('diagnosis')?.value || '';
    const prescriptionDate = document.getElementById('prescriptionDate')?.value || '';
    const notes = document.getElementById('prescriptionNotes')?.value || '';
    
    if (!patientName || !doctorName) {
        return null;
    }
    
    let prescriptionText = `PRESCRIPTION\n\n`;
    prescriptionText += `Patient Name: ${patientName}\n`;
    if (patientAge) prescriptionText += `Age: ${patientAge} years\n`;
    if (patientPhone) prescriptionText += `Phone: ${patientPhone}\n`;
    prescriptionText += `\nDoctor: Dr. ${doctorName}\n`;
    prescriptionText += `Date: ${prescriptionDate}\n`;
    if (diagnosis) prescriptionText += `Diagnosis: ${diagnosis}\n`;
    
    prescriptionText += `\nPRESCRIBED MEDICINES:\n`;
    prescriptionText += `${'='.repeat(50)}\n`;
    
    const medicineItems = document.querySelectorAll('.medicine-item');
    let medicineCount = 0;
    
    medicineItems.forEach((item, index) => {
        const inputs = item.querySelectorAll('input, select');
        const medicineName = inputs[0]?.value || '';
        const dosage = inputs[1]?.value || '';
        const frequency = inputs[2]?.value || '';
        const duration = inputs[3]?.value || '';
        const quantity = inputs[4]?.value || '';
        
        if (medicineName) {
            medicineCount++;
            prescriptionText += `\n${medicineCount}. ${medicineName}\n`;
            if (dosage) prescriptionText += `   Dosage: ${dosage}\n`;
            if (frequency) prescriptionText += `   Frequency: ${frequency.replace('-', ' ')}\n`;
            if (duration) prescriptionText += `   Duration: ${duration}\n`;
            if (quantity) prescriptionText += `   Quantity: ${quantity}\n`;
        }
    });
    
    if (medicineCount === 0) {
        prescriptionText += `\nNo medicines prescribed.\n`;
    }
    
    if (notes) {
        prescriptionText += `\nADDITIONAL NOTES:\n`;
        prescriptionText += `${notes}\n`;
    }
    
    prescriptionText += `\n${'='.repeat(50)}\n`;
    prescriptionText += `\nThis prescription is valid for 30 days from the date of issue.\n`;
    prescriptionText += `Please follow the prescribed dosage and consult your doctor if any side effects occur.\n`;
    
    return prescriptionText;
}

function formatPrescriptionForPrint(extractedText) {
    if (!extractedText) return 'No prescription text available.';
    
    let formattedText = `SCANNED PRESCRIPTION\n\n`;
    formattedText += `Date: ${new Date().toLocaleDateString()}\n`;
    formattedText += `Scanned Text:\n`;
    formattedText += `${'='.repeat(50)}\n\n`;
    formattedText += extractedText;
    formattedText += `\n\n${'='.repeat(50)}\n`;
    formattedText += `Note: This is a scanned prescription. Please verify all information carefully.\n`;
    
    return formattedText;
}

function savePrescriptionLocally(prescriptionText) {
    const prescription = {
        text: prescriptionText,
        date: new Date().toISOString(),
        id: Date.now()
    };
    
    savedPrescriptions.unshift(prescription);
    
    if (savedPrescriptions.length > 10) {
        savedPrescriptions = savedPrescriptions.slice(0, 10);
    }
    
    localStorage.setItem('savedPrescriptions', JSON.stringify(savedPrescriptions));
    displaySavedPrescriptions();
}

function deleteSavedPrescription(index) {
    if (confirm('Are you sure you want to delete this prescription?')) {
        savedPrescriptions.splice(index, 1);
        localStorage.setItem('savedPrescriptions', JSON.stringify(savedPrescriptions));
        displaySavedPrescriptions();
        showSuccessToast('Prescription deleted successfully');
    }
}

function loadSavedPrescriptions() {
    // const saved = localStorage.getItem('savedPrescriptions');
    // if (saved) {
    //     try {
    //         savedPrescriptions = JSON.parse(saved);
    //     } catch (error) {
    //         console.error('Error loading saved prescriptions:', error);
    //         savedPrescriptions = [];
    //     }
    // }
    return;
}

function addMedicine() {
    const medicinesList = document.getElementById('medicinesList');
    if (!medicinesList) return;
    
    const medicineItem = document.createElement('div');
    medicineItem.className = 'medicine-item';
    
    medicineItem.innerHTML = `
        <div class="form-grid">
            <div class="input-group">
                <label>Medicine Name *</label>
                <input type="text" class="medicine-name" placeholder="Enter medicine name" required>
            </div>
            <div class="input-group">
                <label>Dosage</label>
                <input type="text" placeholder="e.g., 500mg">
            </div>
            <div class="input-group">
                <label>Frequency *</label>
                <select required>
                    <option value="once-daily">Once daily</option>
                    <option value="twice-daily">Twice daily</option>
                    <option value="thrice-daily">Three times daily</option>
                    <option value="four-times-daily">Four times daily</option>
                    <option value="as-needed">As needed</option>
                </select>
            </div>
            <div class="input-group">
                <label>Duration *</label>
                <input type="text" placeholder="e.g., 7 days" required>
            </div>
            <div class="input-group">
                <label>Quantity *</label>
                <input type="number" placeholder="1" min="1" value="1" required>
            </div>
            <div class="input-group">
                <button type="button" class="btn-secondary" onclick="removeMedicine(this)" style="margin-top: 1.8rem;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
    
    medicinesList.appendChild(medicineItem);
}

function removeMedicine(button) {
    const medicineItem = button.closest('.medicine-item');
    const medicinesList = document.getElementById('medicinesList');
    
    if (medicinesList && medicinesList.children.length > 1) {
        medicineItem.remove();
    } else {
        showErrorToast('At least one medicine item is required');
    }
}

function clearPrescriptionForm() {
    const prescriptionForm = document.querySelector('#prescriptionForm');
    if (prescriptionForm) {
        prescriptionForm.reset();
    }
    
    const today = new Date().toISOString().split('T')[0];
    const prescriptionDate = document.getElementById('prescriptionDate');
    if (prescriptionDate) prescriptionDate.value = today;
    
    const medicinesList = document.getElementById('medicinesList');
    if (medicinesList) {
        medicinesList.innerHTML = '';
        addMedicine();
    }
}

// Tab Switching
function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const activeTabContent = document.getElementById(`${tabName}-tab`);
    
    if (activeTabBtn) activeTabBtn.classList.add('active');
    if (activeTabContent) activeTabContent.classList.add('active');
}

// File Upload and Scanning Functions
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 10485760) {
            showErrorToast('File size must be less than 10MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            
            if (preview && img) {
                img.src = e.target.result;
                preview.style.display = 'block';
                preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
        reader.readAsDataURL(file);
    }
}

function clearPreview() {
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('fileInput');
    const scanResults = document.getElementById('scanResults');
    
    if (imagePreview) imagePreview.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (scanResults) scanResults.style.display = 'none';
    
    window.currentScanResult = null;
}

async function scanPrescription() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput?.files[0];
    
    if (!file) {
        showErrorToast('Please select an image file first');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showErrorToast('Please select a valid image file (JPG, PNG, etc.)');
        return;
    }
    
    if (file.size > 5000000) { // 5MB limit
        showErrorToast('Image file is too large. Please use an image under 5MB');
        return;
    }
    
    // Show loading
    showLoading();
    
    try {
        console.log('Starting OCR scan...');
        
        // Check if Tesseract is loaded
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js library is not loaded. Please refresh the page.');
        }
        
        // Create worker with progress logging
        const worker = Tesseract.createWorker({
            logger: function(m) {
                console.log('OCR Progress:', m.status, Math.round(m.progress * 100) + '%');
                
                // Update confidence display with progress
                const confidenceDiv = document.getElementById('scanConfidence');
                if (confidenceDiv && m.status === 'recognizing text') {
                    confidenceDiv.textContent = `Scanning: ${Math.round(m.progress * 100)}%`;
                    confidenceDiv.style.display = 'block';
                }
            }
        });
        
        console.log('Loading Tesseract worker...');
        await worker.load();
        
        console.log('Loading English language data...');
        await worker.loadLanguage('eng');
        
        console.log('Initializing Tesseract...');
        await worker.initialize('eng');
        
        console.log('Starting text recognition...');
        const { data: { text, confidence } } = await worker.recognize(file);
        
        console.log('OCR completed successfully');
        console.log('Extracted text:', text);
        console.log('Confidence:', confidence);
        
        // Clean up worker
        await worker.terminate();
        
        // Store the result
        window.currentScanResult = {
            extractedText: text || 'No text could be extracted from this image.',
            confidence: Math.round(confidence) || 0,
            processingTime: 0
        };
        
        // Display results using your existing function
        displayRealScanResults(text, Math.round(confidence));
        
        showSuccessToast(`Prescription scanned successfully! (${Math.round(confidence)}% confidence)`);
        
    } catch (error) {
        console.error('Detailed OCR Error:', error);
        
        // Specific error handling
        let errorMessage = 'Scanning failed. ';
        if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection and try again.';
        } else if (error.message.includes('load') || error.message.includes('Worker')) {
            errorMessage += 'OCR engine failed to initialize. Please refresh the page.';
        } else if (error.message.includes('language')) {
            errorMessage += 'Language data failed to load. Please try again.';
        } else {
            errorMessage += 'Please try with a clearer image or refresh the page.';
        }
        
        showErrorToast(errorMessage);
        
        // Show error in scan results
        displayRealScanResults('Scanning failed. Please try uploading a clearer image with readable text.', 0);
        
    } finally {
        hideLoading();
    }
}


// Add this test function to your script.js for debugging
async function testTesseract() {
    try {
        console.log('Testing Tesseract.js...');
        
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js is not loaded!');
        }
        
        console.log('Tesseract.js is loaded successfully');
        showSuccessToast('Tesseract.js library loaded correctly!');
        
        // Test worker creation
        const worker = Tesseract.createWorker();
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.terminate();
        
        console.log('Tesseract.js test completed successfully!');
        showSuccessToast('OCR engine is working correctly!');
        
    } catch (error) {
        console.error('Tesseract test failed:', error);
        showErrorToast('OCR engine test failed: ' + error.message);
    }
}



// ADD THIS NEW FUNCTION to your script.js file:
function displayCleanScanResults(extractedText) {
    const scanResultsDiv = document.getElementById('scanResults');
    const confidenceDiv = document.getElementById('scanConfidence');
    const extractedTextDiv = document.getElementById('extractedText');

    if (!scanResultsDiv || !extractedTextDiv) return;

    // Show the results section
    scanResultsDiv.style.display = 'block';
    
    // Hide confidence for now
    if (confidenceDiv) {
        confidenceDiv.style.display = 'none';
    }

    // Display the raw extracted text without any formatting
    if (!extractedText || extractedText.trim().length === 0) {
        extractedTextDiv.textContent = 'No text extracted from the image. Please try a clearer image.';
    } else {
        // Show raw text exactly as extracted
        extractedTextDiv.textContent = extractedText.trim();
        extractedTextDiv.style.whiteSpace = 'pre-wrap';
        extractedTextDiv.style.fontFamily = 'monospace';
        extractedTextDiv.style.background = '#f8f9fa';
        extractedTextDiv.style.padding = '1rem';
        extractedTextDiv.style.borderRadius = '8px';
    }

    // Scroll to results
    scanResultsDiv.scrollIntoView({ behavior: 'smooth' });
}



function displayRealScanResults(extractedText, confidence = null) {
    const scanResultsDiv = document.getElementById('scanResults');
    const confidenceDiv = document.getElementById('scanConfidence');
    const extractedTextDiv = document.getElementById('extractedText');
    
    if (!scanResultsDiv || !extractedTextDiv) return;
    
    // Show confidence only if provided
    if (confidenceDiv && confidence !== null) {
        confidenceDiv.textContent = `${confidence}% Confidence`;
        confidenceDiv.style.display = 'block';
    } else if (confidenceDiv) {
        confidenceDiv.style.display = 'none';
    }
    
    // Display the actual extracted text (no formatting, no mock data)
    if (extractedText && extractedText.trim()) {
        extractedTextDiv.textContent = extractedText.trim();
    } else {
        extractedTextDiv.textContent = 'No readable text was found in this image. Please try with a clearer image.';
    }
    
    extractedTextDiv.style.whiteSpace = 'pre-wrap';
    extractedTextDiv.style.fontFamily = 'monospace';
    
    // Store the real scan result
    window.currentScanResult = {
        extractedText: extractedText || '',
        confidence: confidence || 0
    };
    
    // Show results and scroll into view
    scanResultsDiv.style.display = 'block';
    scanResultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// function formatExtractedText(text) {
//     if (!text) return '<em style="color: var(--text-light);">No text could be extracted from the image.</em>';
    
//     let formatted = text
//         .replace(/\n{3,}/g, '\n\n')
//         .replace(/Dr\.\s*([A-Za-z\s]+)/gi, '<strong style="color: var(--primary-color);">🩺 Dr. $1</strong>')
//         .replace(/Patient:?\s*([A-Za-z\s]+)/gi, '<strong style="color: var(--accent-color);">👤 Patient: $1</strong>')
//         .replace(/(\d+mg|\d+ml|\d+\s*tablets?|\d+\s*capsules?)/gi, '<span style="color: var(--success); font-weight: bold;">$1</span>')
//         .replace(/(morning|evening|daily|twice|thrice|once)/gi, '<em style="color: var(--info);">$1</em>');
    
//     return formatted || '<em style="color: var(--text-light);">Unable to extract readable text from this image.</em>';
// }

function confirmScanResults() {
    if (!window.currentScanResult) {
        showErrorToast('No scan results available');
        return;
    }
    
    try {
        const parsedData = parseExtractedText(window.currentScanResult.extractedText);
        switchTab('manual');
        populatePrescriptionForm(parsedData);
        showSuccessToast('Scan results confirmed! Form has been pre-filled with extracted data.');
    } catch (error) {
        showErrorToast('Error processing scan results: ' + error.message);
    }
}

function parseExtractedText(text) {
    const parsed = {
        patientName: '',
        doctorName: '',
        medicines: []
    };
    
    if (!text) return parsed;
    
    const patientMatch = text.match(/Patient:?\s*([A-Za-z\s]+)/i);
    if (patientMatch) {
        parsed.patientName = patientMatch[1].trim();
    }
    
    const doctorMatch = text.match(/Dr\.?\s*([A-Za-z\s]+)/i);
    if (doctorMatch) {
        parsed.doctorName = doctorMatch[1].trim();
    }
    
    return parsed;
}

function populatePrescriptionForm(parsedData) {
    if (parsedData.patientName) {
        const patientName = document.getElementById('patientName');
        if (patientName) patientName.value = parsedData.patientName;
    }
    
    if (parsedData.doctorName) {
        const doctorName = document.getElementById('doctorName');
        if (doctorName) doctorName.value = parsedData.doctorName;
    }
}

function editScanResults() {
    showSuccessToast('Switching to manual entry mode. You can now edit the prescription details.');
    switchTab('manual');
}

// Medicine/Inventory Functions
async function loadMedicines() {
    try {
        const response = await apiCall('/medicines?limit=50');
        currentMedicines = response.data?.medicines || [];
        displayMedicines(currentMedicines);
    } catch (error) {
        console.error('Error loading medicines:', error);
        // Mock data for demo
        currentMedicines = [
            {
                _id: '1',
                name: 'Paracetamol',
                brand: 'Crocin',
                category: 'tablet',
                manufacturer: 'GSK',
                batchNumber: 'BATCH001',
                stock: { current: 50, minimum: 10 },
                pricing: { sellingPrice: 5.50 },
                manufacturingDate: '2024-01-15',
                expiryDate: '2026-01-15'
            },
            {
                _id: '2',
                name: 'Amoxicillin',
                brand: 'Novamox',
                category: 'antibiotic',
                manufacturer: 'Cipla',
                batchNumber: 'BATCH002',
                stock: { current: 5, minimum: 10 },
                pricing: { sellingPrice: 25.00 },
                manufacturingDate: '2024-02-10',
                expiryDate: '2025-12-10'
            }
        ];
        displayMedicines(currentMedicines);
    }
}

function displayMedicines(medicines) {
    const medicineGrid = document.getElementById('medicineGrid');
    if (!medicineGrid) return;
    
    medicineGrid.innerHTML = '';
    
    if (medicines.length === 0) {
        medicineGrid.innerHTML = '<p class="no-data">No medicines found.</p>';
        return;
    }
    
    medicines.forEach(medicine => {
        const medicineCard = createMedicineCard(medicine);
        medicineGrid.appendChild(medicineCard);
    });
}

function createMedicineCard(medicine) {
    const card = document.createElement('div');
    card.className = 'medicine-card';
    
    const stockStatus = medicine.stock?.current <= medicine.stock?.minimum ? 'stock-low' : '';
    const expiryDate = new Date(medicine.expiryDate);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const expiryStatus = expiryDate <= sixMonthsFromNow ? 'exp-warning' : '';
    
    card.innerHTML = `
        <div class="medicine-header">
            <h4>${medicine.name || 'Unknown Medicine'}</h4>
            <span class="category-tag ${medicine.category || 'other'}">${medicine.category || 'other'}</span>
        </div>
        <div class="medicine-info">
            <p><strong>Brand:</strong> <span>${medicine.brand || 'Generic'}</span></p>
            <p><strong>Manufacturer:</strong> <span>${medicine.manufacturer || 'N/A'}</span></p>
            <p><strong>Stock:</strong> <span class="${stockStatus}">${medicine.stock?.current || 0} units</span></p>
            <p><strong>Batch:</strong> <span>${medicine.batchNumber || 'N/A'}</span></p>
            <p><strong>MFD:</strong> ${new Date(medicine.manufacturingDate).toLocaleDateString()}</p>
            <p><strong>EXP:</strong> <span class="${expiryStatus}">${expiryDate.toLocaleDateString()}</span></p>
            <p><strong>Price:</strong> ₹${medicine.pricing?.sellingPrice || 0}/unit</p>
        </div>
        <div class="medicine-actions">
            <button class="edit-btn" onclick="editMedicine('${medicine._id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="delete-btn" onclick="deleteMedicine('${medicine._id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

async function loadInventoryAlerts() {
    try {
        displayLowStockAlerts(currentMedicines.filter(m => m.stock?.current <= m.stock?.minimum));
        displayExpiringAlerts(currentMedicines.filter(m => {
            const expiryDate = new Date(m.expiryDate);
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
            return expiryDate <= sixMonthsFromNow;
        }));
    } catch (error) {
        console.error('Error loading inventory alerts:', error);
        displayLowStockAlerts([]);
        displayExpiringAlerts([]);
    }
}

function displayLowStockAlerts(medicines) {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (medicines.length === 0) {
        container.innerHTML = '<p class="no-data">No low stock alerts</p>';
        return;
    }
    
    medicines.forEach(medicine => {
        const alert = document.createElement('div');
        alert.className = 'alert-item';
        alert.innerHTML = `
            <div class="alert-text">
                <strong>${medicine.name}</strong>
                <p>Only ${medicine.stock?.current || 0} units left</p>
            </div>
            <button class="alert-action" onclick="editMedicine('${medicine._id}')">Update Stock</button>
        `;
        container.appendChild(alert);
    });
}

function displayExpiringAlerts(medicines) {
    const container = document.getElementById('expiringAlerts');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (medicines.length === 0) {
        container.innerHTML = '<p class="no-data">No expiring medicines</p>';
        return;
    }
    
    medicines.forEach(medicine => {
        const alert = document.createElement('div');
        alert.className = 'alert-item';
        const expiryDate = new Date(medicine.expiryDate).toLocaleDateString();
        alert.innerHTML = `
            <div class="alert-text">
                <strong>${medicine.name}</strong>
                <p>Expires on ${expiryDate}</p>
            </div>
            <button class="alert-action" onclick="viewMedicine('${medicine._id}')">View Details</button>
        `;
        container.appendChild(alert);
    });
}

// Search and Filter Functions
function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchMedicines();
            }
        });
    }
}

function searchMedicines() {
    const searchTerm = document.getElementById('searchMedicine')?.value.trim();
    
    if (!searchTerm) {
        showErrorToast('Please enter a search term');
        return;
    }
    
    showSuccessToast(`Searching for: "${searchTerm}"`);
    filterMedicines();
}

function setupFilters() {
    const searchMedicine = document.getElementById('searchMedicine');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    const billSearch = document.getElementById('billSearch');
    const paymentStatusFilter = document.getElementById('paymentStatusFilter');
    
    if (searchMedicine) searchMedicine.addEventListener('keyup', filterMedicines);
    if (categoryFilter) categoryFilter.addEventListener('change', filterMedicines);
    if (stockStatusFilter) stockStatusFilter.addEventListener('change', filterMedicines);
    if (billSearch) billSearch.addEventListener('keyup', filterBills);
    if (paymentStatusFilter) paymentStatusFilter.addEventListener('change', filterBills);
}

function filterMedicines() {
    const searchTerm = document.getElementById('searchMedicine')?.value.toLowerCase().trim() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const stockStatusFilter = document.getElementById('stockStatusFilter')?.value || '';
    
    let filteredMedicines = currentMedicines.filter(medicine => {
        const matchesSearch = !searchTerm || 
            medicine.name?.toLowerCase().includes(searchTerm) ||
            medicine.brand?.toLowerCase().includes(searchTerm) ||
            medicine.genericName?.toLowerCase().includes(searchTerm) ||
            medicine.manufacturer?.toLowerCase().includes(searchTerm) ||
            medicine.batchNumber?.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || medicine.category === categoryFilter;
        
        let matchesStockStatus = true;
        if (stockStatusFilter) {
            const currentStock = medicine.stock?.current || 0;
            const minimumStock = medicine.stock?.minimum || 0;
            
            if (stockStatusFilter === 'in-stock') {
                matchesStockStatus = currentStock > minimumStock;
            } else if (stockStatusFilter === 'low-stock') {
                matchesStockStatus = currentStock <= minimumStock && currentStock > 0;
            } else if (stockStatusFilter === 'out-of-stock') {
                matchesStockStatus = currentStock === 0;
            }
        }
        
        return matchesSearch && matchesCategory && matchesStockStatus;
    });
    
    displayMedicinesWithHighlight(filteredMedicines, searchTerm);
    
    if (searchTerm) {
        showSuccessToast(`Found ${filteredMedicines.length} medicines matching "${searchTerm}"`);
    }
}

function displayMedicinesWithHighlight(medicines, searchTerm) {
    const medicineGrid = document.getElementById('medicineGrid');
    if (!medicineGrid) return;
    
    medicineGrid.innerHTML = '';
    
    if (medicines.length === 0) {
        medicineGrid.innerHTML = `
            <div class="no-data">
                <i class="fas fa-search"></i>
                <h3>No medicines found</h3>
                <p>Try adjusting your search terms or filters</p>
                <button class="btn-secondary" onclick="clearFilters()">Clear All Filters</button>
            </div>
        `;
        return;
    }
    
    medicines.forEach(medicine => {
        const medicineCard = createMedicineCardWithHighlight(medicine, searchTerm);
        medicineGrid.appendChild(medicineCard);
    });
}

function createMedicineCardWithHighlight(medicine, searchTerm) {
    const card = createMedicineCard(medicine);
    
    if (searchTerm) {
        card.classList.add('search-result');
        
        const highlightText = (text, term) => {
            if (!term || !text) return text;
            const regex = new RegExp(`(${term})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };
        
        const name = card.querySelector('.medicine-header h4');
        if (name) name.innerHTML = highlightText(name.textContent, searchTerm);
    }
    
    return card;
}

function clearFilters() {
    const searchMedicine = document.getElementById('searchMedicine');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    
    if (searchMedicine) searchMedicine.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (stockStatusFilter) stockStatusFilter.value = '';
    
    displayMedicines(currentMedicines);
    showSuccessToast('All filters cleared');
}

// Medicine Management Functions
function showAddMedicineForm() {
    const medicineModalTitle = document.getElementById('medicineModalTitle');
    const medicineSubmitText = document.getElementById('medicineSubmitText');
    const medicineEditId = document.getElementById('medicineEditId');
    const medicineForm = document.getElementById('medicineForm');
    const addMedicineModal = document.getElementById('addMedicineModal');
    
    if (medicineModalTitle) medicineModalTitle.textContent = 'Add New Medicine';
    if (medicineSubmitText) medicineSubmitText.textContent = 'Add Medicine';
    if (medicineEditId) medicineEditId.value = '';
    if (medicineForm) medicineForm.reset();
    if (addMedicineModal) addMedicineModal.style.display = 'block';
}

async function editMedicine(id) {
    const medicine = currentMedicines.find(m => m._id === id);
    
    if (!medicine) {
        showErrorToast('Medicine not found');
        return;
    }
    
    const medicineModalTitle = document.getElementById('medicineModalTitle');
    const medicineSubmitText = document.getElementById('medicineSubmitText');
    const medicineEditId = document.getElementById('medicineEditId');
    
    if (medicineModalTitle) medicineModalTitle.textContent = 'Edit Medicine';
    if (medicineSubmitText) medicineSubmitText.textContent = 'Update Medicine';
    if (medicineEditId) medicineEditId.value = id;
    
    // Populate form fields (simplified for demo)
    const medicineName = document.getElementById('medicineName');
    if (medicineName) medicineName.value = medicine.name;
    
    const addMedicineModal = document.getElementById('addMedicineModal');
    if (addMedicineModal) addMedicineModal.style.display = 'block';
}

function deleteMedicine(id) {
    if (confirm('Are you sure you want to delete this medicine?')) {
        currentMedicines = currentMedicines.filter(m => m._id !== id);
        displayMedicines(currentMedicines);
        showSuccessToast('Medicine deleted successfully!');
    }
}

function closeModal() {
    const addMedicineModal = document.getElementById('addMedicineModal');
    if (addMedicineModal) addMedicineModal.style.display = 'none';
}

// Billing Functions
async function loadBills() {
    try {
        const response = await apiCall('/billing?limit=10&sortOrder=desc');
        currentBills = response.data?.bills || [];
        displayBills(currentBills);
    } catch (error) {
        console.error('Error loading bills:', error);
        // Mock data for demo
        currentBills = [
            {
                _id: 'bill1',
                customer: { name: 'John Doe', phone: '9876543210' },
                grandTotal: 150.50,
                paymentStatus: 'paid',
                paymentMethod: 'cash',
                items: [
                    { medicineName: 'Paracetamol', quantity: 10, unitPrice: 5.50, discount: 5 },
                    { medicineName: 'Cough Syrup', quantity: 1, unitPrice: 95, discount: 0 }
                ],
                subtotal: 150,
                totalTax: 18,
                totalDiscount: 5,
                amountPaid: 150.50,
                changeGiven: 0,
                createdAt: new Date()
            }
        ];
        displayBills(currentBills);
    }
}

async function deleteBill(billId) {
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading();
        
        // Try to delete from backend first
        const response = await apiCall(`/billing/${billId}`, {
            method: 'DELETE'
        });
        
        if (response && response.success) {
            // Remove from local array
            currentBills = currentBills.filter(bill => bill._id !== billId);
            displayBills(currentBills);
            showSuccessToast('Bill deleted successfully!');
        } else {
            throw new Error('Server deletion failed');
        }
        
    } catch (error) {
        console.error('Error deleting bill from server:', error);
        
        // Fallback: Delete from local storage only
        currentBills = currentBills.filter(bill => bill._id !== billId);
        displayBills(currentBills);
        showSuccessToast('Bill deleted locally (server may be unavailable)');
    } finally {
        hideLoading();
    }
}

function displayBills(bills) {
    const billsList = document.getElementById('billsList');
    if (!billsList) return;
    
    billsList.innerHTML = '';
    
    if (bills.length === 0) {
        billsList.innerHTML = '<div class="no-data"><i class="fas fa-receipt"></i><h3>No bills found</h3><p>Generated bills will appear here</p></div>';
        return;
    }
    
    bills.forEach(bill => {
        const billItem = document.createElement('div');
        billItem.className = 'bill-item';
        
        const billReference = `BILL-${bill._id.slice(-8).toUpperCase()}`;
        const createdDate = new Date(bill.createdAt).toLocaleDateString();
        const createdTime = new Date(bill.createdAt).toLocaleTimeString();
        
        billItem.innerHTML = `
            <div class="bill-header">
                <div class="bill-title">
                    <h4>${billReference}</h4>
                    <span class="bill-date">${createdDate} at ${createdTime}</span>
                </div>
                <span class="status-badge ${bill.paymentStatus || 'pending'}">${bill.paymentStatus || 'pending'}</span>
            </div>
            <div class="bill-content">
                <div class="bill-info">
                    <div class="info-item">
                        <span class="info-label">Customer:</span>
                        <span class="info-value">${bill.customer?.name || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Amount:</span>
                        <span class="info-value amount">₹${bill.grandTotal || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Items:</span>
                        <span class="info-value">${bill.items?.length || 0} medicines</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Payment:</span>
                        <span class="info-value">${bill.paymentMethod?.toUpperCase() || 'N/A'}</span>
                    </div>
                </div>
                <div class="bill-actions">
                    <button class="action-btn view-btn" onclick="viewBill('${bill._id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn print-btn" onclick="printBill('${bill._id}')" title="Print Bill">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteBill('${bill._id}')" title="Delete Bill">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        billsList.appendChild(billItem);
    });
}

// Enhanced Print Bill Function
function printBill(billId) {
    const bill = currentBills.find(b => b._id === billId);
    if (!bill) {
        showErrorToast('Bill not found for printing');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showErrorToast('Popup blocked! Please allow popups to print.');
        return;
    }

    const billHtml = generateBillHtml(bill);

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill - ${bill._id.slice(-8).toUpperCase()}</title>
            <style>
                body { 
                    font-family: 'Arial', sans-serif; 
                    margin: 20px; 
                    color: #333; 
                    line-height: 1.4;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 3px solid #1F2544; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px; 
                }
                .header h1 { 
                    color: #1F2544; 
                    margin: 0; 
                    font-size: 28px; 
                }
                .header p { 
                    margin: 5px 0; 
                    color: #666; 
                }
                .bill-info { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 20px; 
                }
                .customer-info, .bill-details { 
                    flex: 1; 
                }
                .bill-details { 
                    text-align: right; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 10px; 
                    text-align: left; 
                }
                th { 
                    background-color: #1F2544; 
                    color: white; 
                    font-weight: bold;
                }
                .totals { 
                    margin-top: 20px; 
                    text-align: right; 
                }
                .totals div { 
                    margin-bottom: 8px; 
                    display: flex; 
                    justify-content: space-between; 
                    max-width: 300px; 
                    margin-left: auto;
                }
                .total-row { 
                    font-weight: bold; 
                    font-size: 18px; 
                    border-top: 2px solid #1F2544; 
                    padding-top: 10px; 
                    color: #1F2544;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    padding-top: 20px; 
                    border-top: 1px solid #ddd; 
                    color: #666; 
                }
            </style>
        </head>
        <body>
            ${billHtml}
            <script>
                window.onload = function(){ 
                    window.print(); 
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
    showSuccessToast('Bill sent to printer successfully!');
}

function generateBillHtml(bill) {
    let itemsHtml = '';
    let itemNumber = 1;
    
    for (const item of bill.items || []) {
        const totalPrice = (item.quantity * item.unitPrice - (item.discount || 0)).toFixed(2);
        itemsHtml += `<tr>
            <td>${itemNumber++}</td>
            <td>${item.medicineName}</td>
            <td>${item.batchNumber || 'N/A'}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
            <td style="text-align: right;">₹${(item.discount || 0).toFixed(2)}</td>
            <td style="text-align: right;">₹${totalPrice}</td>
        </tr>`;
    }

    const billIdRef = bill._id.slice(-8).toUpperCase();
    const date = new Date(bill.createdAt).toLocaleString();

    return `
        <div class="header">
            <h1>Drug-Sync Nexus</h1>
            <p>Pharmacy Management System</p>
            <p>Complete Healthcare Solutions</p>
        </div>
        
        <div class="bill-info">
            <div class="customer-info">
                <h3>Bill To:</h3>
                <p><strong>${bill.customer.name}</strong></p>
                ${bill.customer.phone ? `<p>Phone: ${bill.customer.phone}</p>` : ''}
                ${bill.customer.email ? `<p>Email: ${bill.customer.email}</p>` : ''}
            </div>
            <div class="bill-details">
                <h3>Bill Details:</h3>
                <p><strong>Bill No:</strong> BILL-${billIdRef}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Payment:</strong> ${bill.paymentMethod.toUpperCase()}</p>
                <p><strong>Status:</strong> ${bill.paymentStatus.toUpperCase()}</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 30%;">Medicine Name</th>
                    <th style="width: 15%;">Batch No.</th>
                    <th style="width: 10%;">Qty</th>
                    <th style="width: 15%;">Unit Price</th>
                    <th style="width: 10%;">Discount</th>
                    <th style="width: 15%;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="totals">
            <div><span>Subtotal:</span> <span>₹${bill.subtotal.toFixed(2)}</span></div>
            <div><span>Total Discount:</span> <span>₹${bill.totalDiscount.toFixed(2)}</span></div>
            <div><span>Tax (12% GST):</span> <span>₹${bill.totalTax.toFixed(2)}</span></div>
            <div class="total-row"><span>Grand Total:</span> <span>₹${bill.grandTotal.toFixed(2)}</span></div>
            <div><span>Amount Paid:</span> <span>₹${bill.amountPaid.toFixed(2)}</span></div>
            ${bill.changeGiven > 0 ? `<div><span>Change Given:</span> <span>₹${bill.changeGiven.toFixed(2)}</span></div>` : ''}
        </div>
        
        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>Generated by Drug-Sync Nexus Pharmacy Management System</p>
            <p>For any queries, please contact our pharmacy staff.</p>
        </div>
    `;
}

function addBillingItem() {
    const tbody = document.getElementById('billingItemsBody');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td><input type="text" placeholder="Enter medicine name" required onchange="validateBillingRow(this)"></td>
        <td><input type="text" placeholder="Enter batch number" required onchange="validateBillingRow(this)"></td>
        <td><input type="number" min="1" step="1" value="1" onchange="calculateRowTotal(this)" required></td>
        <td><input type="number" step="0.01" min="0.01" placeholder="0.00" onchange="calculateRowTotal(this)" required></td>
        <td><input type="number" step="0.01" min="0" value="0" onchange="calculateRowTotal(this)"></td>
        <td class="row-total">₹0.00</td>
        <td><button class="btn-secondary delete-row-btn" onclick="deleteRow(this)" style="padding: 0.5rem;"><i class="fas fa-trash"></i></button></td>
    `;
    
    tbody.appendChild(newRow);
    
    const firstInput = newRow.querySelector('input');
    if (firstInput) firstInput.focus();
}

function deleteRow(button) {
    const row = button.closest('tr');
    const tbody = document.getElementById('billingItemsBody');
    
    if (tbody && tbody.children.length > 1) {
        row.remove();
        updateBillingTotal();
    } else {
        showErrorToast('At least one billing item is required');
    }
}

function validateBillingRow(input) {
    const row = input.closest('tr');
    const inputs = row.querySelectorAll('input');
    
    let isValid = true;
    inputs.forEach(inp => {
        if (inp.hasAttribute('required') && !inp.value.trim()) {
            isValid = false;
        }
    });
    
    if (isValid) {
        row.classList.remove('invalid');
        calculateRowTotal(input);
    } else {
        row.classList.add('invalid');
    }
}

function calculateRowTotal(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const quantity = parseFloat(row.cells[2]?.querySelector('input')?.value) || 0;
    const price = parseFloat(row.cells[3]?.querySelector('input')?.value) || 0;
    const discount = parseFloat(row.cells[4]?.querySelector('input')?.value) || 0;
    
    const total = Math.max(0, (quantity * price) - discount);
    const rowTotal = row.cells[5];
    if (rowTotal) rowTotal.textContent = `₹${total.toFixed(2)}`;
    
    updateBillingTotal();
}

function updateBillingTotal() {
    let subtotal = 0;
    let totalDiscount = 0;
    
    document.querySelectorAll('#billingTable tbody tr').forEach(row => {
        const totalText = row.cells[5]?.textContent?.replace('₹', '') || '0';
        const itemTotal = parseFloat(totalText) || 0;
        subtotal += itemTotal;
        
        const discount = parseFloat(row.cells[4]?.querySelector('input')?.value) || 0;
        totalDiscount += discount;
    });
    
    const tax = Math.round((subtotal * 12) / 100 * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;
    const amountPaidInput = document.getElementById('amountPaid');
    const amountPaid = parseFloat(amountPaidInput?.value) || 0;
    const change = Math.max(0, amountPaid - grandTotal);
    
    const subtotalElement = document.getElementById('subtotal');
    const totalDiscountElement = document.getElementById('totalDiscount');
    const taxElement = document.getElementById('tax');
    const grandTotalElement = document.getElementById('grandTotal');
    const changeAmountElement = document.getElementById('changeAmount');
    
    if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
    if (totalDiscountElement) totalDiscountElement.textContent = `₹${totalDiscount.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `₹${tax.toFixed(2)}`;
    if (grandTotalElement) grandTotalElement.textContent = `₹${grandTotal.toFixed(2)}`;
    if (changeAmountElement) changeAmountElement.textContent = `₹${change.toFixed(2)}`;
}

async function generateBill() {
    const customerName = document.getElementById('customerName')?.value.trim();
    const paymentMethod = document.getElementById('paymentMethod')?.value;

    if (!customerName) {
        showErrorToast('Please enter customer name');
        return;
    }

    if (!paymentMethod) {
        showErrorToast('Please select payment method');
        return;
    }

    const items = [];
    const rows = document.querySelectorAll('#billingTable tbody tr');

    for (const row of rows) {
        const medicineName = row.cells[0]?.querySelector('input')?.value.trim() || '';
        const batchNumber = row.cells[1]?.querySelector('input')?.value.trim() || '';
        const quantity = parseFloat(row.cells[2]?.querySelector('input')?.value) || 0;
        const unitPrice = parseFloat(row.cells[3]?.querySelector('input')?.value) || 0;
        const discount = parseFloat(row.cells[4]?.querySelector('input')?.value) || 0;

        if (!medicineName && !batchNumber && !quantity && !unitPrice) {
            continue;
        }

        if (!medicineName || !batchNumber || !quantity || quantity <= 0 || !unitPrice || unitPrice < 0) {
            showErrorToast('Please fill out all required fields correctly for each medicine');
            return;
        }

        items.push({
            medicineName,
            batchNumber,
            quantity,
            unitPrice,
            discount,
            taxRate: 12
        });
    }

    if (items.length === 0) {
        showErrorToast('Please add at least one medicine to the bill');
        return;
    }

    const amountPaid = parseFloat(document.getElementById('amountPaid')?.value) || 0;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const totalTax = Math.round((subtotal * 12) / 100 * 100) / 100;
    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    const newBill = {
        _id: 'bill' + Date.now(),
        customer: {
            name: customerName,
            phone: document.getElementById('customerPhone')?.value.trim() || undefined,
            email: document.getElementById('customerEmail')?.value.trim() || undefined
        },
        items,
        paymentMethod,
        amountPaid,
        subtotal,
        totalDiscount,
        totalTax,
        grandTotal,
        changeGiven: paymentMethod === 'cash' ? Math.max(0, amountPaid - grandTotal) : 0,
        paymentStatus: amountPaid >= grandTotal ? 'paid' : 'pending',
        createdAt: new Date()
    };

    currentBills.unshift(newBill);
    
    const billReference = `BILL-${newBill._id.slice(-8).toUpperCase()}`;
    showSuccessToast(`Bill generated successfully! Reference: ${billReference}`);
    
    if (confirm('Bill generated successfully!\n\nWould you like to print it now?')) {
        printBill(newBill._id);
    }
    
    clearBill();
    displayBills(currentBills);
}

function clearBill() {
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerEmail = document.getElementById('customerEmail');
    const paymentMethod = document.getElementById('paymentMethod');
    const amountPaid = document.getElementById('amountPaid');
    
    if (customerName) customerName.value = '';
    if (customerPhone) customerPhone.value = '';
    if (customerEmail) customerEmail.value = '';
    if (paymentMethod) paymentMethod.value = '';
    if (amountPaid) amountPaid.value = '';
    
    const tbody = document.getElementById('billingItemsBody');
    if (tbody) {
        tbody.innerHTML = '';
        addBillingItem();
    }
    
    updateBillingTotal();
}

function viewBill(billId) {
    const bill = currentBills.find(b => b._id === billId);
    if (bill) {
        alert(`Bill Details:\n\nReference: BILL-${bill._id.slice(-8).toUpperCase()}\nCustomer: ${bill.customer.name}\nAmount: ₹${bill.grandTotal}\nStatus: ${bill.paymentStatus}`);
    } else {
        showErrorToast('Bill details not available');
    }
}

// Filter Functions
function filterBills() {
    const searchTerm = document.getElementById('billSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';
    
    let filtered = currentBills.filter(bill => {
        const matchesSearch = !searchTerm ||
            bill.customer?.name?.toLowerCase().includes(searchTerm) ||
            bill.customer?.phone?.includes(searchTerm) ||
            bill._id.slice(-8).toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || bill.paymentStatus === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    displayBills(filtered);
}

// Utility Functions
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function generateReports() {
    showSuccessToast('Reports feature coming soon!');
}

function updateNotificationCount() {
    const lowStockCount = document.getElementById('lowStockCount');
    const notificationCount = document.getElementById('notificationCount');
    
    const count = lowStockCount?.textContent || '0';
    if (notificationCount) notificationCount.textContent = count;
}

function viewMedicine(id) {
    showSuccessToast('View medicine functionality will be implemented');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Auto-save prescriptions as user types (optional feature)
let autoSaveTimeout;
function setupAutoSave() {
    const formInputs = document.querySelectorAll('#prescriptionForm input, #prescriptionForm select, #prescriptionForm textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                // Auto-save functionality can be added here
            }, 5000);
        });
    });
}

// Initialize everything when DOM is ready
window.addEventListener('load', function() {
    setupAutoSave();
});

// TEMPORARY TEST FUNCTION - Add this at the end of script.js
function testAppShow() {
    console.log('Test button clicked - bypassing login');
    
    // Simulate successful login with test data
    authToken = 'test-token-12345';
    currentUser = { 
        fullName: 'Test User', 
        username: 'testuser',
        role: 'admin',
        email: 'test@example.com'
    };
    
    // Store in localStorage
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('Test login data set, now showing app...');
    
    // Hide login modal and show app
    hideLoginModal();
    setupApp();
    navigateToPage('dashboard');
    
    // Show success message
    showSuccessToast('Test mode activated! App loaded successfully.');
}
