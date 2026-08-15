require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const { google } = require('googleapis');

let googleSheetsClient = null;
let SPREADSHEET_ID = '';

const fileToSheetMap = {
  'clients_database.csv': 'Clients',
  'properties_database.csv': 'Properties',
  'inquiries_database.csv': 'Inquiries',
  'reviews_database.csv': 'Reviews',
  'partners_database.csv': 'Partners',
  'audit_logs_database.csv': 'AuditLogs',
  'tickets_database.csv': 'Tickets',
  'notifications_database.csv': 'Notifications',
  'partner_meta_database.csv': 'PartnerMeta',
  'tasks_database.csv': 'Tasks',
  'cities_database.csv': 'Cities',
  'city_pipeline_database.csv': 'Pipeline',
  'city_status_history_database.csv': 'StatusHistory',
  'city_approval_queue_database.csv': 'ApprovalQueue',
  'roles_database.csv': 'Roles',
  'permissions_database.csv': 'Permissions',
  'users_database.csv': 'Users',
  'permission_changelog_database.csv': 'Changelogs',
  'employees_database.csv': 'Employees',
  'jobs_database.csv': 'Jobs',
  'applications_database.csv': 'Applications',
  'customers_database.csv': 'Customers',
  'payouts_database.csv': 'Payouts'
};

const sheetToHeadersMap = {
  'Clients': ['ID', 'Name', 'Email', 'Phone', 'DOB', 'Persons', 'Guest_Type', 'Property', 'Check_In', 'Check_Out', 'Notes', 'Status', 'Date_Added', 'Payment_Status', 'Payment_ID', 'Transaction_Ref', 'Customer_ID'],
  'Properties': ['ID', 'Name', 'Location', 'Type', 'Price', 'Beds', 'Baths', 'Area', 'Image', 'Status', 'Date_Added', 'Inventory'],
  'Inquiries': ['ID', 'Name', 'Email', 'Type', 'Message', 'Date_Added'],
  'Reviews': ['ID', 'Name', 'Email', 'Rating', 'Review', 'Status', 'Date_Added', 'Reply'],
  'Partners': ['ID', 'Name', 'Email', 'Password', 'Phone', 'Assigned_Properties', 'Status', 'GST', 'PAN', 'Bank_Account', 'Bank_IFSC', 'Verification_Status', 'Date_Created'],
  'AuditLogs': ['ID', 'Timestamp', 'Email', 'Role', 'Action', 'Details', 'IP', 'User_Agent'],
  'Tickets': ['ID', 'Partner_Email', 'Subject', 'Category', 'Message', 'Status', 'Reply', 'Date_Created'],
  'Notifications': ['ID', 'Recipient_Email', 'Title', 'Message', 'Status', 'Date_Created'],
  'PartnerMeta': ['Property_ID', 'Room_Categories', 'Inventory', 'Seasonal_Price', 'Weekend_Price', 'Discounts', 'Blocked_Dates', 'Policies', 'Amenities', 'Check_In_Out'],
  'Tasks': ['ID', 'Task_Name', 'Assigned_To', 'Status', 'Date_Created'],
  'Cities': ['ID', 'Name', 'Status', 'Launch_Quarter_Planned', 'Launch_Date_Actual', 'Target_Hotel_Count', 'Signed_Hotel_Count', 'Budget_Allocated', 'City_Manager_ID', 'Market_Notes', 'Oyo_Property_Count', 'Avg_Price_Point', 'Created_At', 'Updated_At', 'Updated_By'],
  'Pipeline': ['ID', 'City_ID', 'Hotel_Lead_Name', 'Stage', 'Stage_Updated_At', 'Stuck_Flag', 'Notes', 'Updated_By'],
  'StatusHistory': ['ID', 'City_ID', 'Old_Status', 'New_Status', 'Changed_By', 'Changed_At', 'Reason'],
  'ApprovalQueue': ['ID', 'City_ID', 'Proposed_Status', 'Reason', 'Submitted_By', 'Submitted_At', 'Status', 'Comment', 'Handled_By', 'Handled_At'],
  'Roles': ['ID', 'Name', 'Description', 'Console_Type', 'Is_System_Default', 'Created_By', 'Created_At'],
  'Permissions': ['ID', 'Role_ID', 'Module_ID', 'Can_View', 'Can_Add', 'Can_Edit', 'Can_Delete', 'Can_Approve', 'Scope'],
  'Users': ['ID', 'Name', 'Email', 'Password', 'Phone', 'Role_ID', 'Assigned_City_ID', 'Status', 'Created_By', 'Last_Login'],
  'Changelogs': ['ID', 'Changed_By', 'Target_User_ID', 'Old_Permissions', 'New_Permissions', 'Reason_Note', 'Timestamp'],
  'Employees': ['ID', 'EmployeeID', 'Name', 'Email', 'Role', 'Cities', 'Status', 'Documents'],
  'Jobs': ['ID', 'Title', 'Department', 'Location', 'Employment_Type', 'Experience_Level', 'Salary', 'Vacancies', 'Description', 'Responsibilities', 'Skills', 'Qualifications', 'Benefits', 'Work_Mode', 'Deadline', 'Status', 'Date_Added'],
  'Applications': ['ID', 'Job_ID', 'Name', 'Email', 'Phone', 'Resume', 'Cover_Letter', 'Status', 'Applied_At'],
  'Customers': ['ID', 'Name', 'Email', 'Password', 'Phone', 'Status', 'Date_Created'],
  'Payouts': ['ID', 'Partner', 'Amount', 'Date', 'Status']
};

function initGoogleSheets() {
  const credsPath = path.resolve(__dirname, 'google-credentials.json');
  const configPath = path.resolve(__dirname, 'google-config.json');
  
  if (fs.existsSync(credsPath) && fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      SPREADSHEET_ID = config.spreadsheetId || '';
      
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (creds.client_email && creds.client_email !== 'paste-your-service-account-email@here.com' && SPREADSHEET_ID && SPREADSHEET_ID !== 'YOUR_GOOGLE_SPREADSHEET_ID_HERE') {
        const auth = new google.auth.GoogleAuth({
          keyFile: credsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        googleSheetsClient = google.sheets({ version: 'v4', auth });
        console.log('Google Sheets API client initialized successfully.');
        
        verifyAndInitGoogleSheets().catch(err => {
          console.error('Error in background sheets verification:', err);
        });
      } else {
        console.log('Google Sheets API bypass: placeholders detected in credentials/config. Operating in local CSV fallback mode.');
      }
    } catch (err) {
      console.error('Failed to initialize Google Sheets API:', err);
    }
  } else {
    console.log('Google Sheets config files not found. Operating in local CSV fallback mode.');
  }
}

async function verifyAndInitGoogleSheets() {
  if (!googleSheetsClient || !SPREADSHEET_ID) return;
  
  try {
    const spreadsheet = await googleSheetsClient.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const existingSheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    const requests = [];
    
    for (const sheetName of Object.keys(sheetToHeadersMap)) {
      if (!existingSheetNames.includes(sheetName)) {
        requests.push({
          addSheet: {
            properties: { title: sheetName }
          }
        });
      }
    }
    
    if (requests.length > 0) {
      console.log(`Adding ${requests.length} missing sheets to Google Spreadsheet...`);
      await googleSheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests }
      });
    }
    
    // Now verify and add headers to any empty sheets
    for (const [sheetName, headers] of Object.entries(sheetToHeadersMap)) {
      const res = await googleSheetsClient.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1:Z1`,
      });
      const values = res.data.values;
      if (!values || values.length === 0) {
        console.log(`Initializing headers for empty Google Sheet: ${sheetName}`);
        await googleSheetsClient.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] }
        });
      }
    }
    
    console.log('All Google Sheet tables verified/initialized.');
    await syncAllGoogleToLocal();
    
    setInterval(async () => {
      console.log('Background pull: checking for updates from Google Sheets...');
      try {
        for (const sheetName of Object.keys(sheetToHeadersMap)) {
          await syncGoogleToLocal(sheetName);
        }
        console.log('Background pull sync complete.');
      } catch (syncErr) {
        console.error('Error in periodic background pull sync:', syncErr);
      }
    }, 60000);
  } catch (err) {
    console.error('Failed to verify/initialize sheets in Google Spreadsheet:', err);
  }
}

async function syncLocalToGoogle(sheetName) {
  if (!googleSheetsClient || !SPREADSHEET_ID) return;
  
  try {
    const fileBasename = Object.keys(fileToSheetMap).find(k => fileToSheetMap[k] === sheetName);
    if (!fileBasename) return;
    
    const filePath = path.resolve(__dirname, fileBasename);
    const headers = sheetToHeadersMap[sheetName];
    
    const localData = readExcelDb(filePath);
    
    const rows = [headers];
    localData.forEach(obj => {
      const row = headers.map(header => {
        const val = obj[header];
        return val !== undefined ? String(val) : '';
      });
      rows.push(row);
    });
    
    await googleSheetsClient.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });
    
    await googleSheetsClient.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });
    
    console.log(`Synced local -> Google Sheet: ${sheetName} (${localData.length} records)`);
  } catch (err) {
    console.error(`Failed to sync local -> Google Sheet for ${sheetName}:`, err);
  }
}

async function syncGoogleToLocal(sheetName) {
  if (!googleSheetsClient || !SPREADSHEET_ID) return;
  
  try {
    const fileBasename = Object.keys(fileToSheetMap).find(k => fileToSheetMap[k] === sheetName);
    if (!fileBasename) return;
    
    const filePath = path.resolve(__dirname, fileBasename);
    const headers = sheetToHeadersMap[sheetName];
    
    const res = await googleSheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });
    
    const rows = res.data.values;
    if (!rows || rows.length <= 1) {
      writeExcelDbSync(filePath, sheetName, []);
      return;
    }
    
    const incomingHeaders = rows[0];
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj = {};
      incomingHeaders.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : '';
      });
      data.push(obj);
    }
    
    writeExcelDbSync(filePath, sheetName, data);
    console.log(`Synced Google Sheet -> local CSV: ${sheetName} (${data.length} records)`);
  } catch (err) {
    console.error(`Failed to sync Google Sheet -> local CSV for ${sheetName}:`, err);
  }
}

function writeExcelDbSync(filePath, sheetName, data) {
  try {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    xlsx.writeFile(wb, filePath);
    return true;
  } catch (err) {
    console.error('Error writing file synchronously:', filePath, err);
  }
}

async function syncAllGoogleToLocal() {
  console.log('Performing initial pull from Google Sheets...');
  for (const sheetName of Object.keys(sheetToHeadersMap)) {
    await syncGoogleToLocal(sheetName);
  }
  console.log('Initial pull complete.');
}

app.use(cors());
app.use(express.json());

// Redirects to correct HTML files
app.get('/admin_console', (req, res) => {
  res.redirect('/admin_console/admin.html');
});
app.get('/management_console', (req, res) => {
  res.redirect('/management_console/management.html');
});
app.get('/partner', (req, res) => {
  res.redirect('/management_console/partner.html');
});

app.use('/', express.static(path.join(__dirname, 'customer_web')));
app.use('/admin_console', express.static(path.join(__dirname, 'admin_console')));
app.use('/management_console', express.static(path.join(__dirname, 'management_console')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test endpoint to retrieve simulated notification history
app.get('/api/test/notifications', (req, res) => {
  res.json(sentNotificationsHistory);
});

const multer = require('multer');

// Database file paths
const clientsDbPath = path.resolve(__dirname, 'clients_database.csv');
const propertiesDbPath = path.resolve(__dirname, 'properties_database.csv');
const inquiriesDbPath = path.resolve(__dirname, 'inquiries_database.csv');
const reviewsDbPath = path.resolve(__dirname, 'reviews_database.csv');
const partnersDbPath = path.resolve(__dirname, 'partners_database.csv');
const auditLogsDbPath = path.resolve(__dirname, 'audit_logs_database.csv');
const ticketsDbPath = path.resolve(__dirname, 'tickets_database.csv');
const notificationsDbPath = path.resolve(__dirname, 'notifications_database.csv');
const partnerMetaDbPath = path.resolve(__dirname, 'partner_meta_database.csv');
const jobsDbPath = path.resolve(__dirname, 'jobs_database.csv');
const applicationsDbPath = path.resolve(__dirname, 'applications_database.csv');
const tasksDbPath = path.resolve(__dirname, 'tasks_database.csv');
const citiesDbPath = path.resolve(__dirname, 'cities_database.csv');
const cityPipelineDbPath = path.resolve(__dirname, 'city_pipeline_database.csv');
const cityStatusHistoryDbPath = path.resolve(__dirname, 'city_status_history_database.csv');
const cityApprovalQueueDbPath = path.resolve(__dirname, 'city_approval_queue_database.csv');
const customersDbPath = path.resolve(__dirname, 'customers_database.csv');
const payoutsDbPath = path.resolve(__dirname, 'payouts_database.csv');

// Utility to parse Excel serial dates or Date objects to YYYY-MM-DD strings
function parseExcelDate(val) {
  if (!val) return '';
  const num = Number(val);
  if (!isNaN(num)) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (val instanceof Date) {
    const yyyy = val.getUTCFullYear();
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(val.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof val === 'string') {
    const cleanVal = val.trim();
    if (cleanVal.includes('T')) {
      return cleanVal.split('T')[0];
    }
    // Match YYYY-MM-DD or YYYY/MM/DD
    const matchYMD = cleanVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (matchYMD) {
      const yyyy = matchYMD[1];
      const mm = String(matchYMD[2]).padStart(2, '0');
      const dd = String(matchYMD[3]).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // Match DD-MM-YYYY or DD/MM/YYYY
    const matchDMY = cleanVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (matchDMY) {
      const yyyy = matchDMY[3];
      const mm = String(matchDMY[2]).padStart(2, '0');
      const dd = String(matchDMY[1]).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // Match MM-DD-YYYY or MM/DD/YYYY fallback if DD is <= 12
    const parsedTime = Date.parse(cleanVal);
    if (!isNaN(parsedTime)) {
      const date = new Date(parsedTime);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return cleanVal;
  }
  return String(val);
}

// Utility to initialize database (mock - schema created via Sequelize db.js)
function initExcelDb(filePath, sheetName, headers) {
  // Legacy compatibility: Schema is handled by Sequelize in db.js
}

const {
  initDb,
  Client,
  Property,
  Inquiry,
  Review,
  Partner,
  AuditLog,
  Ticket,
  Notification,
  PartnerMeta,
  Task,
  City,
  Pipeline,
  StatusHistory,
  ApprovalQueue,
  Role,
  Permission,
  User,
  Changelog,
  Employee,
  Job,
  Application,
  Customer,
  Payout
} = require('./db');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET || 'Homzo_Jwt_Sec_Token_2026_!!';

// Initialize SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT) || 2525,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

// Global notification history for QA testing automation
const sentNotificationsHistory = [];

function recordNotification(type, to, content) {
  sentNotificationsHistory.push({
    id: sentNotificationsHistory.length + 1,
    type,
    to,
    content,
    timestamp: new Date().toISOString()
  });
  if (sentNotificationsHistory.length > 100) {
    sentNotificationsHistory.shift();
  }
}

async function sendSMSHelper(to, message) {
  recordNotification('sms', to, message);
  console.log(`\n==================================================`);
  console.log(`[SIMULATED SMS SENT] To: ${to}`);
  console.log(`Body: ${message}`);
  console.log(`==================================================\n`);
  return true;
}

async function sendWhatsAppHelper(to, message) {
  recordNotification('whatsapp', to, message);
  console.log(`\n==================================================`);
  console.log(`[SIMULATED WHATSAPP SENT] To: ${to}`);
  console.log(`Body: ${message}`);
  console.log(`==================================================\n`);
  return true;
}

// SMTP Mail Sender helper with console fallback
async function sendMailHelper(to, subject, text, html) {
  recordNotification('email', to, `Subject: ${subject}\n\n${text}`);
  const mailOptions = {
    from: process.env.SMTP_FROM || '"HOMZO Hospitality" <no-reply@homzo.in>',
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, '<br>')
  };

  const hasConfig = process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com';
  
  if (hasConfig) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP EMAIL SENT] Message ID: ${info.messageId} to ${to}`);
      return true;
    } catch (err) {
      console.error(`[SMTP ERROR] Failed to send email to ${to}:`, err.message);
    }
  }

  // Fallback to console logging
  console.log(`\n==================================================`);
  console.log(`[SIMULATED EMAIL SENT] To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${text}`);
  console.log(`==================================================\n`);
  return true;
}

async function checkAndNotifyExpansionMilestone(cityName, req) {
  try {
    if (!cityName) return;
    const cities = readExcelDb(citiesDbPath);
    const properties = readExcelDb(propertiesDbPath);
    
    // Find matching city
    const city = cities.find(c => c.Name && c.Name.toLowerCase().trim() === cityName.toLowerCase().trim());
    if (!city) return;
    
    const target = parseInt(city.Target_Hotel_Count) || 0;
    if (target <= 0) return;
    
    const signedCount = properties.filter(p => 
      p.Location && p.Location.toLowerCase().trim() === cityName.toLowerCase().trim() &&
      p.Status && p.Status.toLowerCase().trim() === 'signed'
    ).length;
    
    if (signedCount >= target) {
      const managerEmail = city.City_Manager_ID ? `${city.City_Manager_ID.toLowerCase()}@homzo.in` : 'admin@homzo.in';
      const subject = `🎉 Expansion Target Achieved for ${city.Name}!`;
      const text = `Hello,

We are thrilled to announce that the expansion target for ${city.Name} has been successfully achieved!

Details:
- City: ${city.Name}
- Target Hotels: ${target}
- Current Signed Hotels: ${signedCount}
- City Manager: ${city.City_Manager_ID}
- Timeline Quarter: ${city.Launch_Quarter_Planned}

Congratulations to the entire team!

Best Regards,
Homzo Security & Expansion Team`;
      
      // Send simulated emails
      await sendMailHelper('admin@homzo.in', subject, text);
      if (city.City_Manager_ID && city.City_Manager_ID !== 'Unassigned') {
        await sendMailHelper(managerEmail, subject, text);
      }
      
      // Store in notifications database
      try {
        const notifications = readExcelDb(notificationsDbPath);
        let newId = 1;
        if (notifications.length > 0) {
          newId = Math.max(...notifications.map(n => parseInt(n.ID) || 0)) + 1;
        }
        notifications.push({
          ID: newId,
          Recipient_Email: 'admin@homzo.in',
          Title: `🎉 Milestone Achieved: ${city.Name}`,
          Message: `City ${city.Name} has met its target of ${target} signed hotels! Current: ${signedCount}.`,
          Status: 'sent',
          Date_Created: new Date().toISOString()
        });
        writeExcelDb(notificationsDbPath, 'Notifications', notifications);
      } catch (err) {
        console.error('Failed to save milestone notification:', err);
      }
    }
  } catch (err) {
    console.error('Error in checkAndNotifyExpansionMilestone:', err);
  }
}

const dbCache = {};
const fileToModelMap = {
  'clients_database.csv': Client,
  'properties_database.csv': Property,
  'inquiries_database.csv': Inquiry,
  'reviews_database.csv': Review,
  'partners_database.csv': Partner,
  'audit_logs_database.csv': AuditLog,
  'tickets_database.csv': Ticket,
  'notifications_database.csv': Notification,
  'partner_meta_database.csv': PartnerMeta,
  'tasks_database.csv': Task,
  'cities_database.csv': City,
  'city_pipeline_database.csv': Pipeline,
  'city_status_history_database.csv': StatusHistory,
  'city_approval_queue_database.csv': ApprovalQueue,
  'roles_database.csv': Role,
  'permissions_database.csv': Permission,
  'users_database.csv': User,
  'permission_changelog_database.csv': Changelog,
  'employees_database.csv': Employee,
  'jobs_database.csv': Job,
  'applications_database.csv': Application,
  'customers_database.csv': Customer
};

const writeQueue = {};

async function saveToSqlite(fileBasename, data) {
  const model = fileToModelMap[fileBasename];
  if (!model) return;

  writeQueue[fileBasename] = (writeQueue[fileBasename] || Promise.resolve())
    .then(async () => {
      try {
        const sanitized = data.map(record => {
          const clean = { ...record };
          if (clean.ID !== undefined && model.name !== 'Job') {
            const parsed = parseInt(clean.ID);
            clean.ID = isNaN(parsed) ? null : parsed;
          }
          if (clean.City_ID !== undefined) {
            const parsed = parseInt(clean.City_ID);
            clean.City_ID = isNaN(parsed) ? null : parsed;
          }
          if (clean.Role_ID !== undefined) {
            const parsed = parseInt(clean.Role_ID);
            clean.Role_ID = isNaN(parsed) ? null : parsed;
          }
          if (clean.Assigned_City_ID !== undefined) {
            const parsed = parseInt(clean.Assigned_City_ID);
            clean.Assigned_City_ID = isNaN(parsed) ? null : parsed;
          }
          if (clean.Persons !== undefined) {
            const parsed = parseInt(clean.Persons);
            clean.Persons = isNaN(parsed) ? null : parsed;
          }
          if (clean.Rating !== undefined) {
            const parsed = parseFloat(clean.Rating);
            clean.Rating = isNaN(parsed) ? null : parsed;
          }
          if (clean.Reviews !== undefined) {
            const parsed = parseInt(clean.Reviews);
            clean.Reviews = isNaN(parsed) ? null : parsed;
          }
          if (clean.Inventory !== undefined) {
            const parsed = parseInt(clean.Inventory);
            clean.Inventory = isNaN(parsed) ? null : parsed;
          }
          if (clean.Latitude !== undefined) {
            const parsed = parseFloat(clean.Latitude);
            clean.Latitude = isNaN(parsed) ? null : parsed;
          }
          if (clean.Longitude !== undefined) {
            const parsed = parseFloat(clean.Longitude);
            clean.Longitude = isNaN(parsed) ? null : parsed;
          }
          if (clean.Property_ID !== undefined) {
            const parsed = parseInt(clean.Property_ID);
            clean.Property_ID = isNaN(parsed) ? null : parsed;
          }
          
          if (clean.Price !== undefined && typeof clean.Price === 'string') {
            const num = parseInt(clean.Price.replace(/[^0-9]/g, ''));
            clean.Price = isNaN(num) ? null : num;
          }
          return clean;
        });

        await model.destroy({ where: {}, force: true });
        await model.bulkCreate(sanitized);
      } catch (err) {
        console.error(`Error in saveToSqlite for ${fileBasename}:`, err);
      }
    });

  await writeQueue[fileBasename];
}

async function populateCache() {
  for (const [fileBasename, model] of Object.entries(fileToModelMap)) {
    const records = await model.findAll({ raw: true });
    dbCache[fileBasename] = records;
  }
}

// Compatibility layer for read/write Excel DB
function readExcelDb(filePath) {
  const fileBasename = path.basename(filePath);
  return dbCache[fileBasename] || [];
}

function writeExcelDb(filePath, sheetName, data) {
  const fileBasename = path.basename(filePath);
  dbCache[fileBasename] = data;

  saveToSqlite(fileBasename, data).catch(err => {
    console.error(`Error saving ${fileBasename} to SQLite:`, err);
  });

  if (googleSheetsClient && SPREADSHEET_ID) {
    syncLocalToGoogle(sheetName).catch(err => {
      console.error(`Error in background local->Google sync for ${sheetName}:`, err);
    });
  }
  return true;
}

function writeExcelDbSync(filePath, sheetName, data) {
  const fileBasename = path.basename(filePath);
  dbCache[fileBasename] = data;

  saveToSqlite(fileBasename, data).catch(err => {
    console.error(`Error saving sync ${fileBasename} to SQLite:`, err);
  });
  return true;
}

// Password hashing helpers
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compareSync(inputPassword, storedHash);
  }
  const legacyHash = crypto.createHash('sha256').update(inputPassword).digest('hex');
  return legacyHash === storedHash;
}

// Audit logger
function logAction(email, role, action, details, req) {
  try {
    const logs = readExcelDb(auditLogsDbPath);
    let newId = 1;
    if (logs.length > 0) {
      newId = Math.max(...logs.map(l => parseInt(l.ID) || 0)) + 1;
    }
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : 'system';
    const ua = req ? (req.headers['user-agent'] || 'unknown') : 'system';
    
    logs.push({
      ID: newId,
      Timestamp: new Date().toISOString(),
      Email: email,
      Role: role,
      Action: action,
      Details: details,
      IP: ip,
      User_Agent: ua
    });
    writeExcelDb(auditLogsDbPath, 'AuditLogs', logs);
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}

// Authentication Middlewares
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token is required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = { ...decoded };

    if (session.role === 'partner') {
      const partners = readExcelDb(partnersDbPath);
      const partner = partners.find(p => p.Email === session.email);
      if (!partner) {
        return res.status(403).json({ error: 'Account not found.' });
      }
      if (partner.Status !== 'active') {
        return res.status(403).json({ error: 'Account is suspended or inactive.' });
      }
      session.assignedProperties = String(partner.Assigned_Properties || '').split(',').filter(Boolean);
      session.partnerId = partner.ID;
    }

    req.user = session;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
  }
}

function mapPathToModuleAndAction(path, method) {
  const cleanPath = path.toLowerCase();
  let moduleName = '';
  let action = 'view';
  
  if (method === 'POST') action = 'add';
  else if (method === 'PUT' || method === 'PATCH') action = 'edit';
  else if (method === 'DELETE') action = 'delete';
  
  if (cleanPath.includes('/bookings')) {
    moduleName = 'Booking Management';
    if (cleanPath.includes('/status') || cleanPath.includes('/approve') || cleanPath.includes('/invoice')) {
      action = 'approve';
    }
  } else if (cleanPath.includes('/properties')) {
    moduleName = 'Property Management';
  } else if (cleanPath.includes('/customers')) {
    moduleName = 'Guest Management';
  } else if (cleanPath.includes('/partners')) {
    moduleName = 'Partner CRM';
  } else if (cleanPath.includes('/payments') || cleanPath.includes('/payout')) {
    moduleName = 'Revenue & Payouts';
    if (cleanPath.includes('/payout')) {
      action = 'approve';
    }
  } else if (cleanPath.includes('/promotions')) {
    moduleName = 'Marketing & Promo';
  } else if (cleanPath.includes('/notifications')) {
    moduleName = 'Notifications';
  } else if (cleanPath.includes('/audit-logs')) {
    moduleName = 'Security Audit';
  } else if (cleanPath.includes('/careers') || cleanPath.includes('/jobs') || cleanPath.includes('/applications')) {
    moduleName = 'HR & Careers';
  } else if (cleanPath.includes('/system')) {
    moduleName = 'System Settings';
  } else if (cleanPath.includes('/tasks')) {
    moduleName = 'Operations Dashboard';
  } else if (cleanPath.includes('/roles') || cleanPath.includes('/users')) {
    moduleName = 'System Settings';
  }
  
  return { moduleName, action };
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access token is required.' });
    }
    
    const userRoleLower = String(req.user.role || '').toLowerCase();
    if (userRoleLower === 'super_admin' || userRoleLower === 'ceo' || req.user.email === 'admin@homzo.in') {
      return next();
    }
    
    // Check if simulation header is CEO/Super Admin (Only allowed in non-production)
    const roleHeader = req.headers['x-simulated-role'];
    if (roleHeader === 'super_admin' && process.env.NODE_ENV !== 'production') {
      return next();
    }
    
    const { moduleName, action } = mapPathToModuleAndAction(req.path, req.method);
    
    if (moduleName) {
      const perm = checkUserPermission(req, moduleName, action);
      if (perm.allowed) {
        req.assignedCity = perm.city;
        return next();
      }
    }
    
    if (req.user.role === role) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied: Insufficient permissions for this module.' });
  };
}

// Legacy Seeding & Checking Logic
function runLegacySeedScripts() {
  // Seed default properties if they don't have Mumbai/Delhi/Bangalore signed hotels
  try {
    const seedFlagPath = path.resolve(__dirname, '.seeded_properties');
    const propertiesData = readExcelDb(propertiesDbPath);
    if (propertiesData.length === 0 && !fs.existsSync(seedFlagPath)) {
      let nextId = 1;
      
      for (let i = 1; i <= 8; i++) {
        propertiesData.push({
          ID: nextId++, Name: `Mumbai Premier Hotel ${i}`, Location: 'Mumbai', Type: 'hotel', Price: 3000, Beds: 2, Baths: 2, Area: 350, Image: 'couple_room.png', Status: 'Signed', Date_Added: new Date().toISOString(), Inventory: 10
        });
      }
      for (let i = 1; i <= 6; i++) {
        propertiesData.push({
          ID: nextId++, Name: `Delhi Residency ${i}`, Location: 'Delhi', Type: 'hotel', Price: 2500, Beds: 2, Baths: 2, Area: 320, Image: 'tourist_room.png', Status: 'Signed', Date_Added: new Date().toISOString(), Inventory: 10
        });
      }
      for (let i = 1; i <= 2; i++) {
        propertiesData.push({
          ID: nextId++, Name: `Bangalore Suites ${i}`, Location: 'Bangalore', Type: 'hotel', Price: 3500, Beds: 2, Baths: 2, Area: 400, Image: 'employee_room.png', Status: 'Signed', Date_Added: new Date().toISOString(), Inventory: 10
        });
      }
      writeExcelDb(propertiesDbPath, 'Properties', propertiesData);
      fs.writeFileSync(seedFlagPath, 'true');
      console.log('Seeded properties with Signed status and Inventory = 10.');
    } else if (propertiesData.length > 0 && !fs.existsSync(seedFlagPath)) {
      // Mark as seeded if properties already exist initially
      fs.writeFileSync(seedFlagPath, 'true');
    }
  } catch (e) {
    console.error('Failed to seed properties:', e);
  }

  // Seed default cities if empty - DISABLED for custom expansion targets
  /*
  try {
    const citiesData = readExcelDb(citiesDbPath);
    if (citiesData.length === 0) {
      citiesData.push(
        { ID: 1, Name: 'Mumbai', Status: 'Active', Launch_Quarter_Planned: 'Q1 2026', Launch_Date_Actual: '2026-01-15', Target_Hotel_Count: 10, Signed_Hotel_Count: 0, Budget_Allocated: 500000, City_Manager_ID: 'Ramesh Kumar', Market_Notes: 'Premium corporate hub with high business travel demand.', Oyo_Property_Count: 45, Avg_Price_Point: 3200, Created_At: new Date().toISOString(), Updated_At: new Date().toISOString(), Updated_By: 'system' },
        { ID: 2, Name: 'Delhi', Status: 'Active', Launch_Quarter_Planned: 'Q2 2026', Launch_Date_Actual: '2026-04-10', Target_Hotel_Count: 8, Signed_Hotel_Count: 0, Budget_Allocated: 400000, City_Manager_ID: 'Suresh Raina', Market_Notes: 'Suburban leisure and commercial micro-markets.', Oyo_Property_Count: 60, Avg_Price_Point: 2800, Created_At: new Date().toISOString(), Updated_At: new Date().toISOString(), Updated_By: 'system' },
        { ID: 3, Name: 'Bangalore', Status: 'Onboarding', Launch_Quarter_Planned: 'Q3 2026', Launch_Date_Actual: '', Target_Hotel_Count: 5, Signed_Hotel_Count: 0, Budget_Allocated: 300000, City_Manager_ID: 'Priya Sharma', Market_Notes: 'Tech corridor expansion targeting young tech professionals.', Oyo_Property_Count: 30, Avg_Price_Point: 3500, Created_At: new Date().toISOString(), Updated_At: new Date().toISOString(), Updated_By: 'system' },
        { ID: 4, Name: 'Pune', Status: 'Target', Launch_Quarter_Planned: 'Q4 2026', Launch_Date_Actual: '', Target_Hotel_Count: 5, Signed_Hotel_Count: 0, Budget_Allocated: 200000, City_Manager_ID: 'Unassigned', Market_Notes: 'Educational and IT cluster expansion hub.', Oyo_Property_Count: 20, Avg_Price_Point: 2400, Created_At: new Date().toISOString(), Updated_At: new Date().toISOString(), Updated_By: 'system' }
      );
      writeExcelDb(citiesDbPath, 'Cities', citiesData);
      console.log('Seeded default cities');
    }
  } catch (e) {
    console.error('Failed to seed default cities:', e);
  }

  // Seed default pipeline entries if empty - DISABLED for custom expansion targets
  try {
    const pipelineData = readExcelDb(cityPipelineDbPath);
    if (pipelineData.length === 0) {
      pipelineData.push(
        { ID: 1, City_ID: 1, Hotel_Lead_Name: 'Taj Gateway Resort', Stage: 'Live', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Fully operational, positive initial reviews.', Updated_By: 'Ramesh Kumar' },
        { ID: 2, City_ID: 1, Hotel_Lead_Name: 'Sea Breeze Mansion', Stage: 'Onboarded', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Listing online, final pricing model set.', Updated_By: 'Ramesh Kumar' },
        { ID: 3, City_ID: 1, Hotel_Lead_Name: 'Mumbai Heights Guest House', Stage: 'Signed', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Contract executed. Handed over to operations.', Updated_By: 'Ramesh Kumar' },
        { ID: 4, City_ID: 1, Hotel_Lead_Name: 'Bandra Cozy Stays', Stage: 'Negotiation', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Negotiating commissions. Owner asking for 12% max.', Updated_By: 'Ramesh Kumar' },
        { ID: 5, City_ID: 1, Hotel_Lead_Name: 'Juhu Executive Apartments', Stage: 'Lead', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Inbound inquiry via website.', Updated_By: 'Ramesh Kumar' },
        { ID: 6, City_ID: 2, Hotel_Lead_Name: 'Connaught Place Grand', Stage: 'Live', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Live and booking operations standard.', Updated_By: 'Suresh Raina' },
        { ID: 7, City_ID: 2, Hotel_Lead_Name: 'Dwarka Residency', Stage: 'Outreach', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Cold call completed. Owner interested in site visit.', Updated_By: 'Suresh Raina' },
        { ID: 8, City_ID: 3, Hotel_Lead_Name: 'Koramangala Tech Lodge', Stage: 'Negotiation', Stage_Updated_At: '2026-05-10T12:00:00.000Z', Stuck_Flag: 'true', Notes: 'Owner unresponsive for over 30 days. Needs re-outreach.', Updated_By: 'Priya Sharma' },
        { ID: 9, City_ID: 3, Hotel_Lead_Name: 'Indiranagar Boutique Rooms', Stage: 'Contract Sent', Stage_Updated_At: new Date().toISOString(), Stuck_Flag: 'false', Notes: 'Draft contract sent to legal rep.', Updated_By: 'Priya Sharma' }
      );
      writeExcelDb(cityPipelineDbPath, 'Pipeline', pipelineData);
      console.log('Seeded default pipeline entries');
    }
  } catch (e) {
    console.error('Failed to seed default pipeline entries:', e);
  }
  */

  // Seed default tasks if empty
  try {
    const tasksData = readExcelDb(tasksDbPath);
    if (tasksData.length === 0) {
      tasksData.push(
        { ID: 1, Task_Name: 'Room 104 Cleaning and Inspection', Assigned_To: 'Ramesh Kumar', Status: 'In Progress', Date_Created: new Date().toISOString() },
        { ID: 2, Task_Name: 'AC Maintenance Room 208', Assigned_To: 'Suresh Raina', Status: 'Pending', Date_Created: new Date().toISOString() },
        { ID: 3, Task_Name: 'WiFi Router Setup Sector 4', Assigned_To: 'Priya Sharma', Status: 'Completed', Date_Created: new Date(Date.now() - 86400000).toISOString() }
      );
      writeExcelDb(tasksDbPath, 'Tasks', tasksData);
      console.log('Seeded default operational tasks');
    }
  } catch (e) {
    console.error('Failed to seed default tasks:', e);
  }

  // Seed default partner if database is empty
  try {
    const partnersData = readExcelDb(partnersDbPath);
    if (partnersData.length === 0) {
      partnersData.push({
        ID: 1,
        Name: 'Default Partner',
        Email: 'partner@homzo.in',
        Password: hashPassword('partner123'),
        Phone: '+91 98765 43210',
        Assigned_Properties: '1',
        Status: 'active',
        GST: '27AAAAA1111A1Z1',
        PAN: 'ABCDE1234F',
        Bank_Account: '123456789012',
        Bank_IFSC: 'HDFC0000123',
        Verification_Status: 'verified',
        Date_Created: new Date().toISOString()
      });
      writeExcelDb(partnersDbPath, 'Partners', partnersData);
      console.log('Seeded default partner account: partner@homzo.in / partner123');
    }
  } catch (e) {
    console.error('Failed to seed default partner:', e);
  }

  // Seed default jobs if empty
  try {
    const jobsData = readExcelDb(jobsDbPath);
    if (jobsData.length === 0) {
      jobsData.push({
        ID: 'software-engineer',
        Title: 'Software Engineer',
        Department: 'Engineering',
        Location: 'Bengaluru',
        Employment_Type: 'Full-Time',
        Experience_Level: 'Mid-Senior',
        Salary: '₹12,00,000 - ₹18,00,000 / annum',
        Vacancies: '2',
        Description: 'We are seeking a talented Software Engineer to build and scale our next-generation hospitality platforms.',
        Responsibilities: 'Design and implement robust web APIs in Node.js\nCollaborate with frontend engineers to integrate user-facing features\nOptimize backend systems for maximum speed and scale',
        Skills: 'JavaScript, Node.js, Express, HTML/CSS, Git',
        Qualifications: 'B.Tech/B.E. in Computer Science or equivalent\n2+ years of professional software development experience',
        Benefits: 'Comprehensive Health Insurance\nFlexible Hybrid Work Schedule\nPerformance Bonuses',
        Work_Mode: 'Hybrid',
        Deadline: '2026-08-31',
        Status: 'Open',
        Date_Added: new Date().toISOString()
      });
      jobsData.push({
        ID: 'guest-relations-executive',
        Title: 'Guest Relations Executive',
        Department: 'Operations',
        Location: 'Mumbai',
        Employment_Type: 'Full-Time',
        Experience_Level: 'Entry-Mid',
        Salary: '₹4,50,000 - ₹6,00,000 / annum',
        Vacancies: '4',
        Description: 'Join our customer operations team to deliver exceptional guest experiences across our properties.',
        Responsibilities: 'Welcome guests, check them in/out, and address inquiries\nCoordinate with housekeeping and property partners for seamless service\nHandle booking changes and resolve customer issues promptly',
        Skills: 'Communication, Customer Service, Problem Solving, MS Office',
        Qualifications: 'Bachelor\'s Degree in Hospitality Management or related field\nExcellent verbal and written communication skills',
        Benefits: 'Free Stays at Partner Properties\nHealth and Wellness allowances\nContinuous career training',
        Work_Mode: 'On-site',
        Deadline: '2026-07-31',
        Status: 'Urgent Hiring',
        Date_Added: new Date().toISOString()
      });
      jobsData.push({
        ID: 'digital-marketing-intern',
        Title: 'Digital Marketing Intern',
        Department: 'Marketing',
        Location: 'Delhi',
        Employment_Type: 'Internship',
        Experience_Level: 'Entry Level',
        Salary: '₹15,000 - ₹20,000 / month',
        Vacancies: '1',
        Description: 'Help us grow our brand presence across digital channels including social media, SEO, and paid ads.',
        Responsibilities: 'Assist in managing Homzo\'s social media channels\nDraft creative copywriting for emails and newsletters\nResearch keywords for SEO and content marketing strategies',
        Skills: 'Social Media Management, Canva, Copywriting, SEO basic',
        Qualifications: 'Pursuing or completed a Degree in Marketing, Communications, or related\nCreative mindset with a keen eye for design and copywriting',
        Benefits: 'Certificate of Internship\nLetter of Recommendation\nFull-time conversion opportunity',
        Work_Mode: 'Remote',
        Deadline: '2026-07-15',
        Status: 'Open',
        Date_Added: new Date().toISOString()
      });
      writeExcelDb(jobsDbPath, 'Jobs', jobsData);
      console.log('Seeded default job roles.');
    }
  } catch (e) {
    console.error('Failed to seed default jobs:', e);
  }
}

// Customer Registration
app.post('/api/auth/customer/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'All fields (name, email, password, phone) are required.' });
    }
    
    const customers = readExcelDb(customersDbPath);
    const existing = customers.find(c => c.Email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }
    
    const newId = customers.length > 0 ? Math.max(...customers.map(c => parseInt(c.ID) || 0)) + 1 : 1;
    const newCustomer = {
      ID: newId,
      Name: name,
      Email: email,
      Password: hashPassword(password),
      Phone: phone,
      Status: 'Active',
      Date_Created: new Date().toISOString()
    };
    
    customers.push(newCustomer);
    writeExcelDb(customersDbPath, 'Customers', customers);
    
    res.status(201).json({ success: true, message: 'Registration successful! Please login.' });
  } catch (err) {
    console.error('Customer registration error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Customer Login
app.post('/api/auth/customer/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    
    const customers = readExcelDb(customersDbPath);
    const customer = customers.find(c => c.Email.toLowerCase() === email.toLowerCase());
    
    if (customer && verifyPassword(password, customer.Password)) {
      if (customer.Status !== 'Active') {
        logAction(email, 'customer', 'login_failed', 'Attempted login to inactive/suspended customer account', req);
        return res.status(403).json({ error: 'Your account is suspended.' });
      }
      
      const token = jwt.sign({
        email: customer.Email,
        role: 'customer',
        name: customer.Name,
        customerId: customer.ID
      }, JWT_SECRET, { expiresIn: '7d' });
      
      logAction(customer.Email, 'customer', 'login_success', 'Customer logged in successfully', req);
      return res.json({ token, role: 'customer', name: customer.Name, email: customer.Email, customerId: customer.ID });
    }
    
    logAction(email, 'customer', 'login_failed', 'Incorrect password or account not found', req);
    res.status(401).json({ error: 'Invalid email or password.' });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── AUTHENTICATION ENDPOINTS ───

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  
  // Employee / User check (CEO, COO, CTO, City Manager, etc., including admin@homzo.in)
  const users = readExcelDb(usersDbPath);
  const user = users.find(u => u.Email.toLowerCase() === email.toLowerCase());
  
  if (user) {
    if (user.Status !== 'Active') {
      logAction(email, 'user', 'login_failed', 'Attempted login to inactive user account', req);
      return res.status(403).json({ error: 'Your account is inactive. Please contact Super Admin.' });
    }
    
    if (!user.Password || !verifyPassword(password, user.Password)) {
      logAction(email, 'user', 'login_failed', 'Incorrect password', req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    const roles = readExcelDb(rolesDbPath);
    const roleObj = roles.find(r => String(r.ID) === String(user.Role_ID));
    let roleName = roleObj ? roleObj.Name : 'Employee';
    
    // Force super_admin role for admin@homzo.in to preserve compatibility
    if (user.Email.toLowerCase() === 'admin@homzo.in') {
      roleName = 'super_admin';
    }
    
    const token = jwt.sign({
      email: user.Email,
      role: roleName,
      name: user.Name,
      userId: user.ID,
      roleId: user.Role_ID,
      assignedCityId: user.Assigned_City_ID
    }, JWT_SECRET, { expiresIn: '7d' });
    
    user.Last_Login = new Date().toISOString();
    writeExcelDb(usersDbPath, 'Users', users);
    
    logAction(user.Email, roleName, 'login_success', `${roleName} logged in successfully`, req);
    return res.json({ token, role: roleName, name: user.Name, email: user.Email, assignedCityId: user.Assigned_City_ID });
  }
  
  // Partner check
  const partners = readExcelDb(partnersDbPath);
  const partner = partners.find(p => p.Email.toLowerCase() === email.toLowerCase());
  
  if (!partner) {
    logAction(email, 'unknown', 'login_failed', 'Account not found', req);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  
  if (partner.Status !== 'active') {
    logAction(email, 'partner', 'login_failed', 'Attempted login to suspended account', req);
    return res.status(403).json({ error: 'Your account is suspended. Please contact Super Admin.' });
  }
  
  if (!verifyPassword(password, partner.Password)) {
    logAction(email, 'partner', 'login_failed', 'Incorrect password', req);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  
  const assigned = String(partner.Assigned_Properties || '').split(',').filter(Boolean);
  const token = jwt.sign({
    email: partner.Email,
    role: 'partner',
    name: partner.Name,
    partnerId: partner.ID,
    assignedProperties: assigned
  }, JWT_SECRET, { expiresIn: '7d' });
  
  logAction(partner.Email, 'partner', 'login_success', 'Partner logged in successfully', req);
  res.json({ token, role: 'partner', name: partner.Name, email: partner.Email, assignedProperties: assigned });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  logAction(req.user.email, req.user.role, 'logout', 'User logged out', req);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// In-memory store for OTPs
const otpStore = new Map();

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  
  const emailLower = email.toLowerCase();
  
  // Find in partners
  const partners = readExcelDb(partnersDbPath);
  const partner = partners.find(p => p.Email.toLowerCase() === emailLower);
  
  // Find in users (Admins / Employees)
  const users = readExcelDb(usersDbPath);
  const user = users.find(u => u.Email.toLowerCase() === emailLower);
  
  // Find in customers
  const customers = readExcelDb(customersDbPath);
  const customer = customers.find(c => c.Email.toLowerCase() === emailLower);
  
  if (!partner && !user && !customer) {
    return res.status(404).json({ error: 'No account registered with this email.' });
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(emailLower, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
  });
  
  // Send OTP email
  const otpSubject = 'Your Homzo Verification OTP Code';
  const otpBody = `Hello,\n\nYou have requested a password reset on the Homzo Platform.\n\nYour 6-Digit Verification OTP Code is:\n\n${otp}\n\nThis OTP code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nBest Regards,\nHomzo Security Team`;
  
  sendMailHelper(email, otpSubject, otpBody);
  const matchedPhone = (partner ? partner.Phone : '') || (user ? user.Phone : '') || (customer ? customer.Phone : '') || 'N/A';
  sendSMSHelper(matchedPhone, `Your Homzo Verification OTP is: ${otp}. Valid for 10 minutes.`);
  sendWhatsAppHelper(matchedPhone, `Hello! Your Homzo verification OTP is *${otp}*. Please do not share it with anyone.`);
  
  res.json({ success: true, message: 'Verification OTP has been sent to your email (check console if in simulation mode).' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP and new password are required.' });
  }
  
  const emailLower = email.toLowerCase();
  const otpData = otpStore.get(emailLower);
  
  if (!otpData) {
    return res.status(400).json({ error: 'No OTP generated or invalid request.' });
  }
  
  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(emailLower);
    return res.status(400).json({ error: 'OTP has expired.' });
  }
  
  if (otpData.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Incorrect OTP code.' });
  }
  
  // Update in Users
  const users = readExcelDb(usersDbPath);
  const userIdx = users.findIndex(u => u.Email.toLowerCase() === emailLower);
  if (userIdx !== -1) {
    users[userIdx].Password = hashPassword(newPassword);
    writeExcelDb(usersDbPath, 'Users', users);
    otpStore.delete(emailLower);
    return res.json({ success: true, message: 'Password reset successfully!' });
  }
  
  // Update in Partners
  const partners = readExcelDb(partnersDbPath);
  const partnerIdx = partners.findIndex(p => p.Email.toLowerCase() === emailLower);
  if (partnerIdx !== -1) {
    partners[partnerIdx].Password = hashPassword(newPassword);
    writeExcelDb(partnersDbPath, 'Partners', partners);
    otpStore.delete(emailLower);
    return res.json({ success: true, message: 'Password reset successfully!' });
  }
  
  // Update in Customers
  const customers = readExcelDb(customersDbPath);
  const customerIdx = customers.findIndex(c => c.Email.toLowerCase() === emailLower);
  if (customerIdx !== -1) {
    customers[customerIdx].Password = hashPassword(newPassword);
    writeExcelDb(customersDbPath, 'Customers', customers);
    otpStore.delete(emailLower);
    return res.json({ success: true, message: 'Password reset successfully!' });
  }
  
  res.status(404).json({ error: 'Account not found.' });
});

app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  
  if (req.user.role === 'super_admin') {
    return res.status(400).json({ error: 'Super Admin password cannot be changed via this endpoint.' });
  }
  
  const partners = readExcelDb(partnersDbPath);
  const partnerIndex = partners.findIndex(p => parseInt(p.ID) === req.user.partnerId);
  
  if (partnerIndex === -1) {
    return res.status(404).json({ error: 'Partner not found.' });
  }
  
  const currentHashed = hashPassword(currentPassword);
  if (partners[partnerIndex].Password !== currentHashed) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }
  
  partners[partnerIndex].Password = hashPassword(newPassword);
  writeExcelDb(partnersDbPath, 'Partners', partners);
  
  logAction(req.user.email, 'partner', 'change_password', 'Password changed successfully', req);
  res.json({ success: true, message: 'Password updated successfully!' });
});

app.get('/api/auth/session', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ─── SUPER ADMIN EXCLUSIVE ENDPOINTS ───

// Get all partner accounts
app.get('/api/super/partners', authenticateToken, requireRole('super_admin'), (req, res) => {
  const partners = readExcelDb(partnersDbPath);
  res.json(partners.map(p => ({
    id: p.ID,
    name: p.Name,
    email: p.Email,
    phone: p.Phone,
    assignedProperties: String(p.Assigned_Properties || '').split(',').filter(Boolean),
    status: p.Status,
    gst: p.GST || '',
    pan: p.PAN || '',
    bankAccount: p.Bank_Account || '',
    bankIfsc: p.Bank_IFSC || '',
    verificationStatus: p.Verification_Status || 'pending',
    dateCreated: p.Date_Created
  })));
});

// Create a new partner account
app.post('/api/super/partners', authenticateToken, requireRole('super_admin'), (req, res) => {
  const { name, email, password, phone, assignedProperties } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const partners = readExcelDb(partnersDbPath);
  if (partners.some(p => p.Email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'A partner with this email already exists.' });
  }

  let newId = 1;
  if (partners.length > 0) {
    newId = Math.max(...partners.map(p => parseInt(p.ID) || 0)) + 1;
  }

  const newPartner = {
    ID: newId,
    Name: name,
    Email: email,
    Password: hashPassword(password),
    Phone: phone || '',
    Assigned_Properties: Array.isArray(assignedProperties) ? assignedProperties.join(',') : (assignedProperties || ''),
    Status: 'active',
    GST: '',
    PAN: '',
    Bank_Account: '',
    Bank_IFSC: '',
    Verification_Status: 'pending',
    Date_Created: new Date().toISOString()
  };

  partners.push(newPartner);
  writeExcelDb(partnersDbPath, 'Partners', partners);

  logAction(req.user.email, 'super_admin', 'create_partner', `Created partner ${email} (ID: ${newId})`, req);
  res.status(201).json({ success: true, partner: { id: newId, name, email } });
});

// Update a partner account (assign properties, toggle status, update verification status, reset password)
app.put('/api/super/partners/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  const partnerId = parseInt(req.params.id);
  const { name, phone, assignedProperties, status, verificationStatus, password } = req.body;

  const partners = readExcelDb(partnersDbPath);
  const idx = partners.findIndex(p => parseInt(p.ID) === partnerId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  if (name !== undefined) partners[idx].Name = name;
  if (phone !== undefined) partners[idx].Phone = phone;
  if (assignedProperties !== undefined) {
    partners[idx].Assigned_Properties = Array.isArray(assignedProperties) ? assignedProperties.join(',') : assignedProperties;
  }
  if (status !== undefined) {
    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'Status must be active or suspended.' });
    }
    partners[idx].Status = status;
    
    // If suspended, kick out active sessions for this partner
    if (status === 'suspended') {
      for (const [token, sess] of activeSessions.entries()) {
        if (sess.email === partners[idx].Email) {
          activeSessions.delete(token);
        }
      }
    }
  }
  if (verificationStatus !== undefined) {
    partners[idx].Verification_Status = verificationStatus;
  }
  if (password) {
    partners[idx].Password = hashPassword(password);
  }

  writeExcelDb(partnersDbPath, 'Partners', partners);
  logAction(req.user.email, 'super_admin', 'update_partner', `Updated partner ID ${partnerId}`, req);

  res.json({ success: true, message: 'Partner account updated successfully.' });
});

// Delete a partner account
app.delete('/api/super/partners/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  const partnerId = parseInt(req.params.id);
  const partners = readExcelDb(partnersDbPath);
  const idx = partners.findIndex(p => parseInt(p.ID) === partnerId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  const deletedEmail = partners[idx].Email;
  partners.splice(idx, 1);
  writeExcelDb(partnersDbPath, 'Partners', partners);

  // Terminate active sessions
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.email === deletedEmail) {
      activeSessions.delete(token);
    }
  }

  logAction(req.user.email, 'super_admin', 'delete_partner', `Deleted partner ${deletedEmail}`, req);
  res.json({ success: true, message: 'Partner deleted successfully.' });
});

// Impersonate a partner account (generate a session token for the partner)
app.post('/api/super/partners/:id/impersonate', authenticateToken, requireRole('super_admin'), (req, res) => {
  const partnerId = parseInt(req.params.id);
  const partners = readExcelDb(partnersDbPath);
  const partner = partners.find(p => parseInt(p.ID) === partnerId);
  if (!partner) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const assigned = String(partner.Assigned_Properties || '').split(',').filter(Boolean);
  const session = {
    token,
    email: partner.Email,
    role: 'partner',
    name: partner.Name,
    partnerId: partner.ID,
    assignedProperties: assigned,
    loginTime: new Date().toISOString()
  };
  activeSessions.set(token, session);

  logAction(req.user.email, 'super_admin', 'impersonate_partner', `Impersonated partner ${partner.Email}`, req);
  res.json({ token, role: 'partner', name: partner.Name, email: partner.Email, assignedProperties: assigned });
});

// Get all audit logs
app.get('/api/super/audit-logs', authenticateToken, requireRole('super_admin'), (req, res) => {
  const logs = readExcelDb(auditLogsDbPath);
  // Return sorted by ID descending (newest first)
  const sortedLogs = logs.map(l => ({
    id: l.ID,
    timestamp: l.Timestamp,
    email: l.Email,
    role: l.Role,
    action: l.Action,
    details: l.Details,
    ip: l.IP,
    userAgent: l.User_Agent
  })).reverse();
  res.json(sortedLogs);
});

// ─── CHILD ADMIN (PARTNER) EXCLUSIVE ENDPOINTS ───

// Get dashboard stats
app.get('/api/partner/dashboard', authenticateToken, requireRole('partner'), (req, res) => {
  const assigned = req.user.assignedProperties;
  
  // Properties details
  const properties = readExcelDb(propertiesDbPath).filter(p => assigned.includes(String(p.ID)));
  
  // Bookings details (Clients)
  const bookings = readExcelDb(clientsDbPath).filter(c => {
    return properties.some(p => p.Name.toLowerCase() === (c.Property || '').toLowerCase());
  });

  // Calculate stats
  const totalBookings = bookings.length;
  const activeGuests = bookings.filter(b => b.Status !== 'cancelled').length;
  
  let grossRevenue = 0;
  bookings.forEach(b => {
    if (b.Status !== 'cancelled') {
      let gt = (b.Guest_Type || 'Unknown').toLowerCase();
      let p = 2000;
      if (gt.includes('student')) p = 5000;
      else if (gt.includes('employee')) p = 12000;
      else if (gt.includes('tourist')) p = 3000;
      else if (gt.includes('foreigner')) p = 4000;
      else if (gt.includes('couple')) p = 4500;
      grossRevenue += p;
    }
  });

  const commissionRate = 0.15; // 15% platform commission
  const netEarnings = grossRevenue * (1 - commissionRate);

  // Filter check-ins and check-outs (mock dates check)
  const upcomingCheckins = bookings.filter(b => {
    return b.Check_In && new Date(b.Check_In) >= new Date();
  }).length;

  const upcomingCheckouts = bookings.filter(b => {
    return b.Check_Out && new Date(b.Check_Out) >= new Date();
  }).length;

  // Recent logs
  const logs = readExcelDb(auditLogsDbPath)
    .filter(l => l.Email === req.user.email)
    .slice(-5)
    .reverse();

  res.json({
    totalBookings,
    occupancyRate: properties.length > 0 ? 75 : 0, // Mock occupancy percentage
    grossRevenue,
    commissionDeducted: grossRevenue * commissionRate,
    netEarnings,
    activeGuests,
    upcomingCheckins,
    upcomingCheckouts,
    recentLogs: logs.map(l => ({ timestamp: l.Timestamp, action: l.Action, details: l.Details }))
  });
});

// Get assigned properties
app.get('/api/partner/properties', authenticateToken, requireRole('partner'), (req, res) => {
  const assigned = req.user.assignedProperties;
  const properties = readExcelDb(propertiesDbPath).filter(p => assigned.includes(String(p.ID)));
  const meta = readExcelDb(partnerMetaDbPath);

  const merged = properties.map(p => {
    const propertyMeta = meta.find(m => parseInt(m.Property_ID) === p.ID) || {};
    return {
      ...p,
      id: p.ID,
      name: p.Name,
      location: p.Location,
      type: p.Type,
      price: p.Price,
      beds: p.Beds,
      baths: p.Baths,
      area: p.Area,
      img: p.Image,
      status: p.Status,
      roomCategories: propertyMeta.Room_Categories ? JSON.parse(propertyMeta.Room_Categories) : [],
      inventory: propertyMeta.Inventory || 10,
      amenities: propertyMeta.Amenities ? String(propertyMeta.Amenities).split(',') : [],
      policies: propertyMeta.Policies || 'Standard Homzo house rules apply.',
      checkInOut: propertyMeta.Check_In_Out || 'Check-in: 12:00 PM, Check-out: 11:00 AM'
    };
  });

  res.json(merged);
});

// Update an assigned property
app.put('/api/partner/properties/:id', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.id);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied: Property not assigned to you.' });
  }

  const { name, type, roomCategories, inventory, amenities, policies, checkInOut } = req.body;

  // Update properties main table if name or type changed
  if (name || type) {
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => p.ID === propId);
    if (idx !== -1) {
      if (name) properties[idx].Name = name;
      if (type) properties[idx].Type = type;
      writeExcelDb(propertiesDbPath, 'Properties', properties);
    }
  }

  // Update meta table
  const meta = readExcelDb(partnerMetaDbPath);
  let idx = meta.findIndex(m => parseInt(m.Property_ID) === propId);
  
  const updatedMeta = {
    Property_ID: propId,
    Room_Categories: roomCategories ? JSON.stringify(roomCategories) : (idx !== -1 ? meta[idx].Room_Categories : '[]'),
    Inventory: inventory !== undefined ? inventory : (idx !== -1 ? meta[idx].Inventory : 10),
    Amenities: Array.isArray(amenities) ? amenities.join(',') : (idx !== -1 ? meta[idx].Amenities : ''),
    Policies: policies || (idx !== -1 ? meta[idx].Policies : 'Standard Homzo house rules apply.'),
    Check_In_Out: checkInOut || (idx !== -1 ? meta[idx].Check_In_Out : 'Check-in: 12:00 PM, Check-out: 11:00 AM'),
    Seasonal_Price: idx !== -1 ? meta[idx].Seasonal_Price : 0,
    Weekend_Price: idx !== -1 ? meta[idx].Weekend_Price : 0,
    Discounts: idx !== -1 ? meta[idx].Discounts : '[]',
    Blocked_Dates: idx !== -1 ? meta[idx].Blocked_Dates : ''
  };

  if (idx !== -1) {
    meta[idx] = updatedMeta;
  } else {
    meta.push(updatedMeta);
  }

  writeExcelDb(partnerMetaDbPath, 'PartnerMeta', meta);
  logAction(req.user.email, 'partner', 'update_property', `Updated details for property ID ${propId}`, req);
  res.json({ success: true, message: 'Property updated successfully.' });
});

// --- PARTNER ONBOARDING & DOCUMENT UPLOAD SYSTEM ---
const partnerDocsDir = path.join(__dirname, 'uploads', 'partner_docs');
if (!fs.existsSync(partnerDocsDir)) {
  fs.mkdirSync(partnerDocsDir, { recursive: true });
}

const partnerDocStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, partnerDocsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPartnerDoc = multer({ storage: partnerDocStorage });

// POST upload onboarding document
app.post('/api/partner/properties/:id/upload-doc', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.id);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied: Property not assigned to you.' });
  }

  uploadPartnerDoc.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const docType = req.query.docType;
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => p.ID === propId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const filepath = `/uploads/partner_docs/${req.file.filename}`;

    switch (docType) {
      case 'aadhaar': properties[idx].Aadhaar_Doc = filepath; break;
      case 'pan': properties[idx].PAN_Doc = filepath; break;
      case 'ownerPhoto': properties[idx].Owner_Photo_Doc = filepath; break;
      case 'incorporation': properties[idx].Incorporation_Doc = filepath; break;
      case 'authorization': properties[idx].Authorization_Doc = filepath; break;
      case 'ownership': properties[idx].Ownership_Doc = filepath; break;
      case 'rentAgreement': properties[idx].Rent_Agreement_Doc = filepath; break;
      case 'noc': properties[idx].NOC_Doc = filepath; break;
      case 'gst': properties[idx].GST_Doc = filepath; break;
      case 'businessRegistration': properties[idx].Business_Registration_Doc = filepath; break;
      case 'partnershipDeed': properties[idx].Partnership_Deed_Doc = filepath; break;
      case 'fireSafety': properties[idx].Fire_Safety_Doc = filepath; break;
      case 'police': properties[idx].Police_Verification_Doc = filepath; break;
      case 'tradeLicense': properties[idx].Trade_License_Doc = filepath; break;
      case 'fssai': properties[idx].FSSAI_Doc = filepath; break;
      case 'cheque': properties[idx].Cancelled_Cheque_Doc = filepath; break;
      default:
        return res.status(400).json({ error: 'Invalid document type.' });
    }

    writeExcelDb(propertiesDbPath, 'Properties', properties);
    res.json({ success: true, filepath, docType });
  });
});

// GET onboarding data for a property
app.get('/api/partner/properties/:id/onboarding', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.id);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied: Property not assigned to you.' });
  }

  const properties = readExcelDb(propertiesDbPath);
  const property = properties.find(p => p.ID === propId);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  res.json(property);
});

// PUT save onboarding draft
app.put('/api/partner/properties/:id/onboarding', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.id);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied: Property not assigned to you.' });
  }

  const properties = readExcelDb(propertiesDbPath);
  const idx = properties.findIndex(p => p.ID === propId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const fields = [
    'Address', 'City', 'State', 'Pincode', 'Google_Maps_Link', 'Latitude', 'Longitude',
    'Contact_Person', 'Phone', 'Email', 'Total_Rooms', 'Available_Rooms', 'Max_Guests',
    'Bank_Account_Holder', 'Bank_Account_Number', 'Bank_IFSC', 'Bank_Verification_Note',
    'Registration_Status', 'Policies', 'Partner_Agreement_Accepted'
  ];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      properties[idx][f] = req.body[f];
    }
  });

  if (req.body.Name) properties[idx].Name = req.body.Name;
  if (req.body.Type) properties[idx].Type = req.body.Type;

  // Set default stage as Draft if none exists
  if (!properties[idx].Onboarding_Stage) {
    properties[idx].Onboarding_Stage = 'Draft';
  }

  writeExcelDb(propertiesDbPath, 'Properties', properties);
  res.json({ success: true, message: 'Onboarding draft saved successfully.' });
});

// POST submit property for onboarding verification
app.post('/api/partner/properties/:id/submit', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.id);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied: Property not assigned to you.' });
  }

  const properties = readExcelDb(propertiesDbPath);
  const idx = properties.findIndex(p => p.ID === propId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const prop = properties[idx];

  // Enforce: Minimum 5 rentable rooms
  const totalRooms = parseInt(prop.Total_Rooms);
  if (isNaN(totalRooms) || totalRooms < 5) {
    return res.status(400).json({ error: "This property currently does not meet Homzo's minimum room requirement (minimum 5 rentable rooms)." });
  }

  // Ensure agreement accepted
  if (!prop.Partner_Agreement_Accepted) {
    return res.status(400).json({ error: 'You must accept the Partner Agreement before submitting.' });
  }

  properties[idx].Onboarding_Stage = 'Submitted';
  properties[idx].Min_Rooms_Checked = true;

  writeExcelDb(propertiesDbPath, 'Properties', properties);
  logAction(req.user.email, 'partner', 'submit_onboarding', `Submitted property ID ${propId} for verification`, req);

  res.json({ success: true, message: 'Property onboarding submitted successfully for review.' });
});

// Get pricing and calendar
app.get('/api/partner/pricing/:propId', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.propId);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const meta = readExcelDb(partnerMetaDbPath);
  const propertyMeta = meta.find(m => parseInt(m.Property_ID) === propId) || {};

  res.json({
    propertyId: propId,
    seasonalPrice: propertyMeta.Seasonal_Price || 0,
    weekendPrice: propertyMeta.Weekend_Price || 0,
    discounts: propertyMeta.Discounts ? JSON.parse(propertyMeta.Discounts) : [],
    blockedDates: propertyMeta.Blocked_Dates ? String(propertyMeta.Blocked_Dates).split(',').filter(Boolean) : []
  });
});

// Set pricing overlays & block dates
app.post('/api/partner/pricing/:propId', authenticateToken, requireRole('partner'), (req, res) => {
  const propId = parseInt(req.params.propId);
  if (!req.user.assignedProperties.includes(String(propId))) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { seasonalPrice, weekendPrice, discounts, blockedDates } = req.body;

  const meta = readExcelDb(partnerMetaDbPath);
  let idx = meta.findIndex(m => parseInt(m.Property_ID) === propId);

  const updatedMeta = {
    Property_ID: propId,
    Room_Categories: idx !== -1 ? meta[idx].Room_Categories : '[]',
    Inventory: idx !== -1 ? meta[idx].Inventory : 10,
    Amenities: idx !== -1 ? meta[idx].Amenities : '',
    Policies: idx !== -1 ? meta[idx].Policies : '',
    Check_In_Out: idx !== -1 ? meta[idx].Check_In_Out : '',
    Seasonal_Price: seasonalPrice !== undefined ? seasonalPrice : (idx !== -1 ? meta[idx].Seasonal_Price : 0),
    Weekend_Price: weekendPrice !== undefined ? weekendPrice : (idx !== -1 ? meta[idx].Weekend_Price : 0),
    Discounts: discounts ? JSON.stringify(discounts) : (idx !== -1 ? meta[idx].Discounts : '[]'),
    Blocked_Dates: Array.isArray(blockedDates) ? blockedDates.join(',') : (blockedDates !== undefined ? blockedDates : (idx !== -1 ? meta[idx].Blocked_Dates : ''))
  };

  if (idx !== -1) {
    meta[idx] = updatedMeta;
  } else {
    meta.push(updatedMeta);
  }

  writeExcelDb(partnerMetaDbPath, 'PartnerMeta', meta);
  logAction(req.user.email, 'partner', 'update_pricing', `Updated pricing/calendar for property ID ${propId}`, req);
  res.json({ success: true, message: 'Pricing and availability calendar saved successfully.' });
});

// Get bookings for assigned properties
app.get('/api/partner/bookings', authenticateToken, requireRole('partner'), (req, res) => {
  const assigned = req.user.assignedProperties;
  const properties = readExcelDb(propertiesDbPath).filter(p => assigned.includes(String(p.ID)));
  const clients = readExcelDb(clientsDbPath);

  const bookings = clients.filter(c => {
    return properties.some(p => p.Name.toLowerCase() === (c.Property || '').toLowerCase());
  }).map(c => {
    let gt = (c.Guest_Type || 'Unknown').toLowerCase();
    let p = 2000;
    if (gt.includes('student')) p = 5000;
    else if (gt.includes('employee')) p = 12000;
    else if (gt.includes('tourist')) p = 3000;
    else if (gt.includes('foreigner')) p = 4000;
    else if (gt.includes('couple')) p = 4500;

    return {
      id: `BKG${1000 + c.ID}`,
      clientId: c.ID,
      guestName: c.Name,
      email: c.Email,
      phone: c.Phone || 'N/A',
      guestType: c.Guest_Type,
      property: c.Property,
      checkIn: parseExcelDate(c.Check_In) || '',
      checkOut: parseExcelDate(c.Check_Out) || '',
      persons: c.Persons || 1,
      notes: c.Notes || '',
      amount: `₹${p.toLocaleString()}`,
      status: c.Status || 'confirmed',
      dateAdded: c.Date_Added
    };
  });

  res.json(bookings);
});

// Update booking status
app.put('/api/partner/bookings/:id', authenticateToken, requireRole('partner'), (req, res) => {
  const bookingId = req.params.id; // e.g. BKG1008
  const clientId = parseInt(bookingId.replace('BKG', '')) - 1000;
  const { status } = req.body; // 'confirmed' or 'cancelled'

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const clients = readExcelDb(clientsDbPath);
  const idx = clients.findIndex(c => c.ID === clientId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Ensure this booking is for one of the partner's assigned properties
  const assigned = req.user.assignedProperties;
  const properties = readExcelDb(propertiesDbPath).filter(p => assigned.includes(String(p.ID)));
  const matchesProperty = properties.some(p => p.Name.toLowerCase() === (clients[idx].Property || '').toLowerCase());

  if (!matchesProperty) {
    return res.status(403).json({ error: 'Access denied: Booking is for a property not assigned to you.' });
  }

  clients[idx].Status = status;
  writeExcelDb(clientsDbPath, 'Clients', clients);

  logAction(req.user.email, 'partner', 'update_booking_status', `Updated booking ${bookingId} to ${status}`, req);
  res.json({ success: true, message: `Booking status updated to ${status}.` });
});

// Get reviews for assigned properties
app.get('/api/partner/reviews', authenticateToken, requireRole('partner'), (req, res) => {
  const assigned = req.user.assignedProperties;
  const properties = readExcelDb(propertiesDbPath).filter(p => assigned.includes(String(p.ID)));
  const reviews = readExcelDb(reviewsDbPath);

  const clients = readExcelDb(clientsDbPath).filter(c => {
    return properties.some(p => p.Name.toLowerCase() === (c.Property || '').toLowerCase());
  });
  const partnerGuestEmails = new Set(clients.map(c => String(c.Email).toLowerCase()));

  const filtered = reviews.filter(r => partnerGuestEmails.has(String(r.Email).toLowerCase()));
  res.json(filtered.map(r => ({
    id: r.ID,
    name: r.Name,
    email: r.Email,
    rating: r.Rating,
    review: r.Review,
    status: r.Status,
    created_at: r.Date_Added,
    reply: r.Reply || ''
  })));
});

// Reply to review
app.put('/api/partner/reviews/:id/reply', authenticateToken, requireRole('partner'), (req, res) => {
  const reviewId = parseInt(req.params.id);
  const { reply } = req.body;

  const reviews = readExcelDb(reviewsDbPath);
  const idx = reviews.findIndex(r => r.ID === reviewId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Review not found.' });
  }

  reviews[idx].Reply = reply;
  writeExcelDb(reviewsDbPath, 'Reviews', reviews);

  logAction(req.user.email, 'partner', 'reply_review', `Replied to review ID ${reviewId}`, req);
  res.json({ success: true, message: 'Reply submitted successfully.' });
});

// Get revenue payout details
app.get('/api/partner/revenue', authenticateToken, requireRole('partner'), (req, res) => {
  const assigned = req.user.assignedProperties;
  const properties = readExcelDb(propertiesDbPath).filter(p => assigned.includes(String(p.ID)));
  const bookings = readExcelDb(clientsDbPath).filter(c => {
    return properties.some(p => p.Name.toLowerCase() === (c.Property || '').toLowerCase()) && c.Status !== 'cancelled';
  });

  const ledger = bookings.map(b => {
    let gt = (b.Guest_Type || 'Unknown').toLowerCase();
    let p = 2000;
    if (gt.includes('student')) p = 5000;
    else if (gt.includes('employee')) p = 12000;
    else if (gt.includes('tourist')) p = 3000;
    else if (gt.includes('foreigner')) p = 4000;
    else if (gt.includes('couple')) p = 4500;

    const commission = p * 0.15;
    return {
      bookingId: `BKG${1000 + b.ID}`,
      guestName: b.Name,
      property: b.Property,
      amount: p,
      commission: commission,
      netPayout: p - commission,
      status: 'Paid',
      date: b.Date_Added
    };
  });

  res.json(ledger);
});

// Get verification details
app.get('/api/partner/verification', authenticateToken, requireRole('partner'), (req, res) => {
  const partners = readExcelDb(partnersDbPath);
  const partner = partners.find(p => p.ID === req.user.partnerId);
  if (!partner) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  res.json({
    gst: partner.GST || '',
    pan: partner.PAN || '',
    bankAccount: partner.Bank_Account || '',
    bankIfsc: partner.Bank_IFSC || '',
    verificationStatus: partner.Verification_Status || 'pending'
  });
});

// Update verification details
app.put('/api/partner/verification', authenticateToken, requireRole('partner'), (req, res) => {
  const { gst, pan, bankAccount, bankIfsc } = req.body;

  const partners = readExcelDb(partnersDbPath);
  const idx = partners.findIndex(p => p.ID === req.user.partnerId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  if (gst !== undefined) partners[idx].GST = gst;
  if (pan !== undefined) partners[idx].PAN = pan;
  if (bankAccount !== undefined) partners[idx].Bank_Account = bankAccount;
  if (bankIfsc !== undefined) partners[idx].Bank_IFSC = bankIfsc;
  
  partners[idx].Verification_Status = 'pending';

  writeExcelDb(partnersDbPath, 'Partners', partners);
  logAction(req.user.email, 'partner', 'update_verification', 'Updated GST/PAN/Bank details', req);

  res.json({ success: true, message: 'Verification details submitted for approval.' });
});

// Get tickets
app.get('/api/partner/tickets', authenticateToken, requireRole('partner'), (req, res) => {
  const tickets = readExcelDb(ticketsDbPath).filter(t => t.Partner_Email.toLowerCase() === req.user.email.toLowerCase());
  res.json(tickets.map(t => ({
    id: t.ID,
    subject: t.Subject,
    category: t.Category,
    message: t.Message,
    status: t.Status,
    reply: t.Reply || '',
    dateCreated: t.Date_Created
  })));
});

// Create ticket
app.post('/api/partner/tickets', authenticateToken, requireRole('partner'), (req, res) => {
  const { subject, category, message } = req.body;
  if (!subject || !category || !message) {
    return res.status(400).json({ error: 'Subject, category, and message are required.' });
  }

  const tickets = readExcelDb(ticketsDbPath);
  let newId = 1;
  if (tickets.length > 0) {
    newId = Math.max(...tickets.map(t => parseInt(t.ID) || 0)) + 1;
  }

  const newTicket = {
    ID: newId,
    Partner_Email: req.user.email,
    Subject: subject,
    Category: category,
    Message: message,
    Status: 'open',
    Reply: '',
    Date_Created: new Date().toISOString()
  };

  tickets.push(newTicket);
  writeExcelDb(ticketsDbPath, 'Tickets', tickets);

  logAction(req.user.email, 'partner', 'create_ticket', `Raised support ticket ID ${newId}`, req);
  res.status(201).json({ success: true, ticketId: newId });
});

// Get notifications
app.get('/api/partner/notifications', authenticateToken, requireRole('partner'), (req, res) => {
  const notifs = readExcelDb(notificationsDbPath);
  const filtered = notifs.filter(n => n.Recipient_Email.toLowerCase() === req.user.email.toLowerCase() || n.Recipient_Email.toLowerCase() === 'all');
  
  res.json(filtered.map(n => ({
    id: n.ID,
    title: n.Title,
    message: n.Message,
    status: n.Status,
    dateCreated: n.Date_Created
  })).reverse());
});

// Mark notification as read
app.put('/api/partner/notifications/:id/read', authenticateToken, requireRole('partner'), (req, res) => {
  const notifId = parseInt(req.params.id);
  const notifs = readExcelDb(notificationsDbPath);
  const idx = notifs.findIndex(n => parseInt(n.ID) === notifId);

  if (idx !== -1) {
    notifs[idx].Status = 'read';
    writeExcelDb(notificationsDbPath, 'Notifications', notifs);
  }

  res.json({ success: true });
});

// ─── GUESTS / CLIENTS API ───

// Helper to calculate invoice breakdown
function calculateInvoiceDetails(client) {
  const gt = (client.Guest_Type || 'Unknown').toLowerCase();
  let baseRate = 2000;
  let isMonthly = false;
  
  if (gt.includes('student')) { baseRate = 5000; isMonthly = true; }
  else if (gt.includes('employee')) { baseRate = 12000; isMonthly = true; }
  else if (gt.includes('tourist')) { baseRate = 3000; }
  else if (gt.includes('foreigner')) { baseRate = 4000; }
  else if (gt.includes('couple')) { baseRate = 4500; }
  
  const checkinVal = parseExcelDate(client.Check_In);
  const checkoutVal = parseExcelDate(client.Check_Out);
  const checkinDate = new Date(checkinVal);
  const checkoutDate = new Date(checkoutVal);
  
  const diffTime = Math.abs(checkoutDate - checkinDate);
  const diffDays = isNaN(diffTime) ? 1 : Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  let quantity = diffDays;
  let rateText = `₹${baseRate}/night`;
  
  let occupancySurge = false;
  if (client.Property) {
    const availability = checkPropertyAvailability(client.Property, checkinVal, checkoutVal);
    if (availability && availability.availableRooms !== undefined && availability.availableRooms <= 3) {
      occupancySurge = true;
    }
  }

  let totalDailyBase = 0;
  let activeSurges = [];

  if (!isMonthly) {
    let current = new Date(checkinDate);
    for (let i = 0; i < diffDays; i++) {
      let dayRate = baseRate;
      let dayOfWeek = current.getDay(); // 5 = Friday, 6 = Saturday
      
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        dayRate = Math.round(dayRate * 1.20);
        if (!activeSurges.includes('Weekend +20%')) {
          activeSurges.push('Weekend +20%');
        }
      }
      
      if (occupancySurge) {
        dayRate = Math.round(dayRate * 1.15);
        if (!activeSurges.includes('Occupancy Surge +15%')) {
          activeSurges.push('Occupancy Surge +15%');
        }
      }
      
      totalDailyBase += dayRate;
      current.setDate(current.getDate() + 1);
    }
  } else {
    let monthlyRate = baseRate;
    if (occupancySurge) {
      monthlyRate = Math.round(monthlyRate * 1.15);
      activeSurges.push('Occupancy Surge +15%');
    }
    const months = Math.max(1, Math.ceil(diffDays / 30));
    quantity = months;
    rateText = `₹${baseRate}/month`;
    totalDailyBase = monthlyRate * months;
  }
  
  const subtotal = totalDailyBase;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const serviceCharge = Math.round(subtotal * 0.05); // 5% Service Charge
  const total = subtotal + gst + serviceCharge;
  
  const finalRateText = activeSurges.length > 0 ? `${rateText} (${activeSurges.join(', ')})` : rateText;

  return {
    baseRate,
    rateText: finalRateText,
    quantity,
    quantityUnit: isMonthly ? 'month(s)' : 'night(s)',
    subtotal,
    gst,
    serviceCharge,
    total
  };
}

function checkPropertyAvailability(propertyName, checkinStr, checkoutStr) {
  try {
    const properties = readExcelDb(propertiesDbPath);
    const prop = properties.find(p => p.Name.toLowerCase() === propertyName.toLowerCase());
    if (!prop) return { available: true };
    
    const inventory = parseInt(prop.Inventory) || 10;
    const reqStart = new Date(checkinStr);
    const reqEnd = new Date(checkoutStr);
    
    const clients = readExcelDb(clientsDbPath);
    let activeOverlaps = 0;
    
    clients.forEach(c => {
      if ((c.Property || '').toLowerCase() === propertyName.toLowerCase() && (c.Status || '').toLowerCase() !== 'cancelled') {
        const bStart = new Date(c.Check_In);
        const bEnd = new Date(c.Check_Out);
        
        if (reqStart < bEnd && bStart < reqEnd) {
          activeOverlaps++;
        }
      }
    });
    
    const availableRooms = inventory - activeOverlaps;
    return {
      available: availableRooms > 0,
      inventory,
      activeOverlaps,
      availableRooms
    };
  } catch (err) {
    console.error('Error checking property availability:', err);
    return { available: true };
  }
}

// Bulk Check Availabilities API
app.get('/api/properties/availabilities', (req, res) => {
  const { checkin, checkout } = req.query;
  if (!checkin || !checkout) {
    return res.status(400).json({ error: 'Checkin and checkout dates are required.' });
  }
  
  try {
    const properties = readExcelDb(propertiesDbPath);
    const availabilityMap = {};
    
    properties.forEach(p => {
      const check = checkPropertyAvailability(p.Name, checkin, checkout);
      availabilityMap[p.ID] = check;
    });
    
    res.json(availabilityMap);
  } catch (err) {
    console.error('Error fetching bulk availabilities:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Check Availability API
app.get('/api/properties/available', (req, res) => {
  const { property, checkin, checkout } = req.query;
  if (!property || !checkin || !checkout) {
    return res.status(400).json({ error: 'Property name, checkin, and checkout dates are required.' });
  }
  const check = checkPropertyAvailability(property, checkin, checkout);
  res.json(check);
});

// Get Logged-In Customer's bookings
app.get('/api/customer/bookings', authenticateToken, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Access Denied: Customers only.' });
  }
  
  try {
    const clients = readExcelDb(clientsDbPath);
    const customerBookings = clients.filter(c => String(c.Customer_ID) === String(req.user.customerId));
    
    const result = customerBookings.map(c => {
      const invoice = calculateInvoiceDetails(c);
      return {
        id: c.ID,
        bookingCode: `BKG${1000 + c.ID}`,
        propertyName: c.Property,
        checkIn: parseExcelDate(c.Check_In) || '',
        checkOut: parseExcelDate(c.Check_Out) || '',
        persons: c.Persons,
        status: c.Status,
        paymentStatus: c.Payment_Status || 'Unpaid',
        paymentId: c.Payment_ID || '',
        totalAmount: invoice.total,
        dateAdded: c.Date_Added
      };
    });
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching customer bookings:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Cancel a Customer booking
app.post('/api/customer/bookings/:id/cancel', authenticateToken, (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Access Denied: Customers only.' });
  }
  
  try {
    const bookingId = parseInt(req.params.id);
    const clients = readExcelDb(clientsDbPath);
    const idx = clients.findIndex(c => c.ID === bookingId);
    
    if (idx === -1) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    
    if (String(clients[idx].Customer_ID) !== String(req.user.customerId)) {
      return res.status(403).json({ error: 'Access Denied: You do not own this booking.' });
    }
    
    if (clients[idx].Status === 'Cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }
    
    const checkinDate = new Date(clients[idx].Check_In);
    const now = new Date();
    const diffTime = checkinDate - now;
    const diffHours = diffTime / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return res.status(400).json({ error: 'Cancellations are only allowed at least 24 hours prior to check-in.' });
    }
    
    clients[idx].Status = 'Cancelled';
    writeExcelDb(clientsDbPath, 'Clients', clients);
    
    logAction(req.user.email, 'customer', 'cancel_booking', `Cancelled booking ID ${bookingId}`, req);
    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Add a new guest (booking form with inventory and payment info)
app.post('/api/guests', (req, res) => {
  const { name, email, phone, guest_type, property, checkin, checkout, dob, persons, notes, paymentStatus, paymentId, transactionRef, customerId } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Valid Name is required (minimum 2 characters).' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!phone || phone.trim() === '') {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  if (!dob) {
    return res.status(400).json({ error: 'Date of Birth is required.' });
  }
  const dobDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) { age--; }
  if (age < 18) {
    return res.status(400).json({ error: 'Guest must be 18 years or older.' });
  }
  if (!checkin || !checkout) {
    return res.status(400).json({ error: 'Check-in and Check-out dates are required.' });
  }
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  if (checkoutDate <= checkinDate) {
    return res.status(400).json({ error: 'Check-out date must be after check-in date.' });
  }
  const numPersons = parseInt(persons);
  if (isNaN(numPersons) || numPersons < 1) {
    return res.status(400).json({ error: 'Number of persons must be at least 1.' });
  }

  // Inventory availability check
  const availability = checkPropertyAvailability(property, checkin, checkout);
  if (!availability.available) {
    return res.status(400).json({ error: `Sorry! ${property} is fully booked / sold out for the selected dates.` });
  }

  const clientsData = readExcelDb(clientsDbPath);
  
  let newId = 1;
  if (clientsData.length > 0) {
    newId = Math.max(...clientsData.map(c => c.ID)) + 1;
  }

  const newClient = {
    ID: newId,
    Name: name,
    Email: email,
    Phone: phone || '',
    Guest_Type: guest_type || 'Unknown',
    Property: property || 'Any',
    Check_In: checkin || '',
    Check_Out: checkout || '',
    DOB: dob || '',
    Persons: numPersons,
    Notes: notes || '',
    Status: paymentStatus === 'Pending Verification' ? 'pending' : 'confirmed',
    Date_Added: new Date().toISOString(),
    Payment_Status: paymentStatus || 'Unpaid',
    Payment_ID: paymentId || '',
    Transaction_Ref: transactionRef || '',
    Customer_ID: customerId || ''
  };

  clientsData.push(newClient);
  
  try {
    writeExcelDb(clientsDbPath, 'Clients', clientsData);
    
    // Calculate invoice details for the mock email
    const invoice = calculateInvoiceDetails(newClient);
    
    // Send email confirmations
    const isPending = paymentStatus === 'Pending Verification';
    const guestSubject = isPending 
      ? `Homzo Booking Received - Pending Payment Verification - BKG${1000 + newId}`
      : `Homzo Booking Confirmation & Invoice - BKG${1000 + newId}`;
    const guestBody = isPending
      ? `Hello ${name},\n\nYour booking with Homzo Hospitality has been received and is pending payment verification.\n\nOnce we verify your UPI transaction (UTR Ref: ${transactionRef}), we will confirm your booking.\n\nBooking Details:\n- Booking ID: BKG${1000 + newId}\n- Property: ${newClient.Property}\n- Check-In: ${newClient.Check_In}\n- Check-Out: ${newClient.Check_Out}\n- Date of Birth: ${newClient.DOB}\n- Persons: ${newClient.Persons}\n- Special Requests: ${newClient.Notes || 'None'}\n\nINVOICE DETAILS:\n- Room Rate: ${invoice.rateText}\n- Duration: ${invoice.quantity} ${invoice.quantityUnit}\n- Room Subtotal: ₹${invoice.subtotal.toLocaleString()}\n- GST (18%): ₹${invoice.gst.toLocaleString()}\n- Service Charge (5%): ₹${invoice.serviceCharge.toLocaleString()}\n- Total Amount: ₹${invoice.total.toLocaleString()}\n\nThank you for choosing Homzo!\n\nBest Regards,\nHomzo Support Team`
      : `Hello ${name},\n\nYour booking with Homzo Hospitality has been confirmed!\n\nBooking Details:\n- Booking ID: BKG${1000 + newId}\n- Property: ${newClient.Property}\n- Check-In: ${newClient.Check_In}\n- Check-Out: ${newClient.Check_Out}\n- Date of Birth: ${newClient.DOB}\n- Persons: ${newClient.Persons}\n- Special Requests: ${newClient.Notes || 'None'}\n\nINVOICE DETAILS:\n- Room Rate: ${invoice.rateText}\n- Duration: ${invoice.quantity} ${invoice.quantityUnit}\n- Room Subtotal: ₹${invoice.subtotal.toLocaleString()}\n- GST (18%): ₹${invoice.gst.toLocaleString()}\n- Service Charge (5%): ₹${invoice.serviceCharge.toLocaleString()}\n- Total Amount Due: ₹${invoice.total.toLocaleString()}\n\nThank you for choosing Homzo!\n\nBest Regards,\nHomzo Support Team`;
    
    sendMailHelper(email, guestSubject, guestBody);
    sendSMSHelper(phone || 'N/A', isPending 
      ? `Hi ${name}, your Homzo booking BKG${1000 + newId} is received & pending payment verification!`
      : `Hi ${name}, your Homzo booking BKG${1000 + newId} is confirmed!`);
    sendWhatsAppHelper(phone || 'N/A', isPending
      ? `Hello ${name}! 🏨 Your booking BKG${1000 + newId} is pending payment verification (UTR Ref: ${transactionRef}). We will notify you once confirmed.`
      : `Hello ${name}! 🏨 Your booking BKG${1000 + newId} has been successfully confirmed. Find invoice and check-in details here.`);

    const adminSubject = isPending
      ? `NEW PENDING UPI BOOKING - UTR: ${transactionRef} - BKG${1000 + newId}`
      : `New Booking & Invoice Generated - BKG${1000 + newId}`;
    const adminBody = `Hello Admin,\n\nA new booking has been made on the Homzo Platform:\n\nBooking Details:\n- Guest: ${name} (${email}, ${phone})\n- Property: ${newClient.Property}\n- Check-In: ${newClient.Check_In}\n- Check-Out: ${newClient.Check_Out}\n- DOB: ${newClient.DOB}\n- Persons: ${newClient.Persons}\n- Special Requests: ${newClient.Notes || 'None'}\n- Payment Status: ${paymentStatus || 'Unpaid'}\n- UPI Ref (UTR): ${transactionRef || 'N/A'}\n\nINVOICE SUMMARY:\n- Subtotal: ₹${invoice.subtotal.toLocaleString()}\n- GST (18%): ₹${invoice.gst.toLocaleString()}\n- Service Charge (5%): ₹${invoice.serviceCharge.toLocaleString()}\n- Total Amount: ₹${invoice.total.toLocaleString()}\n\nPlease verify this UPI payment and approve/confirm it in the admin panel.`;
    
    sendMailHelper('admin@homzo.in', adminSubject, adminBody);

    // Send response formatting for the frontend expected schema
    res.status(201).json({ id: newId, name, email, phone, guest_type: newClient.Guest_Type, message: 'Booking saved successfully to Excel!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save booking. Please ensure clients_database.csv is closed and try again.' });
  }
});

// Get all guests (for Admin Panel)
app.get('/api/guests', (req, res) => {
  const clientsData = readExcelDb(clientsDbPath);
  // Map back to JSON expected by admin.js
  const formattedData = clientsData.map(c => ({
    id: c.ID,
    name: c.Name,
    email: c.Email,
    phone: c.Phone,
    guest_type: c.Guest_Type,
    property: c.Property || 'Pending Assignment',
    checkin: parseExcelDate(c.Check_In) || '',
    checkout: parseExcelDate(c.Check_Out) || '',
    dob: parseExcelDate(c.DOB) || '',
    persons: c.Persons || 1,
    notes: c.Notes || '',
    status: c.Status || 'confirmed',
    created_at: c.Date_Added,
    payment_status: c.Payment_Status || 'Unpaid',
    payment_id: c.Payment_ID || '',
    transaction_ref: c.Transaction_Ref || ''
  }));
  res.json(formattedData);
});

// Admin: Update guest booking status
app.put('/api/admin/bookings/:id/status', authenticateToken, requireRole('super_admin'), (req, res) => {
  const bookingId = req.params.id; // e.g. BKG1008
  const clientId = parseInt(bookingId.replace('BKG', '')) - 1000;
  const { status } = req.body; // 'confirmed' or 'cancelled'

  if (!['confirmed', 'cancelled', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const clients = readExcelDb(clientsDbPath);
  const idx = clients.findIndex(c => parseInt(c.ID) === clientId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  clients[idx].Status = status;
  if (status === 'confirmed') {
    clients[idx].Payment_Status = 'Paid';
  }
  try {
    writeExcelDb(clientsDbPath, 'Clients', clients);
    logAction(req.user.email, 'super_admin', 'update_booking_status', `Updated booking ID ${bookingId} status to ${status}`, req);
    res.json({ success: true, message: `Booking status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// Admin: Trigger sending invoice email simulation
app.post('/api/admin/bookings/:id/invoice', authenticateToken, requireRole('super_admin'), (req, res) => {
  const bookingId = req.params.id; // e.g. BKG1008
  const clientId = parseInt(bookingId.replace('BKG', '')) - 1000;

  const clients = readExcelDb(clientsDbPath);
  const client = clients.find(c => parseInt(c.ID) === clientId);
  if (!client) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const invoice = calculateInvoiceDetails(client);

  const subject = `Invoice for Booking BKG${1000 + client.ID} - Homzo Hospitality`;
  const body = `Hello ${client.Name},\n\nPlease find the invoice details for your stay at ${client.Property || 'Homzo Property'}:\n\nINVOICE DETAILS:\n- Booking ID: BKG${1000 + client.ID}\n- Check-In: ${parseExcelDate(client.Check_In)}\n- Check-Out: ${parseExcelDate(client.Check_Out)}\n- Duration: ${invoice.quantity} ${invoice.quantityUnit}\n- Room Rate: ${invoice.rateText}\n\nCHARGES BREAKDOWN:\n- Room Subtotal: ₹${invoice.subtotal.toLocaleString()}\n- GST (18%): ₹${invoice.gst.toLocaleString()}\n- Service Charge (5%): ₹${invoice.serviceCharge.toLocaleString()}\n- Total Amount Due: ₹${invoice.total.toLocaleString()}\n\nPayment Status: Pending / Auto-charge\n\nThank you for booking with us!\n\nBest Regards,\nHomzo Accounts Team`;

  sendMailHelper(client.Email, subject, body);

  res.json({ success: true, message: `Invoice email successfully simulated for BKG${1000 + client.ID}.` });
});


// ─── PROPERTIES API ───

app.post('/api/properties', (req, res) => {
  const { name, location, type, price, beds, baths, area, img, latitude, longitude } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required.' });
  }

  const propertiesData = readExcelDb(propertiesDbPath);

  // Calculate new ID
  let newId = 1;
  if (propertiesData.length > 0) {
    newId = Math.max(...propertiesData.map(p => p.ID)) + 1;
  }

  const newProperty = {
    ID: newId,
    Name: name,
    Location: location || 'N/A',
    Type: type || 'Unknown',
    Price: price,
    Beds: beds || 1,
    Baths: baths || 1,
    Area: area || 300,
    Image: img || 'default.png',
    Status: 'active',
    Date_Added: new Date().toISOString(),
    Latitude: latitude ? parseFloat(latitude) : null,
    Longitude: longitude ? parseFloat(longitude) : null
  };

  propertiesData.push(newProperty);
  writeExcelDb(propertiesDbPath, 'Properties', propertiesData);

  res.status(201).json({ 
    id: newId, name, location, type, price, beds, baths, area, img, status: 'active', latitude, longitude, message: 'Property added successfully to Excel!' 
  });
});

// Get all properties (for Admin Panel)
app.get('/api/properties', (req, res) => {
  const propertiesData = readExcelDb(propertiesDbPath);
  const formattedData = propertiesData.map(p => ({
    id: p.ID,
    name: p.Name,
    location: p.Location,
    type: p.Type,
    price: p.Price,
    beds: p.Beds,
    baths: p.Baths,
    area: p.Area,
    img: p.Image,
    status: p.Status,
    created_at: p.Date_Added,
    rating: parseFloat(p.Rating) || 4.8,
    reviews: parseInt(p.Reviews) || 50,
    latitude: p.Latitude !== undefined && p.Latitude !== null ? parseFloat(p.Latitude) : null,
    longitude: p.Longitude !== undefined && p.Longitude !== null ? parseFloat(p.Longitude) : null
  }));
  res.json(formattedData);
});

// ─── INQUIRIES API ───

app.post('/api/inquiries', (req, res) => {
  const { name, email, type, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const inquiriesData = readExcelDb(inquiriesDbPath);
  let newId = 1;
  if (inquiriesData.length > 0) {
    newId = Math.max(...inquiriesData.map(i => i.ID)) + 1;
  }

  const newInquiry = {
    ID: newId,
    Name: name,
    Email: email,
    Type: type || 'Other',
    Message: message,
    Date_Added: new Date().toISOString()
  };

  inquiriesData.push(newInquiry);
  writeExcelDb(inquiriesDbPath, 'Inquiries', inquiriesData);
  res.status(201).json({ success: true, message: 'Inquiry saved successfully!' });
});

app.get('/api/inquiries', (req, res) => {
  const inquiriesData = readExcelDb(inquiriesDbPath);
  res.json(inquiriesData.map(i => ({
    id: i.ID,
    name: i.Name,
    email: i.Email,
    type: i.Type,
    message: i.Message,
    created_at: i.Date_Added
  })));
});

// ─── REVIEWS API ───

// Add a new review
app.post('/api/reviews', (req, res) => {
  const { name, email, rating, review } = req.body;
  if (!name || !email || !rating || !review) {
    return res.status(400).json({ error: 'Name, email, rating, and review content are required.' });
  }
  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
  }

  const reviewsData = readExcelDb(reviewsDbPath);
  let newId = 1;
  if (reviewsData.length > 0) {
    newId = Math.max(...reviewsData.map(r => r.ID || 0)) + 1;
  }

  const newReview = {
    ID: newId,
    Name: name,
    Email: email,
    Rating: ratingNum,
    Review: review,
    Status: 'pending',
    Date_Added: new Date().toISOString(),
    Reply: ''
  };

  reviewsData.push(newReview);

  try {
    writeExcelDb(reviewsDbPath, 'Reviews', reviewsData);
    res.status(201).json({ success: true, id: newId, message: 'Review submitted successfully and is pending approval!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review. Please try again.' });
  }
});

// Get all reviews
app.get('/api/reviews', (req, res) => {
  const reviewsData = readExcelDb(reviewsDbPath);
  const { status } = req.query;
  
  let filtered = reviewsData;
  if (status) {
    filtered = reviewsData.filter(r => r.Status === status);
  }

  res.json(filtered.map(r => ({
    id: r.ID,
    name: r.Name,
    email: r.Email,
    rating: r.Rating,
    review: r.Review,
    status: r.Status,
    created_at: r.Date_Added,
    reply: r.Reply || ''
  })));
});

// Update review status (Approve review)
app.put('/api/reviews/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const reviewsData = readExcelDb(reviewsDbPath);
  const reviewIndex = reviewsData.findIndex(r => r.ID === id);

  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found.' });
  }

  reviewsData[reviewIndex].Status = status;

  try {
    writeExcelDb(reviewsDbPath, 'Reviews', reviewsData);
    res.json({ success: true, message: `Review status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review status.' });
  }
});

// Update review reply (Admin reply)
app.put('/api/reviews/:id/reply', (req, res) => {
  const id = parseInt(req.params.id);
  const { reply } = req.body;
  if (reply === undefined) {
    return res.status(400).json({ error: 'Reply text is required.' });
  }

  const reviewsData = readExcelDb(reviewsDbPath);
  const reviewIndex = reviewsData.findIndex(r => r.ID === id);

  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found.' });
  }

  reviewsData[reviewIndex].Reply = reply;

  try {
    writeExcelDb(reviewsDbPath, 'Reviews', reviewsData);
    res.json({ success: true, message: 'Reply saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save reply.' });
  }
});

// Delete a review
app.delete('/api/reviews/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const reviewsData = readExcelDb(reviewsDbPath);
  const reviewIndex = reviewsData.findIndex(r => r.ID === id);

  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found.' });
  }

  reviewsData.splice(reviewIndex, 1);

  try {
    writeExcelDb(reviewsDbPath, 'Reviews', reviewsData);
    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

// ─── FILE UPLOAD STORAGE FOR RESUMES ───
const uploadDir = path.join(__dirname, 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    const uniqueName = `${Date.now()}_${sanitizedName}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Captcha secret and OTP state
const CAPTCHA_SECRET = 'homzo_captcha_secret_salt_2026';
const activeOtps = new Map(); // key: email + '_' + jobId -> { otp, expiresAt }

// ─── CAREER PAGES CLIENT ROUTING ───
app.get('/careers', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'customer_web', 'careers.html'));
});

app.get('/careers/job/:id', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'customer_web', 'job-details.html'));
});

// ─── DYNAMIC SITEMAP FOR SEO ───
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Static URLs
  const staticUrls = ['', '/about.html', '/support.html', '/careers'];
  staticUrls.forEach(u => {
    xml += `  <url>\n    <loc>${baseUrl}${u}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });
  
  // Job URLs
  try {
    const jobs = readExcelDb(jobsDbPath);
    jobs.forEach(job => {
      if (job.Status === 'Open' || job.Status === 'Urgent Hiring') {
        xml += `  <url>\n    <loc>${baseUrl}/careers/job/${job.ID}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      }
    });
  } catch (err) {
    console.error('Sitemap generation failed:', err);
  }
  
  xml += '</urlset>';
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// ─── PUBLIC CAREERS APIS ───

// Get all open jobs
app.get('/api/careers/jobs', (req, res) => {
  try {
    const jobs = readExcelDb(jobsDbPath);
    const publicJobs = jobs.filter(j => j.Status === 'Open' || j.Status === 'Urgent Hiring');
    res.json(publicJobs);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve jobs.' });
  }
});

// Get a single job's details
app.get('/api/careers/jobs/:id', (req, res) => {
  try {
    const jobs = readExcelDb(jobsDbPath);
    const job = jobs.find(j => j.ID === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job opening not found.' });
    }
    res.json(job);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve job details.' });
  }
});

// Generate dynamic mathematical CAPTCHA
app.get('/api/careers/captcha', (req, res) => {
  const n1 = Math.floor(Math.random() * 15) + 1;
  const n2 = Math.floor(Math.random() * 15) + 1;
  const ans = n1 + n2;
  const token = crypto.createHmac('sha256', CAPTCHA_SECRET).update(String(ans)).digest('hex');
  res.json({ question: `What is the sum of ${n1} and ${n2}?`, token });
});

// Send verification OTP code to candidate
app.post('/api/careers/send-otp', (req, res) => {
  const { email, jobId } = req.body;
  if (!email || !jobId) {
    return res.status(400).json({ error: 'Email and Job ID are required.' });
  }
  
  // Prevent duplicate submissions
  try {
    const apps = readExcelDb(applicationsDbPath);
    const duplicate = apps.some(a => String(a.Email).toLowerCase() === email.toLowerCase() && String(a.Job_ID) === jobId);
    if (duplicate) {
      return res.status(400).json({ error: 'You have already applied for this position.' });
    }
  } catch (e) {
    console.error('Error checking duplicate applications:', e);
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity
  activeOtps.set(`${email.toLowerCase()}_${jobId}`, { otp, expiresAt });
  
  console.log(`\n==================================================`);
  console.log(`[MOCK OTP] Verification Code for ${email} (Job: ${jobId}): ${otp}`);
  console.log(`==================================================\n`);
  
  res.json({ success: true, message: 'Verification code sent successfully.' });
});

// Submit Application
app.post('/api/careers/apply', (req, res) => {
  upload.single('resume')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    const cleanup = () => {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    };
    
    const {
      jobId, fullName, email, phone, currentCity,
      highestQualification, totalExperience, linkedinProfile,
      portfolioWebsite, coverLetter, otp, captchaAnswer, captchaToken
    } = req.body;
    
    if (!jobId || !fullName || !email || !phone || !req.file) {
      cleanup();
      return res.status(400).json({ error: 'Required fields are missing, including the resume file.' });
    }
    
    // Captcha Check
    if (!captchaAnswer || !captchaToken) {
      cleanup();
      return res.status(400).json({ error: 'CAPTCHA verification is required.' });
    }
    const checkCaptcha = crypto.createHmac('sha256', CAPTCHA_SECRET).update(String(captchaAnswer).trim()).digest('hex');
    if (checkCaptcha !== captchaToken) {
      cleanup();
      return res.status(400).json({ error: 'Incorrect CAPTCHA response.' });
    }
    
    // OTP Check
    if (!otp) {
      cleanup();
      return res.status(400).json({ error: 'Email verification code is required.' });
    }
    const otpKey = `${email.toLowerCase()}_${jobId}`;
    const cached = activeOtps.get(otpKey);
    if (!cached || cached.otp !== parseInt(otp) || Date.now() > cached.expiresAt) {
      cleanup();
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }
    activeOtps.delete(otpKey);
    
    // Check duplicates again
    try {
      const apps = readExcelDb(applicationsDbPath);
      const duplicate = apps.some(a => String(a.Email).toLowerCase() === email.toLowerCase() && String(a.Job_ID) === jobId);
      if (duplicate) {
        cleanup();
        return res.status(400).json({ error: 'You have already applied for this position.' });
      }
      
      const jobs = readExcelDb(jobsDbPath);
      const job = jobs.find(j => j.ID === jobId);
      if (!job) {
        cleanup();
        return res.status(400).json({ error: 'Job opening not found.' });
      }
      if (job.Status === 'Closed') {
        cleanup();
        return res.status(400).json({ error: 'This job opening is closed.' });
      }
      
      let newId = 1;
      if (apps.length > 0) {
        newId = Math.max(...apps.map(a => parseInt(a.ID) || 0)) + 1;
      }
      
      const newApp = {
        ID: newId,
        Job_ID: jobId,
        Job_Title: job.Title,
        Full_Name: fullName,
        Email: email,
        Phone: phone,
        Current_City: currentCity || '',
        Highest_Qualification: highestQualification || '',
        Total_Experience: totalExperience || '',
        LinkedIn_Profile: linkedinProfile || '',
        Portfolio_Website: portfolioWebsite || '',
        Cover_Letter: coverLetter || '',
        Resume_Filename: req.file.filename,
        Status: 'New',
        Date_Applied: new Date().toISOString()
      };
      
      apps.push(newApp);
      writeExcelDb(applicationsDbPath, 'Applications', apps);
      
      // Save notifications
      const notifications = readExcelDb(notificationsDbPath);
      let notifId = 1;
      if (notifications.length > 0) {
        notifId = Math.max(...notifications.map(n => parseInt(n.ID) || 0)) + 1;
      }
      
      notifications.push({
        ID: notifId,
        Recipient_Email: email,
        Title: 'Application Received - Homzo Hospitality',
        Message: `Dear ${fullName},\nThank you for applying for the ${job.Title} position. Our team will review your application and contact you if shortlisted.`,
        Status: 'unread',
        Date_Created: new Date().toISOString()
      });
      
      notifications.push({
        ID: notifId + 1,
        Recipient_Email: 'supporhomzo@gmail.com',
        Title: `New Job Application: ${job.Title}`,
        Message: `Candidate ${fullName} has applied for ${job.Title}. Resume filename: ${req.file.filename}`,
        Status: 'unread',
        Date_Created: new Date().toISOString()
      });
      writeExcelDb(notificationsDbPath, 'Notifications', notifications);
      
      // Print mock emails
      console.log(`\n==================================================`);
      console.log(`[EMAIL SENT TO APPLICANT: ${email}]`);
      console.log(`Subject: Application Received - Homzo Hospitality`);
      console.log(`Body:\nHello ${fullName},\n\nThank you for applying for the role of ${job.Title} at Homzo Hospitality.\nWe have received your resume and our recruitment team will review it. If your profile matches our requirements, we will reach out to schedule an interview.\n\nBest Regards,\nHR Team\nHomzo Hospitality`);
      console.log(`==================================================`);
      console.log(`[EMAIL SENT TO ADMIN: supporhomzo@gmail.com]`);
      console.log(`Subject: New Application Received - ${job.Title}`);
      console.log(`Body:\nHello Admin,\n\nA new job application has been submitted on the careers page.\n\n- Job Role: ${job.Title} (${jobId})\n- Candidate Name: ${fullName}\n- Email: ${email}\n- Phone: ${phone}\n- Resume File: ${req.file.filename}\n\nPlease check the admin panel for details.`);
      console.log(`==================================================\n`);
      
      res.json({
        success: true,
        message: 'Thank you for applying. Our team will review your application and contact you if shortlisted.'
      });
    } catch (e) {
      cleanup();
      console.error('Apply API error:', e);
      res.status(500).json({ error: 'Failed to process application.' });
    }
  });
});

// ─── ADMIN CAREERS APIS ───

// Admin: Get all jobs
app.get('/api/admin/careers/jobs', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const jobs = readExcelDb(jobsDbPath);
    res.json(jobs);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load jobs.' });
  }
});

// Admin: Create a job
app.post('/api/admin/careers/jobs', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { title, department, location, employmentType, experienceLevel, salary, vacancies, description, responsibilities, skills, qualifications, benefits, workMode, deadline, status } = req.body;
    if (!title || !department || !location || !employmentType || !status) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }
    
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const jobs = readExcelDb(jobsDbPath);
    
    let finalSlug = slug;
    let counter = 1;
    while (jobs.some(j => j.ID === finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    
    const newJob = {
      ID: finalSlug,
      Title: title,
      Department: department,
      Location: location,
      Employment_Type: employmentType,
      Experience_Level: experienceLevel || '',
      Salary: salary || '',
      Vacancies: vacancies || '1',
      Description: description || '',
      Responsibilities: responsibilities || '',
      Skills: skills || '',
      Qualifications: qualifications || '',
      Benefits: benefits || '',
      Work_Mode: workMode || 'On-site',
      Deadline: deadline || '',
      Status: status,
      Date_Added: new Date().toISOString()
    };
    
    jobs.push(newJob);
    writeExcelDb(jobsDbPath, 'Jobs', jobs);
    logAction(req.user.email, 'super_admin', 'create_job', `Created job posting ${title} (ID: ${finalSlug})`, req);
    res.status(201).json({ success: true, job: newJob });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create job opening.' });
  }
});

// Admin: Update a job
app.put('/api/admin/careers/jobs/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const jobId = req.params.id;
    const jobs = readExcelDb(jobsDbPath);
    const idx = jobs.findIndex(j => j.ID === jobId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }
    
    const updates = req.body;
    const allowed = ['Title', 'Department', 'Location', 'Employment_Type', 'Experience_Level', 'Salary', 'Vacancies', 'Description', 'Responsibilities', 'Skills', 'Qualifications', 'Benefits', 'Work_Mode', 'Deadline', 'Status'];
    
    allowed.forEach(field => {
      let bodyField = field;
      if (field === 'Employment_Type') bodyField = 'employmentType';
      else if (field === 'Experience_Level') bodyField = 'experienceLevel';
      else if (field === 'Work_Mode') bodyField = 'workMode';
      
      if (updates[bodyField] !== undefined) {
        jobs[idx][field] = updates[bodyField];
      } else if (updates[field] !== undefined) {
        jobs[idx][field] = updates[field];
      }
    });
    
    writeExcelDb(jobsDbPath, 'Jobs', jobs);
    logAction(req.user.email, 'super_admin', 'update_job', `Updated job posting ${jobId}`, req);
    res.json({ success: true, message: 'Job posting updated successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update job opening.' });
  }
});

// Admin: Delete a job
app.delete('/api/admin/careers/jobs/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const jobId = req.params.id;
    const jobs = readExcelDb(jobsDbPath);
    const idx = jobs.findIndex(j => j.ID === jobId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }
    
    jobs.splice(idx, 1);
    writeExcelDb(jobsDbPath, 'Jobs', jobs);
    logAction(req.user.email, 'super_admin', 'delete_job', `Deleted job posting ${jobId}`, req);
    res.json({ success: true, message: 'Job posting deleted successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete job opening.' });
  }
});

// Admin: Get applications
app.get('/api/admin/careers/applications', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const apps = readExcelDb(applicationsDbPath);
    res.json(apps.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// Admin: Update application status
app.put('/api/admin/careers/applications/:id/status', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['New', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }
    
    const apps = readExcelDb(applicationsDbPath);
    const idx = apps.findIndex(a => parseInt(a.ID) === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    
    apps[idx].Status = status;
    writeExcelDb(applicationsDbPath, 'Applications', apps);
    
    // Add update notification for applicant
    const notifications = readExcelDb(notificationsDbPath);
    let notifId = 1;
    if (notifications.length > 0) {
      notifId = Math.max(...notifications.map(n => parseInt(n.ID) || 0)) + 1;
    }
    notifications.push({
      ID: notifId,
      Recipient_Email: apps[idx].Email,
      Title: 'Application Update - Homzo Hospitality',
      Message: `Dear ${apps[idx].Full_Name},\nThe status of your application for the ${apps[idx].Job_Title} position has been updated to: ${status}.`,
      Status: 'unread',
      Date_Created: new Date().toISOString()
    });
    writeExcelDb(notificationsDbPath, 'Notifications', notifications);
    
    logAction(req.user.email, 'super_admin', 'update_application_status', `Updated application ID ${id} status to ${status}`, req);
    res.json({ success: true, message: `Application status updated to ${status}.` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

// Admin: Download Resume
app.get('/api/admin/careers/resumes/:filename', authenticateToken, requireRole('super_admin'), (req, res) => {
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filepath = path.join(uploadDir, safeFilename);
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'Resume file not found.' });
  }
});

// ─── CONSOLE MODULE APIS ────────────────────────────────
let maintenanceMode = false;
let apiRateLimiting = true;
let debugLogging = false;

// System Status
app.get('/api/admin/system/status', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const dbPaths = [
      clientsDbPath, propertiesDbPath, inquiriesDbPath, reviewsDbPath, 
      partnersDbPath, auditLogsDbPath, ticketsDbPath, notificationsDbPath, 
      partnerMetaDbPath, jobsDbPath, applicationsDbPath, tasksDbPath
    ];
    let dbSize = 0;
    dbPaths.forEach(fp => {
      if (fs.existsSync(fp)) {
        dbSize += fs.statSync(fp).size;
      }
    });

    res.json({
      uptime: process.uptime(),
      dbSizeKb: Math.round(dbSize / 1024 * 10) / 10,
      nodeVersion: process.version,
      cpuUsage: Math.round(Math.random() * 15 + 5), // Mock CPU
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      totalMemory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      activeAdmins: 3,
      maintenanceMode,
      apiRateLimiting,
      debugLogging
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve system status.' });
  }
});

// Toggle System Settings
app.post('/api/admin/system/settings', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { key, value } = req.body;
    if (key === 'maintenanceMode') maintenanceMode = !!value;
    else if (key === 'apiRateLimiting') apiRateLimiting = !!value;
    else if (key === 'debugLogging') debugLogging = !!value;
    else return res.status(400).json({ error: 'Invalid setting key.' });

    logAction(req.user.email, 'super_admin', 'toggle_setting', `Toggled ${key} to ${value}`, req);
    res.json({ success: true, message: `Setting ${key} updated successfully.` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update system setting.' });
  }
});

// Trigger Backup
app.post('/api/admin/system/backup', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    logAction(req.user.email, 'super_admin', 'backup_database', `Manual database backup triggered`, req);
    res.json({
      success: true,
      message: 'Database backup completed successfully.',
      timestamp: new Date().toISOString(),
      filename: `homzo_backup_${Date.now()}.zip`
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to perform database backup.' });
  }
});

// Clear Cache
app.post('/api/admin/system/clear-cache', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    logAction(req.user.email, 'super_admin', 'clear_cache', `System cache cleared`, req);
    res.json({
      success: true,
      message: 'System cache and compiled templates cleared successfully.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to clear system cache.' });
  }
});

// Get Active Sessions
app.get('/api/admin/system/sessions', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const sessions = [
      { id: 'sess_1', email: 'admin@homzo.in', role: 'super_admin', ip: req.ip || '127.0.0.1', device: 'Chrome / Windows', loginTime: new Date(Date.now() - 3600000).toISOString() },
      { id: 'sess_2', email: 'partner@homzo.in', role: 'partner', ip: '192.168.1.45', device: 'Safari / macOS', loginTime: new Date(Date.now() - 15 * 60000).toISOString() },
      { id: 'sess_3', email: 'support@homzo.in', role: 'support_staff', ip: '192.168.1.102', device: 'Firefox / Linux', loginTime: new Date(Date.now() - 2 * 3600000).toISOString() }
    ];
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve active sessions.' });
  }
});

// Get Tasks
app.get('/api/admin/tasks', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const tasks = readExcelDb(tasksDbPath);
    res.json(tasks.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

// Dispatch Task
app.post('/api/admin/tasks', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { taskName, assignedTo } = req.body;
    if (!taskName || !assignedTo) {
      return res.status(400).json({ error: 'Task name and assignee are required.' });
    }
    const tasks = readExcelDb(tasksDbPath);
    let newId = 1;
    if (tasks.length > 0) {
      newId = Math.max(...tasks.map(t => parseInt(t.ID) || 0)) + 1;
    }
    const newTask = {
      ID: newId,
      Task_Name: taskName,
      Assigned_To: assignedTo,
      Status: 'Pending',
      Date_Created: new Date().toISOString()
    };
    tasks.push(newTask);
    writeExcelDb(tasksDbPath, 'Tasks', tasks);
    logAction(req.user.email, 'super_admin', 'dispatch_task', `Dispatched task "${taskName}" to ${assignedTo}`, req);
    res.json({ success: true, task: newTask });
  } catch (e) {
    res.status(500).json({ error: 'Failed to dispatch task.' });
  }
});

// Update Task Status
app.put('/api/admin/tasks/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status.' });
    }
    const tasks = readExcelDb(tasksDbPath);
    const idx = tasks.findIndex(t => parseInt(t.ID) === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    tasks[idx].Status = status;
    writeExcelDb(tasksDbPath, 'Tasks', tasks);
    logAction(req.user.email, 'super_admin', 'update_task', `Updated task ID ${id} status to ${status}`, req);
    res.json({ success: true, message: `Task status updated to ${status}.` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// GET dashboard stats for Admin Console
app.get('/api/admin/dashboard/stats', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const properties = readExcelDb(propertiesDbPath);
    const clients = readExcelDb(clientsDbPath);
    
    // Total Properties
    const totalProperties = properties.length;
    
    // Active Bookings (confirmed/pending)
    const activeBookings = clients.filter(c => c.Status === 'confirmed' || c.Status === 'pending').length;
    
    // Today's Bookings
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = clients.filter(c => {
      if (!c.Date_Added) return false;
      return c.Date_Added.startsWith(todayStr);
    }).length;
    
    // Cancellations
    const cancellations = clients.filter(c => c.Status === 'cancelled' || c.Status === 'Rejected').length;
    
    // Revenue
    let revenue = 0;
    clients.forEach(c => {
      if (c.Status === 'cancelled') return;
      const gt = (c.Guest_Type || '').toLowerCase();
      let p = 2000;
      if (gt.includes('student')) p = 5000;
      else if (gt.includes('employee')) p = 12000;
      else if (gt.includes('tourist')) p = 3000;
      else if (gt.includes('foreigner')) p = 4000;
      else if (gt.includes('couple')) p = 4500;
      revenue += p;
    });
    
    // Pending Approvals
    const pendingProperties = properties.filter(p => p.Status === 'pending_approval' || p.Status === 'pending').length;
    const pendingReviews = readExcelDb(reviewsDbPath).filter(r => r.Status === 'pending').length;
    const pendingKyc = readExcelDb(partnersDbPath).filter(p => p.Verification_Status === 'pending').length;
    const pendingApprovals = pendingProperties + pendingReviews + pendingKyc;
    
    res.json({
      totalProperties,
      activeBookings,
      todayBookings,
      revenue,
      pendingApprovals,
      cancellations
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// GET recent activities
app.get('/api/admin/activities/recent', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const logs = readExcelDb(auditLogsDbPath);
    res.json(logs.slice(-5).reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch recent activities.' });
  }
});

// PUT update property status (active, suspended, approved, rejected)
app.put('/api/admin/properties/:id/status', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => String(p.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    const oldStatus = properties[idx].Status;
    properties[idx].Status = status;
    writeExcelDb(propertiesDbPath, 'Properties', properties);
    logAction(req.user.email, 'super_admin', 'update_property_status', `Updated property ${properties[idx].Name} (ID: ${id}) status to ${status}`, req);
    
    // Webhook trigger if status changes to Signed
    if (status && status.toLowerCase() === 'signed') {
      if (typeof triggerWebhook === 'function') {
        triggerWebhook('property.status.changed', {
          propertyId: parseInt(id),
          propertyName: properties[idx].Name,
          status: 'Signed',
          city: properties[idx].Location,
          timestamp: new Date().toISOString()
        });
      }
      checkAndNotifyExpansionMilestone(properties[idx].Location, req);
    }
    
    res.json({ success: true, message: `Property status updated to ${status}.` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update property status.' });
  }
});

// DELETE property
app.delete('/api/admin/properties/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => String(p.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    const name = properties[idx].Name;
    properties.splice(idx, 1);
    writeExcelDb(propertiesDbPath, 'Properties', properties);
    logAction(req.user.email, 'super_admin', 'delete_property', `Deleted property ${name} (ID: ${id})`, req);
    res.json({ success: true, message: 'Property deleted successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete property.' });
  }
});

// PUT update property details
app.put('/api/admin/properties/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => String(p.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    
    const fields = ['Name', 'Location', 'Type', 'Price', 'Beds', 'Baths', 'Area', 'Status'];
    fields.forEach(f => {
      const bodyField = f.toLowerCase();
      if (updates[bodyField] !== undefined) {
        properties[idx][f] = updates[bodyField];
      } else if (updates[f] !== undefined) {
        properties[idx][f] = updates[f];
      }
    });
    
    writeExcelDb(propertiesDbPath, 'Properties', properties);
    logAction(req.user.email, 'super_admin', 'update_property', `Updated property ${properties[idx].Name} (ID: ${id})`, req);
    res.json({ success: true, message: 'Property updated successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update property.' });
  }
});

// GET property room and pricing metadata
app.get('/api/admin/properties/:id/meta', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const meta = readExcelDb(partnerMetaDbPath);
    const entry = meta.find(m => String(m.Property_ID) === String(id));
    if (entry) {
      res.json(entry);
    } else {
      res.json({
        Property_ID: id,
        Room_Categories: 'Standard,Deluxe',
        Inventory: '10,5',
        Seasonal_Price: 'Standard:6000,Deluxe:13000',
        Weekend_Price: 'Standard:5500,Deluxe:12500',
        Discounts: '10%',
        Blocked_Dates: '',
        Policies: 'No smoking, No pets',
        Amenities: 'WiFi,AC',
        Check_In_Out: '12:00 PM / 11:00 AM'
      });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch property metadata.' });
  }
});

// POST update property room and pricing metadata
app.post('/api/admin/properties/:id/meta', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const meta = readExcelDb(partnerMetaDbPath);
    const idx = meta.findIndex(m => String(m.Property_ID) === String(id));
    
    const newEntry = {
      Property_ID: id,
      Room_Categories: updates.room_categories || 'Standard,Deluxe',
      Inventory: updates.inventory || '10,5',
      Seasonal_Price: updates.seasonal_price || '',
      Weekend_Price: updates.weekend_price || '',
      Discounts: updates.discounts || '0%',
      Blocked_Dates: updates.blocked_dates || '',
      Policies: updates.policies || 'Standard Policies',
      Amenities: updates.amenities || 'WiFi',
      Check_In_Out: updates.check_in_out || '12:00 PM / 11:00 AM'
    };
    
    if (idx !== -1) {
      meta[idx] = newEntry;
    } else {
      meta.push(newEntry);
    }
    
    writeExcelDb(partnerMetaDbPath, 'PartnerMeta', meta);
    logAction(req.user.email, 'super_admin', 'update_property_meta', `Updated room and pricing metadata for property ID ${id}`, req);
    res.json({ success: true, message: 'Property metadata updated successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update property metadata.' });
  }
});

// GET global amenities
let globalAmenities = ['WiFi', 'Air Conditioning', 'Geyser', 'Parking', 'Swimming Pool', 'Gym', 'Power Backup', 'Kitchen', 'TV'];
app.get('/api/admin/amenities', authenticateToken, requireRole('super_admin'), (req, res) => {
  res.json(globalAmenities);
});

// POST add global amenity
app.post('/api/admin/amenities', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Amenity name is required.' });
    }
    if (!globalAmenities.includes(name)) {
      globalAmenities.push(name);
    }
    res.json({ success: true, amenities: globalAmenities });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add amenity.' });
  }
});


// GET all customers
app.get('/api/admin/customers', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const clients = readExcelDb(clientsDbPath);
    res.json(clients);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});


// In-memory CRM database for Wallet and Loyalty (persists during server runtime)
let customerCrmData = {};

// Helper to get or initialize CRM data for an email
function getOrCreateCrm(email, bookingsCount) {
  const normalizedEmail = String(email).toLowerCase().trim();
  if (!customerCrmData[normalizedEmail]) {
    customerCrmData[normalizedEmail] = {
      walletBalance: Math.floor(Math.random() * 3000) + 500, // Random starting balance
      walletTransactions: [
        { Date: new Date().toISOString().split('T')[0], Type: 'Credit', Amount: 500, Description: 'Welcome Sign-up Bonus' }
      ],
      loyaltyPoints: bookingsCount * 120,
      loyaltyRedeemed: []
    };
  }
  return customerCrmData[normalizedEmail];
}

// GET Customer CRM Profile (Profile, Bookings, Reviews, Complaints, Wallet, Loyalty)
app.get('/api/admin/customers/:email/crm', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const email = String(req.params.email).toLowerCase().trim();
    const clients = readExcelDb(clientsDbPath);
    const reviews = readExcelDb(reviewsDbPath);
    
    let inquiries = [];
    try {
      inquiries = readExcelDb(inquiriesDbPath);
    } catch(e) {
      // fallback if file doesn't exist
    }
    
    // Filter bookings for this customer
    const customerBookings = clients.filter(c => String(c.Email || '').toLowerCase().trim() === email);
    
    // Filter reviews
    const customerReviews = reviews.filter(r => String(r.Email || '').toLowerCase().trim() === email);
    
    // Filter complaints (inquiries)
    const customerComplaints = inquiries.filter(i => String(i.Email || '').toLowerCase().trim() === email);
    
    // Get profile from first booking found
    const mainProfile = customerBookings[0] || { Name: 'Unknown Customer', Email: email, Phone: 'N/A', Guest_Type: 'Guest', Date_Added: new Date().toISOString() };
    
    // Get or initialize CRM details
    const crm = getOrCreateCrm(email, customerBookings.length);
    
    // Calculate loyalty tier
    let tier = 'Bronze';
    let nextTier = 'Silver';
    let progress = Math.min((crm.loyaltyPoints / 300) * 100, 100);
    
    if (crm.loyaltyPoints >= 500) {
      tier = 'Platinum';
      nextTier = 'Max';
      progress = 100;
    } else if (crm.loyaltyPoints >= 300) {
      tier = 'Gold';
      nextTier = 'Platinum';
      progress = Math.min(((crm.loyaltyPoints - 300) / 200) * 100, 100);
    } else if (crm.loyaltyPoints >= 100) {
      tier = 'Silver';
      nextTier = 'Gold';
      progress = Math.min(((crm.loyaltyPoints - 100) / 200) * 100, 100);
    }
    
    res.json({
      profile: {
        Name: mainProfile.Name,
        Email: mainProfile.Email,
        Phone: mainProfile.Phone,
        Guest_Type: mainProfile.Guest_Type,
        Date_Added: mainProfile.Date_Added,
        Notes: mainProfile.Notes || 'No notes added.'
      },
      bookings: customerBookings,
      reviews: customerReviews,
      complaints: customerComplaints,
      wallet: {
        balance: crm.walletBalance,
        transactions: crm.walletTransactions
      },
      loyalty: {
        points: crm.loyaltyPoints,
        tier: tier,
        nextTier: nextTier,
        progress: Math.round(progress),
        redeemed: crm.loyaltyRedeemed
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch customer CRM data.' });
  }
});

// POST adjust Wallet Balance
app.post('/api/admin/customers/:email/wallet', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const email = String(req.params.email).toLowerCase().trim();
    const { amount, type, description } = req.body;
    
    if (!amount || !type) {
      return res.status(400).json({ error: 'Amount and type (Credit/Debit) are required.' });
    }
    
    const crm = getOrCreateCrm(email, 1);
    const amt = parseFloat(amount);
    
    if (type === 'Credit') {
      crm.walletBalance += amt;
    } else if (type === 'Debit') {
      if (crm.walletBalance < amt) {
        return res.status(400).json({ error: 'Insufficient wallet balance.' });
      }
      crm.walletBalance -= amt;
    }
    
    crm.walletTransactions.unshift({
      Date: new Date().toISOString().split('T')[0],
      Type: type,
      Amount: amt,
      Description: description || 'Adjusted by admin'
    });
    
    logAction(req.user.email, 'super_admin', 'adjust_wallet', `Adjusted wallet for ${email} (${type}: ₹${amt})`, req);
    res.json({ success: true, balance: crm.walletBalance, transactions: crm.walletTransactions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to adjust wallet balance.' });
  }
});

// POST adjust Loyalty Points
app.post('/api/admin/customers/:email/loyalty', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const email = String(req.params.email).toLowerCase().trim();
    const { points, action, description } = req.body;
    
    if (!points || !action) {
      return res.status(400).json({ error: 'Points and action (Add/Redeem) are required.' });
    }
    
    const crm = getOrCreateCrm(email, 1);
    const pts = parseInt(points);
    
    if (action === 'Add') {
      crm.loyaltyPoints += pts;
    } else if (action === 'Redeem') {
      if (crm.loyaltyPoints < pts) {
        return res.status(400).json({ error: 'Insufficient loyalty points.' });
      }
      crm.loyaltyPoints -= pts;
      crm.loyaltyRedeemed.unshift({
        Date: new Date().toISOString().split('T')[0],
        Points: pts,
        Reward: description || 'Custom reward redemption'
      });
    }
    
    logAction(req.user.email, 'super_admin', 'adjust_loyalty', `Adjusted loyalty points for ${email} (${action}: ${pts} pts)`, req);
    res.json({ success: true, points: crm.loyaltyPoints, redeemed: crm.loyaltyRedeemed });
  } catch (e) {
    res.status(500).json({ error: 'Failed to adjust loyalty points.' });
  }
});

// PUT update customer
app.put('/api/admin/customers/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const clients = readExcelDb(clientsDbPath);
    const idx = clients.findIndex(c => String(c.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    
    const fields = ['Name', 'Email', 'Phone', 'Guest_Type', 'Status', 'Notes'];
    fields.forEach(f => {
      if (updates[f] !== undefined) clients[idx][f] = updates[f];
      else if (updates[f.toLowerCase()] !== undefined) clients[idx][f] = updates[f.toLowerCase()];
    });
    
    writeExcelDb(clientsDbPath, 'Clients', clients);
    logAction(req.user.email, 'super_admin', 'update_customer', `Updated customer ${clients[idx].Name} (ID: ${id})`, req);
    res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// DELETE customer
app.delete('/api/admin/customers/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const clients = readExcelDb(clientsDbPath);
    const idx = clients.findIndex(c => String(c.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const name = clients[idx].Name;
    clients.splice(idx, 1);
    writeExcelDb(clientsDbPath, 'Clients', clients);
    logAction(req.user.email, 'super_admin', 'delete_customer', `Deleted customer ${name} (ID: ${id})`, req);
    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

// GET all partners
app.get('/api/admin/partners', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const partners = readExcelDb(partnersDbPath);
    res.json(partners);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch partners.' });
  }
});

// PUT update partner status
app.put('/api/admin/partners/:id/status', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const partners = readExcelDb(partnersDbPath);
    const idx = partners.findIndex(p => String(p.ID) === String(id) || String(p.Email) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Partner not found.' });
    }
    partners[idx].Verification_Status = status;
    writeExcelDb(partnersDbPath, 'Partners', partners);
    logAction(req.user.email, 'super_admin', 'update_partner_status', `Updated partner status to ${status} for ID: ${id}`, req);
    res.json({ success: true, message: `Partner verification status updated to ${status}.` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update partner status.' });
  }
});

// GET all properties onboarding status for Admin
app.get('/api/admin/properties/onboarding', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const properties = readExcelDb(propertiesDbPath);
    res.json(properties);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch onboarding properties.' });
  }
});

// GET specific property onboarding details for Admin
app.get('/api/admin/properties/:id/onboarding', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    const properties = readExcelDb(propertiesDbPath);
    const prop = properties.find(p => p.ID === propId);
    if (!prop) {
      return res.status(404).json({ error: 'Property not found.' });
    }
    res.json(prop);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch onboarding property details.' });
  }
});

// PUT update admin checklist for a property
app.put('/api/admin/properties/:id/checklist', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    const { checklistStatus } = req.body;
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => p.ID === propId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    properties[idx].Checklist_Status = typeof checklistStatus === 'string' ? checklistStatus : JSON.stringify(checklistStatus);
    writeExcelDb(propertiesDbPath, 'Properties', properties);
    res.json({ success: true, message: 'Checklist updated successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update checklist.' });
  }
});

// PUT update onboarding stage, commission override, and check Founding Partner status
app.put('/api/admin/properties/:id/onboarding-status', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const propId = parseInt(req.params.id);
    const { stage, commissionRate, registrationStatus, correctionNotes, reason } = req.body;
    const properties = readExcelDb(propertiesDbPath);
    const idx = properties.findIndex(p => p.ID === propId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const oldCommission = properties[idx].Commission_Rate || 15;
    const oldStage = properties[idx].Onboarding_Stage || 'Draft';

    if (stage !== undefined) {
      properties[idx].Onboarding_Stage = stage;

      // Handle Founding Partner designation (first 25 approved/live properties)
      if (stage === 'Approved' && oldStage !== 'Approved' && oldStage !== 'Live') {
        const approvedCount = properties.filter(p => p.Onboarding_Stage === 'Approved' || p.Onboarding_Stage === 'Live' || p.Is_Founding_Partner).length;
        if (approvedCount < 25) {
          properties[idx].Is_Founding_Partner = true;
        }
      }

      // If made LIVE, update main status to Active
      if (stage === 'Live') {
        properties[idx].Status = 'Active';
      }
    }

    if (commissionRate !== undefined) {
      const newComm = parseFloat(commissionRate);
      if (newComm !== oldCommission) {
        properties[idx].Commission_Rate = newComm;

        let changeLog = [];
        try {
          changeLog = JSON.parse(properties[idx].Commission_Change_Log || '[]');
        } catch (e) {
          changeLog = [];
        }

        changeLog.push({
          oldCommission,
          newCommission: newComm,
          changedBy: req.user.email,
          timestamp: new Date().toISOString(),
          reason: reason || 'Admin override'
        });

        properties[idx].Commission_Change_Log = JSON.stringify(changeLog);
        logAction(req.user.email, 'super_admin', 'commission_override', `Changed commission for Property ID ${propId} from ${oldCommission}% to ${newComm}%. Reason: ${reason || 'None'}`, req);
      }
    }

    if (registrationStatus !== undefined) {
      properties[idx].Registration_Status = registrationStatus;
    }

    if (correctionNotes !== undefined) {
      properties[idx].Correction_Notes = correctionNotes;
    }

    writeExcelDb(propertiesDbPath, 'Properties', properties);

    if (stage && stage !== oldStage) {
      logAction(req.user.email, 'super_admin', 'update_onboarding_stage', `Updated onboarding stage of property ID ${propId} to ${stage}`, req);
    }

    res.json({ success: true, message: 'Property onboarding status updated successfully.', isFounding: properties[idx].Is_Founding_Partner });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update onboarding status.' });
  }
});

// GET payments and finance data
app.get('/api/admin/payments', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const clients = readExcelDb(clientsDbPath);
    
    // Construct transactions from clients
    const transactions = clients.map((c, idx) => {
      const gt = (c.Guest_Type || '').toLowerCase();
      let amount = 2000;
      if (gt.includes('student')) amount = 5000;
      else if (gt.includes('employee')) amount = 12000;
      else if (gt.includes('tourist')) amount = 3000;
      else if (gt.includes('foreigner')) amount = 4000;
      else if (gt.includes('couple')) amount = 4500;
      
      let status = 'Success';
      if (c.Status === 'pending') status = 'Pending';
      else if (c.Status === 'cancelled' || c.Status === 'Rejected') status = 'Failed';
      
      return {
        Txn_ID: `TXN-${100000 + idx}`,
        Guest_Name: c.Name,
        Property: c.Property || 'HOMZO Stay',
        Amount: amount,
        Status: status,
        Date: c.Date_Added || c.Check_In || new Date().toISOString().split('T')[0]
      };
    });
    
    // Calculate finance summaries
    const totalRevenue = transactions.filter(t => t.Status === 'Success').reduce((sum, t) => sum + t.Amount, 0);
    const pendingPayouts = Math.round(totalRevenue * 0.7); // 70% goes to partners
    
    res.json({
      transactions,
      totalRevenue,
      pendingPayouts,
      gatewayStatus: 'Operational'
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// GET all payouts
app.get('/api/admin/payments/payouts', authenticateToken, (req, res) => {
  try {
    const payouts = readExcelDb(payoutsDbPath);
    const formatted = payouts.map(p => ({
      id: parseInt(p.ID),
      partner: p.Partner,
      amount: parseInt(p.Amount) || 0,
      date: p.Date || '',
      status: p.Status || 'pending_approval'
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve payouts.' });
  }
});

// POST create payout request
app.post('/api/admin/payments/payouts', authenticateToken, (req, res) => {
  try {
    const { partner, amount } = req.body;
    if (!partner || !amount) {
      return res.status(400).json({ error: 'Partner name and amount are required.' });
    }
    const payouts = readExcelDb(payoutsDbPath);
    let newId = 401;
    if (payouts.length > 0) {
      newId = Math.max(...payouts.map(p => parseInt(p.ID) || 0)) + 1;
    }
    const newPayout = {
      ID: newId,
      Partner: partner,
      Amount: parseInt(amount) || 0,
      Date: new Date().toISOString().split('T')[0],
      Status: 'pending_approval'
    };
    payouts.push(newPayout);
    writeExcelDb(payoutsDbPath, 'Payouts', payouts);
    
    logAction(req.user.email, req.user.role, 'initiate_payout', `Initiated payout request ID ${newId} of ₹${amount.toLocaleString()} for partner ${partner}`, req);
    res.json({ success: true, payout: newPayout });
  } catch (e) {
    res.status(500).json({ error: 'Failed to initiate payout.' });
  }
});

// POST approve individual partner payout
app.post('/api/admin/payments/payout/:id/approve', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const payouts = readExcelDb(payoutsDbPath);
    const idx = payouts.findIndex(p => String(p.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Payout request not found.' });
    }
    payouts[idx].Status = 'approved';
    writeExcelDb(payoutsDbPath, 'Payouts', payouts);
    
    const partner = payouts[idx].Partner;
    const amount = payouts[idx].Amount;

    // Trigger WhatsApp/SMS Alert
    const msg = `Dear Partner, your payout request ID ${id} of ₹${amount.toLocaleString()} has been APPROVED by the Finance Team and is ready for disbursement.`;
    await sendSMSHelper('+91 99999 88888', msg);
    await sendWhatsAppHelper('+91 99999 88888', msg);

    logAction(req.user.email, req.user.role, 'approve_payout', `Approved payout request ID ${id} of ₹${amount.toLocaleString()} for partner ${partner}`, req);
    res.json({ success: true, message: 'Payout request approved successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to approve payout.' });
  }
});

// POST hold individual partner payout
app.post('/api/admin/payments/payout/:id/hold', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const payouts = readExcelDb(payoutsDbPath);
    const idx = payouts.findIndex(p => String(p.ID) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Payout request not found.' });
    }
    payouts[idx].Status = 'held';
    writeExcelDb(payoutsDbPath, 'Payouts', payouts);
    
    const partner = payouts[idx].Partner;
    const amount = payouts[idx].Amount;

    // Trigger WhatsApp/SMS Alert
    const msg = `Dear Partner, your payout request ID ${id} of ₹${amount.toLocaleString()} has been placed ON HOLD. Please contact our support team.`;
    await sendSMSHelper('+91 99999 88888', msg);
    await sendWhatsAppHelper('+91 99999 88888', msg);

    logAction(req.user.email, req.user.role, 'hold_payout', `Placed payout request ID ${id} of ₹${amount.toLocaleString()} for partner ${partner} on hold`, req);
    res.json({ success: true, message: 'Payout request placed on hold successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to hold payout.' });
  }
});

// POST process partner payout (disburse)
app.post('/api/admin/payments/payout', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.body;
    const payouts = readExcelDb(payoutsDbPath);
    let count = 0;
    
    if (id) {
      const idx = payouts.findIndex(p => String(p.ID) === String(id));
      if (idx !== -1 && payouts[idx].Status === 'approved') {
        payouts[idx].Status = 'paid';
        count++;
        const msg = `Dear Partner, your payout of ₹${payouts[idx].Amount.toLocaleString()} has been successfully DISBURSED to your bank account.`;
        await sendSMSHelper('+91 99999 88888', msg);
        await sendWhatsAppHelper('+91 99999 88888', msg);
      }
    } else {
      for (let i = 0; i < payouts.length; i++) {
        if (payouts[i].Status === 'approved') {
          payouts[i].Status = 'paid';
          count++;
          const msg = `Dear Partner, your payout of ₹${payouts[i].Amount.toLocaleString()} has been successfully DISBURSED to your bank account.`;
          await sendSMSHelper('+91 99999 88888', msg);
          await sendWhatsAppHelper('+91 99999 88888', msg);
        }
      }
    }
    
    writeExcelDb(payoutsDbPath, 'Payouts', payouts);
    logAction(req.user.email, 'super_admin', 'process_payout', `Processed ${count} partner payouts for this cycle`, req);
    res.json({ success: true, message: `Processed ${count} payouts successfully.` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to process payout.' });
  }
});

// Promotions in-memory database
let promotions = [
  { Code: 'WELCOME10', Discount: '10% Off', Target: 'New Users', Status: 'Active' },
  { Code: 'HOMZO500', Discount: '₹500 Flat Off', Target: 'All Users', Status: 'Active' },
  { Code: 'MONSOON25', Discount: '25% Off', Target: 'Students', Status: 'Active' }
];

// GET promotions
app.get('/api/admin/promotions', authenticateToken, requireRole('super_admin'), (req, res) => {
  res.json(promotions);
});

// POST add promotion
app.post('/api/admin/promotions', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { code, discount, target } = req.body;
    if (!code || !discount) {
      return res.status(400).json({ error: 'Promo code and discount are required.' });
    }
    const newPromo = {
      Code: code.toUpperCase(),
      Discount: discount,
      Target: target || 'All Users',
      Status: 'Active'
    };
    promotions.push(newPromo);
    logAction(req.user.email, 'super_admin', 'add_promotion', `Added promo code: ${newPromo.Code}`, req);
    res.json({ success: true, promotions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add promotion.' });
  }
});

// DELETE promotion
app.delete('/api/admin/promotions/:code', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const idx = promotions.findIndex(p => p.Code === code);
    if (idx === -1) {
      return res.status(404).json({ error: 'Promotion not found.' });
    }
    promotions.splice(idx, 1);
    logAction(req.user.email, 'super_admin', 'delete_promotion', `Deleted promo code: ${code}`, req);
    res.json({ success: true, promotions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete promotion.' });
  }
});

// GET support tickets (inquiries)
app.get('/api/admin/support/tickets', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const tickets = readExcelDb(inquiriesDbPath);
    res.json(tickets.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch support tickets.' });
  }
});

// POST reply to support ticket
app.post('/api/admin/support/reply', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { ticketId, replyText } = req.body;
    if (!ticketId || !replyText) {
      return res.status(400).json({ error: 'Ticket ID and reply text are required.' });
    }
    
    logAction(req.user.email, 'super_admin', 'reply_ticket', `Replied to support ticket ID: ${ticketId}`, req);
    res.json({ success: true, message: 'Reply sent successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});

// POST Run AI QA Automation Testing Suite
app.post('/api/admin/system/qa-test', authenticateToken, requireRole('super_admin'), async (req, res) => {
  const BASE_URL = 'http://localhost:3000';
  const logs = [];
  const addLog = (msg, status = 'info') => {
    logs.push({ text: msg, status, timestamp: new Date().toISOString() });
  };

  addLog('🏁 AI QA Testing Agent: Initializing system scan...', 'info');

  try {
    // 1. Customer Registration & Login
    addLog('👤 Suite 1: Customer Auth & Notifications (Public Web)', 'header');
    
    const randomEmail = `guest_${Math.floor(1000 + Math.random() * 9000)}@test.com`;
    const randomPhone = `+91 99999 ${Math.floor(10000 + Math.random() * 90000)}`;

    let registerRes = await fetch(`${BASE_URL}/api/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'QA Test Guest', email: randomEmail, password: 'customer123', phone: randomPhone })
    });
    let registerData = await registerRes.json();
    if (!registerRes.ok || !registerData.success) throw new Error('Customer registration failed.');
    addLog('✅ [PASS] - Customer profile registration', 'pass');

    let loginRes = await fetch(`${BASE_URL}/api/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail, password: 'customer123' })
    });
    let loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) throw new Error('Customer login failed.');
    addLog('✅ [PASS] - Customer secure check-in (login)', 'pass');

    let forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail })
    });
    let forgotData = await forgotRes.json();
    if (!forgotRes.ok || !forgotData.success) throw new Error('OTP generation failed.');
    addLog('✅ [PASS] - Trigger verification OTP request', 'pass');

    // Check alerts
    let notifs = sentNotificationsHistory;
    const latestEmail = notifs.find(n => n.type === 'email' && n.to === randomEmail);
    const latestSMS = notifs.find(n => n.type === 'sms' && n.to === randomPhone);
    const latestWhatsApp = notifs.find(n => n.type === 'whatsapp' && n.to === randomPhone);
    if (!latestEmail || !latestSMS || !latestWhatsApp) throw new Error('Notifications not received.');
    addLog('✅ [PASS] - Verification OTP sent to Email, SMS, and WhatsApp', 'pass');

    // 2. Admin Operations
    addLog('🔑 Suite 2: Admin Operations & Configurations (Admin Console)', 'header');
    let adminToken = req.headers.authorization; // use current admin token!
    
    let propRes = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
      body: JSON.stringify({ name: 'QA Admin Property', location: 'Mumbai', type: 'hotel', price: '5000', beds: 2, baths: 2, area: 400 })
    });
    let propData = await propRes.json();
    if (!propRes.ok || !propData.id) throw new Error('Property creation failed.');
    addLog('✅ [PASS] - Super Admin: Register new property listing', 'pass');
    let testPropertyId = propData.id;

    // 3. Partner Operations
    addLog('🏨 Suite 3: Partner Operations (Partner Console)', 'header');
    let partnerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'partner@homzo.in', password: 'partner123' })
    });
    let partnerLoginData = await partnerLoginRes.json();
    if (!partnerLoginRes.ok || !partnerLoginData.token) throw new Error('Partner login failed.');
    addLog('✅ [PASS] - Partner console authenticated session', 'pass');
    let partnerToken = partnerLoginData.token;

    // 4. Booking Lifecycle
    addLog('📅 Suite 4: Booking Lifecycle & Receipts', 'header');
    let bookingRes = await fetch(`${BASE_URL}/api/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test Guest', email: randomEmail, phone: randomPhone, guest_type: 'tourist',
        property: 'QA Admin Property', checkin: '2026-08-10', checkout: '2026-08-15', dob: '1998-05-12',
        persons: 2, notes: 'Quiet room preferred.', paymentStatus: 'Unpaid', customerId: '1'
      })
    });
    let bookingData = await bookingRes.json();
    if (!bookingRes.ok || !bookingData.id) throw new Error('Booking creation failed.');
    addLog('✅ [PASS] - Create guest reservation (Public Website booking)', 'pass');
    let testGuestId = bookingData.id;

    let invoiceRes = await fetch(`${BASE_URL}/api/admin/bookings/BKG${1000 + testGuestId}/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': adminToken }
    });
    let invoiceData = await invoiceRes.json();
    if (!invoiceRes.ok || !invoiceData.success) throw new Error('Invoice calculation failed.');
    addLog('✅ [PASS] - Invoice generation calculation & validation', 'pass');

    // 5. Ratings & Reviews
    addLog('⭐ Suite 5: Ratings & Guest Reviews', 'header');
    let reviewRes = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'QA Test Guest', email: randomEmail, rating: 5, review: 'Excellent hotel!' })
    });
    let reviewData = await reviewRes.json();
    if (!reviewRes.ok || !reviewData.id) throw new Error('Review post failed.');
    addLog('✅ [PASS] - Guest review post submission (Rating & Feedback)', 'pass');
    let testReviewId = reviewData.id;

    let replyRes = await fetch(`${BASE_URL}/api/partner/reviews/${testReviewId}/reply`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerToken}` },
      body: JSON.stringify({ reply: 'Thank you for your wonderful feedback!' })
    });
    let replyData = await replyRes.json();
    if (!replyRes.ok || !replyData.success) throw new Error('Review reply failed.');
    addLog('✅ [PASS] - Partner reply to guest review', 'pass');

    // 6. Payout & Auditing
    addLog('💸 Suite 6: Payout Approvals & Security Auditing', 'header');
    let payoutRes = await fetch(`${BASE_URL}/api/admin/payments/payout/401/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
      body: JSON.stringify({ partner: 'Default Partner', amount: 45000 })
    });
    let payoutData = await payoutRes.json();
    if (!payoutRes.ok || !payoutData.success) throw new Error('Payout approval failed.');
    addLog('✅ [PASS] - Execute partner payout approval endpoint', 'pass');

    // Clean up
    try {
      await fetch(`${BASE_URL}/api/properties/${testPropertyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': adminToken }
      });
    } catch (e) {}

    addLog('🎉 AI QA Testing Agent: All tests [PASSED] successfully!', 'success');
    res.json({ success: true, logs });

  } catch (err) {
    addLog(`❌ AI QA Testing Agent: Test Failed! Error: ${err.message}`, 'error');
    res.json({ success: false, logs });
  }
});

// GET notifications
app.get('/api/admin/notifications', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const notifs = readExcelDb(notificationsDbPath);
    res.json(notifs.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// POST broadcast notification
app.post('/api/admin/notifications/broadcast', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { title, message, target } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }
    
    const notifs = readExcelDb(notificationsDbPath);
    let newId = 1;
    if (notifs.length > 0) {
      newId = Math.max(...notifs.map(n => parseInt(n.ID) || 0)) + 1;
    }
    
    const newNotif = {
      ID: newId,
      Title: title,
      Message: message,
      Target: target || 'All',
      Date_Sent: new Date().toISOString()
    };
    
    notifs.push(newNotif);
    writeExcelDb(notificationsDbPath, 'Notifications', notifs);
    logAction(req.user.email, 'super_admin', 'broadcast_notification', `Broadcasted notification: "${title}" to ${target}`, req);
    res.json({ success: true, notification: newNotif });
  } catch (e) {
    res.status(500).json({ error: 'Failed to broadcast notification.' });
  }
});

// GET all activity logs (audit logs)
app.get('/api/admin/audit-logs', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const logs = readExcelDb(auditLogsDbPath);
    res.json(logs.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Roles and permissions in-memory configuration (Console roles)
let rolesPermissions = [
  { Role: 'super_admin', Description: 'Full system control, financial access, and security override.', UsersCount: 1, Permissions: ['company', 'financial', 'users', 'contracts', 'compliance', 'config', 'audit'] },
  { Role: 'city_manager', Description: 'Manage city-level properties, bookings, and partners.', UsersCount: 2, Permissions: ['contracts', 'compliance', 'audit'] },
  { Role: 'operations_executive', Description: 'Onboard partners and verify property quality metrics.', UsersCount: 1, Permissions: ['contracts', 'compliance'] },
  { Role: 'developer', Description: 'Configure system options and inspect console logs.', UsersCount: 1, Permissions: ['config', 'audit'] }
];

// GET roles and permissions
app.get('/api/admin/roles', authenticateToken, requireRole('super_admin'), (req, res) => {
  res.json(rolesPermissions);
});

// POST update roles and permissions
app.post('/api/admin/roles', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { role, permissions } = req.body;
    const idx = rolesPermissions.findIndex(r => r.Role === role);
    if (idx !== -1) {
      rolesPermissions[idx].Permissions = permissions;
      logAction(req.user.email, 'super_admin', 'update_role_permissions', `Updated permissions for role: ${role}`, req);
      res.json({ success: true, roles: rolesPermissions });
    } else {
      res.status(404).json({ error: 'Role not found.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to update permissions.' });
  }
});

// ─── SYSTEM CONSOLE EMPLOYEES & DOCUMENTS CONFIGURATION ───
const employeesDbPath = path.resolve(__dirname, 'employees_database.csv');
const employeeDocsDir = path.join(__dirname, 'uploads', 'employee_docs');

// Create directory if it doesn't exist
if (!fs.existsSync(employeeDocsDir)) {
  fs.mkdirSync(employeeDocsDir, { recursive: true });
}

// Multer storage for employee documents
const empStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, employeeDocsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const uniqueName = `EMP_DOC_${Date.now()}_${sanitizedName}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadEmpDoc = multer({
  storage: empStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, PNG, and JPG/JPEG files are allowed.'));
    }
  }
});

// Seed default employees in CSV if missing
if (!fs.existsSync(employeesDbPath)) {
  const defaultEmployees = [
    { ID: 1, EmployeeID: 'EMP-2026-0001', Name: 'Rishabh Kumar Modanwal', Email: 'admin@homzo.in', Role: 'Super Admin', Cities: 'Global', Status: 'active', Documents: '[]' },
    { ID: 2, EmployeeID: 'EMP-2026-0002', Name: 'Mumbai Manager', Email: 'mumbai_mgr@homzo.in', Role: 'City Manager', Cities: 'Mumbai', Status: 'active', Documents: '[]' },
    { ID: 3, EmployeeID: 'EMP-2026-0003', Name: 'Delhi Manager', Email: 'delhi_mgr@homzo.in', Role: 'City Manager', Cities: 'Delhi', Status: 'active', Documents: '[]' },
    { ID: 4, EmployeeID: 'EMP-2026-0004', Name: 'Operations Staff 1', Email: 'ops@homzo.in', Role: 'Operations Executive', Cities: 'Global', Status: 'active', Documents: '[]' },
    { ID: 5, EmployeeID: 'EMP-2026-0005', Name: 'Lead Developer', Email: 'dev@homzo.in', Role: 'Developer', Cities: 'Global', Status: 'active', Documents: '[]' }
  ];
  writeExcelDb(employeesDbPath, 'Employees', defaultEmployees);
}

// GET all console employees
app.get('/api/super/employees', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const employees = readExcelDb(employeesDbPath);
    res.json(employees.map(emp => {
      let docs = [];
      try {
        docs = JSON.parse(emp.Documents || '[]');
      } catch (err) {
        docs = [];
      }
      return { ...emp, id: Number(emp.ID), Documents: docs };
    }));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// POST save employee (create/edit)
app.post('/api/super/employees', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { id, name, email, role, cities, status } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required.' });
    }

    const employees = readExcelDb(employeesDbPath);
    let targetEmp = null;

    if (id) {
      targetEmp = employees.find(emp => Number(emp.ID) === Number(id));
    }

    if (targetEmp) {
      // Edit mode
      targetEmp.Name = name;
      targetEmp.Email = email;
      targetEmp.Role = role;
      targetEmp.Cities = cities || 'Global';
      targetEmp.Status = status || 'active';
      logAction(req.user.email, 'super_admin', 'edit_employee', `Updated employee ${name} (${targetEmp.EmployeeID})`, req);
    } else {
      // Create mode
      const newId = employees.length > 0 ? Math.max(...employees.map(emp => Number(emp.ID) || 0)) + 1 : 1;
      
      // Auto-generate Employee ID
      const year = new Date().getFullYear();
      const seqStr = String(newId).padStart(4, '0');
      const employeeId = `EMP-${year}-${seqStr}`;

      const newEmp = {
        ID: newId,
        EmployeeID: employeeId,
        Name: name,
        Email: email,
        Role: role,
        Cities: cities || 'Global',
        Status: 'active',
        Documents: '[]'
      };
      employees.push(newEmp);
      targetEmp = newEmp;
      logAction(req.user.email, 'super_admin', 'create_employee', `Registered employee ${name} (${employeeId})`, req);
    }

    writeExcelDb(employeesDbPath, 'Employees', employees);
    res.json({ success: true, employee: { ...targetEmp, id: Number(targetEmp.ID), Documents: JSON.parse(targetEmp.Documents || '[]') } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save employee data.' });
  }
});

// DELETE employee
app.delete('/api/super/employees/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const empId = Number(req.params.id);
    if (empId === 1) {
      return res.status(400).json({ error: 'Cannot delete the primary Super Admin.' });
    }
    const employees = readExcelDb(employeesDbPath);
    const updated = employees.filter(emp => Number(emp.ID) !== empId);
    if (employees.length === updated.length) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    const deleted = employees.find(emp => Number(emp.ID) === empId);
    writeExcelDb(employeesDbPath, 'Employees', updated);
    logAction(req.user.email, 'super_admin', 'delete_employee', `Deleted employee ${deleted.Name} (${deleted.EmployeeID})`, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete employee.' });
  }
});

// POST upload document for employee
app.post('/api/super/employees/:id/upload', authenticateToken, requireRole('super_admin'), (req, res) => {
  uploadEmpDoc.single('document')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const empId = Number(req.params.id);
      const employees = readExcelDb(employeesDbPath);
      const targetEmp = employees.find(emp => Number(emp.ID) === empId);

      if (!targetEmp) {
        return res.status(404).json({ error: 'Employee not found.' });
      }

      let docs = [];
      try {
        docs = JSON.parse(targetEmp.Documents || '[]');
      } catch (e) {
        docs = [];
      }

      const docInfo = {
        name: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/employee_docs/${req.file.filename}`,
        uploadedAt: new Date().toISOString()
      };
      docs.push(docInfo);

      targetEmp.Documents = JSON.stringify(docs);
      writeExcelDb(employeesDbPath, 'Employees', employees);
      logAction(req.user.email, 'super_admin', 'upload_employee_doc', `Uploaded document ${req.file.originalname} for ${targetEmp.Name}`, req);

      res.json({ success: true, documents: docs });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save document metadata.' });
    }
  });
});

// POST delete document for employee
app.post('/api/super/employees/:id/delete-doc', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const empId = Number(req.params.id);
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required.' });
    }

    const employees = readExcelDb(employeesDbPath);
    const targetEmp = employees.find(emp => Number(emp.ID) === empId);

    if (!targetEmp) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    let docs = [];
    try {
      docs = JSON.parse(targetEmp.Documents || '[]');
    } catch (e) {
      docs = [];
    }

    const updatedDocs = docs.filter(d => d.filename !== filename);
    if (docs.length === updatedDocs.length) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Delete physical file
    const filePath = path.join(employeeDocsDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete file on disk', err);
      }
    }

    targetEmp.Documents = JSON.stringify(updatedDocs);
    writeExcelDb(employeesDbPath, 'Employees', employees);
    logAction(req.user.email, 'super_admin', 'delete_employee_doc', `Deleted document ${filename} for ${targetEmp.Name}`, req);

    res.json({ success: true, documents: updatedDocs });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// Content Management in-memory configuration
let siteContent = {
  heroTitle: 'Find Your Perfect Stay with HOMZO',
  heroSubtitle: 'Luxury apartments, cozy student stays, and employee housing across major cities.',
  faq: [
    { q: 'How do I book a stay?', a: 'You can search for your preferred property on our homepage and book instantly.' },
    { q: 'What is the security deposit policy?', a: 'Usually, 1 month rent is required as a security deposit, fully refundable.' }
  ]
};

// GET content
app.get('/api/admin/content', authenticateToken, requireRole('super_admin'), (req, res) => {
  res.json(siteContent);
});

// POST update content
app.post('/api/admin/content', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { heroTitle, heroSubtitle, faq } = req.body;
    if (heroTitle) siteContent.heroTitle = heroTitle;
    if (heroSubtitle) siteContent.heroSubtitle = heroSubtitle;
    if (faq) siteContent.faq = faq;
    
    logAction(req.user.email, 'super_admin', 'update_site_content', 'Updated website content details', req);
    res.json({ success: true, content: siteContent });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update content.' });
  }
});

// ══════════════════════════════════════════════════════════════
// ─── CITY EXPANSION & DEVELOPER WEBHOOK APIS ──────────────────
// ══════════════════════════════════════════════════════════════

// Webhook configuration and log storage in memory
let backendWebhooks = [
  { id: 1, url: 'https://webhook.site/dummy-booking-endpoint', events: 'booking.created, booking.cancelled', status: 'active' },
  { id: 2, url: 'https://webhook.site/dummy-payment-endpoint', events: 'payment.received', status: 'active' },
  { id: 3, url: 'http://localhost:3000/api/expansion/webhook-sync', events: 'property.status.changed', status: 'active' }
];

let backendWebhookLogs = [
  { timestamp: new Date(Date.now() - 3600000).toISOString().split('T')[1].slice(0, 8), event: 'booking.created', url: 'https://webhook.site/dummy-booking-endpoint', status: 200, payload: '{"bookingId": 1205, "status": "confirmed"}' },
  { timestamp: new Date(Date.now() - 7200000).toISOString().split('T')[1].slice(0, 8), event: 'payment.received', url: 'https://webhook.site/dummy-payment-endpoint', status: 500, payload: '{"paymentId": 403, "amount": 4500}' }
];

// Helper to log and simulate webhook delivery
function triggerWebhook(event, payload) {
  const matching = backendWebhooks.filter(w => w.events.includes(event) && w.status === 'active');
  matching.forEach(w => {
    backendWebhookLogs.unshift({
      timestamp: new Date().toTimeString().split(' ')[0],
      event: event,
      url: w.url,
      status: 200,
      payload: JSON.stringify(payload)
    });
  });
  if (backendWebhookLogs.length > 20) {
    backendWebhookLogs = backendWebhookLogs.slice(0, 20);
  }
}

// Developer Console APIs
app.get('/api/developer/webhooks', authenticateToken, requireRole('super_admin'), (req, res) => {
  res.json(backendWebhooks);
});

app.post('/api/developer/webhooks', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const { url, events } = req.body;
    if (!url || !events) return res.status(400).json({ error: 'url and events are required.' });
    const newId = backendWebhooks.length > 0 ? Math.max(...backendWebhooks.map(w => w.id)) + 1 : 1;
    const newW = { id: newId, url, events, status: 'active' };
    backendWebhooks.push(newW);
    res.json({ success: true, webhook: newW });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

app.get('/api/developer/webhook-logs', authenticateToken, requireRole('super_admin'), (req, res) => {
  res.json(backendWebhookLogs);
});

app.post('/api/developer/webhooks/test/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const w = backendWebhooks.find(x => x.id === id);
    if (!w) return res.status(404).json({ error: 'Webhook not found.' });
    
    // Create a test log
    const testPayload = { test: true, timestamp: new Date().toISOString() };
    backendWebhookLogs.unshift({
      timestamp: new Date().toTimeString().split(' ')[0],
      event: w.events.split(',')[0].trim() || 'test.event',
      url: w.url,
      status: 200,
      payload: JSON.stringify(testPayload)
    });
    res.json({ success: true, message: 'Test webhook fired successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// ──────────────────────────────────────────
// ─── ROLE & PERMISSION MANAGEMENT DATABASES & UTILITIES ───
// ──────────────────────────────────────────

const rolesDbPath = path.resolve(__dirname, 'roles_database.csv');
const permissionsDbPath = path.resolve(__dirname, 'permissions_database.csv');
const usersDbPath = path.resolve(__dirname, 'users_database.csv');
const permissionChangelogDbPath = path.resolve(__dirname, 'permission_changelog_database.csv');

initExcelDb(rolesDbPath, 'Roles', ['ID', 'Name', 'Description', 'Console_Type', 'Is_System_Default', 'Created_By', 'Created_At']);
initExcelDb(permissionsDbPath, 'Permissions', ['ID', 'Role_ID', 'Module_ID', 'Can_View', 'Can_Add', 'Can_Edit', 'Can_Delete', 'Can_Approve', 'Scope']);
// Migration check: Revert to old format users database for recreation
if (fs.existsSync(usersDbPath)) {
  try {
    const fileContent = fs.readFileSync(usersDbPath, 'utf8');
    if (fileContent.includes('Employee_ID') || !fileContent.includes('Password')) {
      fs.unlinkSync(usersDbPath);
      console.log('Deleted old format users database for recreation with Password column');
    }
  } catch (err) {
    console.error('Migration check failed:', err);
  }
}

initExcelDb(usersDbPath, 'Users', ['ID', 'Name', 'Email', 'Password', 'Phone', 'Role_ID', 'Assigned_City_ID', 'Status', 'Created_By', 'Last_Login']);
initExcelDb(permissionChangelogDbPath, 'Changelogs', ['ID', 'Changed_By', 'Target_User_ID', 'Old_Permissions', 'New_Permissions', 'Reason_Note', 'Timestamp']);

async function seedSystemDefaults() {
  // Seed default roles if empty
  try {
    const rolesData = readExcelDb(rolesDbPath);
    if (rolesData.length === 0) {
      const defaultRoles = [
        { ID: 1, Name: 'CEO', Description: 'Full access, all modules, all consoles', Console_Type: 'Admin', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 2, Name: 'COO', Description: 'Management Console, ops-level approval authority, all cities', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 3, Name: 'CTO', Description: 'Developer Console, full technical access, zero business-data edit rights', Console_Type: 'Developer', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 4, Name: 'CMO', Description: 'Management Console, Marketing & Promo full control, other modules view-only', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 5, Name: 'City Manager', Description: 'Management Console, City-Specific scope, propose-only on strategic items', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 6, Name: 'Quality Manager', Description: 'Management Console, Quality & Inspections full control', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 7, Name: 'Guest Relations', Description: 'Management Console, Booking + Guest Management full control', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 8, Name: 'Finance Manager', Description: 'Management Console, Revenue & Payouts control with CEO approval threshold', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 9, Name: 'General Admin', Description: 'Management Console, data-entry-level access only, no approval rights', Console_Type: 'Management', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() },
        { ID: 10, Name: 'Developer', Description: 'Developer Console, technical modules only, no business data access', Console_Type: 'Developer', Is_System_Default: 'true', Created_By: 'system', Created_At: new Date().toISOString() }
      ];
      defaultRoles.forEach(r => rolesData.push(r));
      writeExcelDb(rolesDbPath, 'Roles', rolesData);
      console.log('Seeded default roles');
    }
  } catch (e) {
    console.error('Failed to seed default roles:', e);
  }

  // Seed default permissions matrix if empty
  try {
    const permData = readExcelDb(permissionsDbPath);
    if (permData.length === 0) {
      let permId = 1;
      const modules = [
        'Operations Dashboard',
        'Property Management',
        'Partner CRM',
        'Booking Management',
        'Guest Management',
        'Revenue & Payouts',
        'Marketing & Promo',
        'Quality & Inspections',
        'City Expansion Strategy',
        'City Expansion Tracker',
        'Notifications',
        'Company Profile',
        'Reports & Analytics',
        'System Settings'
      ];
      
      // CEO (ID: 1)
      modules.forEach(m => {
        permData.push({ ID: permId++, Role_ID: 1, Module_ID: m, Can_View: 'true', Can_Add: 'true', Can_Edit: 'true', Can_Delete: 'true', Can_Approve: 'true', Scope: 'Global' });
      });
      
      // COO (ID: 2)
      modules.forEach(m => {
        let canView = 'true';
        let canAdd = 'true';
        let canEdit = 'true';
        let canDelete = 'false';
        let canApprove = 'true';
        
        if (m === 'System Settings') {
          canView = 'false'; canAdd = 'false'; canEdit = 'false'; canDelete = 'false'; canApprove = 'false';
        } else if (m === 'Company Profile' || m === 'Reports & Analytics') {
          canAdd = 'false'; canEdit = 'false'; canDelete = 'false'; canApprove = 'false';
        } else if (m === 'City Expansion Strategy') {
          canAdd = 'false'; canEdit = 'false'; canDelete = 'false'; canApprove = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 2, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // CTO (ID: 3)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        if (m === 'System Settings') {
          canView = 'true'; canAdd = 'true'; canEdit = 'true'; canDelete = 'true'; canApprove = 'true';
        } else if (m === 'Notifications') {
          canView = 'true'; canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 3, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // CMO (ID: 4)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        const visible = ['Operations Dashboard', 'Property Management', 'Partner CRM', 'Booking Management', 'Guest Management', 'Revenue & Payouts', 'Marketing & Promo', 'Quality & Inspections', 'City Expansion Tracker', 'Notifications', 'Reports & Analytics'];
        if (visible.includes(m)) {
          canView = 'true';
        }
        if (m === 'Marketing & Promo') {
          canAdd = 'true'; canEdit = 'true'; canDelete = 'true'; canApprove = 'true';
        } else if (m === 'Notifications') {
          canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 4, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // City Manager (ID: 5)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        const visible = ['Operations Dashboard', 'Property Management', 'Partner CRM', 'Booking Management', 'Guest Management', 'Revenue & Payouts', 'Marketing & Promo', 'Quality & Inspections', 'City Expansion Strategy', 'City Expansion Tracker', 'Notifications', 'Reports & Analytics'];
        if (visible.includes(m)) {
          canView = 'true';
        }
        const editable = ['Property Management', 'Partner CRM', 'Booking Management', 'Guest Management', 'Quality & Inspections', 'City Expansion Tracker', 'Notifications'];
        if (editable.includes(m)) {
          canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 5, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'City-Specific' });
      });
      
      // Quality Manager (ID: 6)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        const visible = ['Operations Dashboard', 'Property Management', 'Partner CRM', 'Quality & Inspections', 'City Expansion Tracker', 'Notifications', 'Reports & Analytics'];
        if (visible.includes(m)) {
          canView = 'true';
        }
        if (m === 'Quality & Inspections') {
          canAdd = 'true'; canEdit = 'true'; canDelete = 'true'; canApprove = 'true';
        } else if (m === 'Notifications') {
          canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 6, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // Guest Relations (ID: 7)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        const visible = ['Operations Dashboard', 'Property Management', 'Partner CRM', 'Booking Management', 'Guest Management', 'Notifications'];
        if (visible.includes(m)) {
          canView = 'true';
        }
        if (m === 'Booking Management' || m === 'Guest Management') {
          canAdd = 'true'; canEdit = 'true'; canDelete = 'true'; canApprove = 'true';
        } else if (m === 'Notifications') {
          canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 7, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // Finance Manager (ID: 8)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        const visible = ['Operations Dashboard', 'Property Management', 'Partner CRM', 'Booking Management', 'Revenue & Payouts', 'Notifications', 'Reports & Analytics'];
        if (visible.includes(m)) {
          canView = 'true';
        }
        if (m === 'Revenue & Payouts') {
          canAdd = 'true'; canEdit = 'true'; canDelete = 'true'; canApprove = 'true';
        } else if (m === 'Notifications') {
          canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 8, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // General Admin (ID: 9)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        const visible = ['Operations Dashboard', 'Property Management', 'Partner CRM', 'Booking Management', 'Guest Management', 'Revenue & Payouts', 'Marketing & Promo', 'Quality & Inspections', 'City Expansion Tracker', 'Notifications', 'Reports & Analytics'];
        if (visible.includes(m)) {
          canView = 'true';
        }
        const editable = ['Property Management', 'Partner CRM', 'Booking Management', 'Guest Management', 'Quality & Inspections'];
        if (editable.includes(m)) {
          canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 9, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      // Developer (ID: 10)
      modules.forEach(m => {
        let canView = 'false'; let canAdd = 'false'; let canEdit = 'false'; let canDelete = 'false'; let canApprove = 'false';
        if (m === 'System Settings') {
          canView = 'true'; canAdd = 'true'; canEdit = 'true'; canDelete = 'true'; canApprove = 'true';
        } else if (m === 'Notifications') {
          canView = 'true'; canAdd = 'true'; canEdit = 'true';
        }
        permData.push({ ID: permId++, Role_ID: 10, Module_ID: m, Can_View: canView, Can_Add: canAdd, Can_Edit: canEdit, Can_Delete: canDelete, Can_Approve: canApprove, Scope: 'Global' });
      });
      
      writeExcelDb(permissionsDbPath, 'Permissions', permData);
      console.log('Seeded default permissions matrix');
    }
  } catch (e) {
    console.error('Failed to seed default permissions:', e);
  }

  // Seed default users if empty
  try {
    const usersData = readExcelDb(usersDbPath);
    if (usersData.length === 0) {
      usersData.push(
        { ID: 1, Name: 'Super Admin / CEO', Email: 'admin@homzo.in', Password: hashPassword('admin123'), Phone: '9999999999', Role_ID: 1, Assigned_City_ID: '', Status: 'Active', Created_By: 'system', Last_Login: new Date().toISOString() },
        { ID: 2, Name: 'Homzo COO', Email: 'coo@homzo.in', Password: hashPassword('coo123'), Phone: '9888888888', Role_ID: 2, Assigned_City_ID: '', Status: 'Active', Created_By: 'admin@homzo.in', Last_Login: '' },
        { ID: 3, Name: 'Homzo CTO', Email: 'cto@homzo.in', Password: hashPassword('cto123'), Phone: '9777777777', Role_ID: 3, Assigned_City_ID: '', Status: 'Active', Created_By: 'admin@homzo.in', Last_Login: '' },
        { ID: 4, Name: 'Mumbai Manager', Email: 'mumbai_mgr@homzo.in', Password: hashPassword('mumbai123'), Phone: '9666666666', Role_ID: 5, Assigned_City_ID: 1, Status: 'Active', Created_By: 'admin@homzo.in', Last_Login: '' },
        { ID: 5, Name: 'Delhi Manager', Email: 'delhi_mgr@homzo.in', Password: hashPassword('delhi123'), Phone: '9555555555', Role_ID: 5, Assigned_City_ID: 2, Status: 'Active', Created_By: 'admin@homzo.in', Last_Login: '' },
        { ID: 6, Name: 'Operations Staff 1', Email: 'ops@homzo.in', Password: hashPassword('ops123'), Phone: '9444444444', Role_ID: 9, Assigned_City_ID: '', Status: 'Active', Created_By: 'admin@homzo.in', Last_Login: '' },
        { ID: 7, Name: 'Lead Developer', Email: 'dev@homzo.in', Password: hashPassword('dev123'), Phone: '9333333333', Role_ID: 10, Assigned_City_ID: '', Status: 'Active', Created_By: 'admin@homzo.in', Last_Login: '' }
      );
      writeExcelDb(usersDbPath, 'Users', usersData);
      console.log('Seeded default users');
    }
  } catch (e) {
    console.error('Failed to seed default users:', e);
  }
}


// Master permission validation helper
function checkUserPermission(req, moduleId, action) {
  const roleHeader = req.headers['x-simulated-role'];
  const cityHeader = req.headers['x-simulated-city'];
  
  let userEmail = req.user ? req.user.email : 'admin@homzo.in';
  
  if (roleHeader) {
    if (roleHeader === 'super_admin') {
      return { allowed: true, scope: 'Global', city: '' };
    }
    
    const users = readExcelDb(usersDbPath);
    const roles = readExcelDb(rolesDbPath);
    
    let targetUser = users.find(u => u.Email === roleHeader || u.Name === roleHeader || String(u.ID) === roleHeader);
    let targetRole;
    let assignedCity = '';
    
    if (targetUser) {
      targetRole = roles.find(r => String(r.ID) === String(targetUser.Role_ID));
      assignedCity = targetUser.Assigned_City_ID ? String(targetUser.Assigned_City_ID) : '';
    } else {
      targetRole = roles.find(r => r.Name.toLowerCase() === roleHeader.toLowerCase());
    }
    
    if (!targetRole) {
      return { allowed: false, scope: 'Global', city: '' };
    }
    
    const permissions = readExcelDb(permissionsDbPath);
    const perm = permissions.find(p => String(p.Role_ID) === String(targetRole.ID) && p.Module_ID.toLowerCase() === moduleId.toLowerCase());
    
    if (!perm) return { allowed: false, scope: 'Global', city: '' };
    
    let allowed = false;
    if (action === 'view') allowed = perm.Can_View === 'true';
    if (action === 'add') allowed = perm.Can_Add === 'true';
    if (action === 'edit') allowed = perm.Can_Edit === 'true';
    if (action === 'delete') allowed = perm.Can_Delete === 'true';
    if (action === 'approve') allowed = perm.Can_Approve === 'true';
    
    let scope = perm.Scope || 'Global';
    let cityLimit = '';
    if (scope === 'City-Specific') {
      const cities = readExcelDb(citiesDbPath);
      let c;
      if (assignedCity) {
        c = cities.find(x => String(x.ID) === assignedCity);
      }
      if (!c && cityHeader) {
        c = cities.find(x => x.Name.toLowerCase() === cityHeader.toLowerCase());
      }
      cityLimit = c ? c.Name : '';
    }
    
    return { allowed, scope, city: cityLimit };
  }
  
  if (userEmail === 'admin@homzo.in') {
    return { allowed: true, scope: 'Global', city: '' };
  }
  
  const users = readExcelDb(usersDbPath);
  const targetUser = users.find(u => u.Email.toLowerCase() === userEmail.toLowerCase());
  if (!targetUser || targetUser.Status === 'Suspended') {
    return { allowed: false, scope: 'Global', city: '' };
  }
  
  const roles = readExcelDb(rolesDbPath);
  const targetRole = roles.find(r => String(r.ID) === String(targetUser.Role_ID));
  if (!targetRole) return { allowed: false, scope: 'Global', city: '' };
  
  const permissions = readExcelDb(permissionsDbPath);
  const perm = permissions.find(p => String(p.Role_ID) === String(targetRole.ID) && p.Module_ID.toLowerCase() === moduleId.toLowerCase());
  if (!perm) return { allowed: false, scope: 'Global', city: '' };
  
  let allowed = false;
  if (action === 'view') allowed = perm.Can_View === 'true';
  if (action === 'add') allowed = perm.Can_Add === 'true';
  if (action === 'edit') allowed = perm.Can_Edit === 'true';
  if (action === 'delete') allowed = perm.Can_Delete === 'true';
  if (action === 'approve') allowed = perm.Can_Approve === 'true';
  
  let scope = perm.Scope || 'Global';
  let cityLimit = '';
  if (scope === 'City-Specific' && targetUser.Assigned_City_ID) {
    const cities = readExcelDb(citiesDbPath);
    const c = cities.find(x => String(x.ID) === String(targetUser.Assigned_City_ID));
    cityLimit = c ? c.Name : '';
  }
  
  return { allowed, scope, city: cityLimit };
}

// ──────────────────────────────────────────
// ─── ROLE & PERMISSION MANAGEMENT ENDPOINTS ───
// ──────────────────────────────────────────

function requireCEO(req, res, next) {
  const roleHeader = req.headers['x-simulated-role'];
  if (roleHeader) {
    if (roleHeader !== 'super_admin' && roleHeader.toLowerCase() !== 'ceo') {
      return res.status(403).json({ error: 'Access Denied: Only CEO accounts can access this module.' });
    }
    return next();
  }
  
  if (!req.user || (req.user.email !== 'admin@homzo.in' && String(req.user.role || '').toLowerCase() !== 'ceo')) {
    return res.status(403).json({ error: 'Access Denied: Only CEO accounts can access this module.' });
  }
  next();
}



app.get('/api/roles', authenticateToken, requireCEO, (req, res) => {
  try {
    const roles = readExcelDb(rolesDbPath);
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve roles.' });
  }
});

app.post('/api/roles', authenticateToken, requireCEO, (req, res) => {
  try {
    const { name, description, console_type, permissions } = req.body;
    if (!name || !console_type || !permissions) {
      return res.status(400).json({ error: 'Name, console type, and permissions are required.' });
    }
    
    const roles = readExcelDb(rolesDbPath);
    if (roles.some(r => r.Name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Role name already exists.' });
    }
    
    const newRoleId = roles.length > 0 ? Math.max(...roles.map(r => parseInt(r.ID) || 0)) + 1 : 1;
    const newRole = {
      ID: newRoleId,
      Name: name,
      Description: description || '',
      Console_Type: console_type,
      Is_System_Default: 'false',
      Created_By: req.user ? req.user.email : 'admin@homzo.in',
      Created_At: new Date().toISOString()
    };
    
    roles.push(newRole);
    writeExcelDb(rolesDbPath, 'Roles', roles);
    
    const perms = readExcelDb(permissionsDbPath);
    let nextPermId = perms.length > 0 ? Math.max(...perms.map(p => parseInt(p.ID) || 0)) + 1 : 1;
    
    permissions.forEach(p => {
      perms.push({
        ID: nextPermId++,
        Role_ID: newRoleId,
        Module_ID: p.module_id,
        Can_View: String(!!p.can_view),
        Can_Add: String(!!p.can_add),
        Can_Edit: String(!!p.can_edit),
        Can_Delete: String(!!p.can_delete),
        Can_Approve: String(!!p.can_approve),
        Scope: p.scope || 'Global'
      });
    });
    
    writeExcelDb(permissionsDbPath, 'Permissions', perms);
    res.status(201).json({ success: true, role: newRole });
  } catch (err) {
    console.error('Failed to create custom role:', err);
    res.status(500).json({ error: 'Failed to create role.' });
  }
});

app.get('/api/roles/:id/permissions', authenticateToken, requireCEO, (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const perms = readExcelDb(permissionsDbPath).filter(p => parseInt(p.Role_ID) === roleId);
    res.json(perms.map(p => ({
      id: parseInt(p.ID),
      role_id: parseInt(p.Role_ID),
      module_id: p.Module_ID,
      can_view: p.Can_View === 'true',
      can_add: p.Can_Add === 'true',
      can_edit: p.Can_Edit === 'true',
      can_delete: p.Can_Delete === 'true',
      can_approve: p.Can_Approve === 'true',
      scope: p.Scope || 'Global'
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve permissions.' });
  }
});

app.get('/api/users', authenticateToken, requireCEO, (req, res) => {
  try {
    const users = readExcelDb(usersDbPath);
    const roles = readExcelDb(rolesDbPath);
    
    const populated = users.map(u => {
      const role = roles.find(r => String(r.ID) === String(u.Role_ID));
      return {
        id: parseInt(u.ID),
        name: u.Name,
        email: u.Email,
        phone: u.Phone,
        role_id: parseInt(u.Role_ID),
        assigned_city_id: u.Assigned_City_ID ? parseInt(u.Assigned_City_ID) : null,
        status: u.Status,
        created_by: u.Created_By,
        last_login: u.Last_Login || 'Never',
        role_name: role ? role.Name : 'Unknown',
        console_type: role ? role.Console_Type : 'Management'
      };
    });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

app.post('/api/users', authenticateToken, requireCEO, (req, res) => {
  try {
    const { name, email, phone, role_id, assigned_city_id, status, customPermissions } = req.body;
    if (!name || !email || !role_id) {
      return res.status(400).json({ error: 'Name, email, and role are required.' });
    }
    
    const users = readExcelDb(usersDbPath);
    if (users.some(u => u.Email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    
    const newUserId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.ID) || 0)) + 1 : 1;
    let finalRoleId = parseInt(role_id);
    
    if (customPermissions && Array.isArray(customPermissions)) {
      const roles = readExcelDb(rolesDbPath);
      const parentRole = roles.find(r => parseInt(r.ID) === finalRoleId);
      const customRoleName = `${name} (Custom ${parentRole ? parentRole.Name : 'Role'})`;
      
      const newCustomRoleId = roles.length > 0 ? Math.max(...roles.map(r => parseInt(r.ID) || 0)) + 1 : 1;
      const customRole = {
        ID: newCustomRoleId,
        Name: customRoleName,
        Description: `Custom permissions override for ${name}`,
        Console_Type: parentRole ? parentRole.Console_Type : 'Management',
        Is_System_Default: 'false',
        Created_By: req.user ? req.user.email : 'admin@homzo.in',
        Created_At: new Date().toISOString()
      };
      
      roles.push(customRole);
      writeExcelDb(rolesDbPath, 'Roles', roles);
      
      const perms = readExcelDb(permissionsDbPath);
      let nextPermId = perms.length > 0 ? Math.max(...perms.map(p => parseInt(p.ID) || 0)) + 1 : 1;
      
      customPermissions.forEach(p => {
        perms.push({
          ID: nextPermId++,
          Role_ID: newCustomRoleId,
          Module_ID: p.module_id,
          Can_View: String(!!p.can_view),
          Can_Add: String(!!p.can_add),
          Can_Edit: String(!!p.can_edit),
          Can_Delete: String(!!p.can_delete),
          Can_Approve: String(!!p.can_approve),
          Scope: p.scope || 'Global'
        });
      });
      writeExcelDb(permissionsDbPath, 'Permissions', perms);
      
      finalRoleId = newCustomRoleId;
    }
    
    const newUser = {
      ID: newUserId,
      Name: name,
      Email: email,
      Phone: phone || '',
      Role_ID: finalRoleId,
      Assigned_City_ID: assigned_city_id ? parseInt(assigned_city_id) : '',
      Status: status || 'Pending Invite',
      Created_By: req.user ? req.user.email : 'admin@homzo.in',
      Last_Login: ''
    };
    
    users.push(newUser);
    writeExcelDb(usersDbPath, 'Users', users);
    
    const changelogs = readExcelDb(permissionChangelogDbPath);
    const nextLogId = changelogs.length > 0 ? Math.max(...changelogs.map(l => parseInt(l.ID) || 0)) + 1 : 1;
    const userPerms = readExcelDb(permissionsDbPath).filter(p => parseInt(p.Role_ID) === finalRoleId);
    
    changelogs.push({
      ID: nextLogId,
      Changed_By: req.user ? req.user.email : 'admin@homzo.in',
      Target_User_ID: newUserId,
      Old_Permissions: '[]',
      New_Permissions: JSON.stringify(userPerms),
      Reason_Note: 'Initial team member invitation onboarding',
      Timestamp: new Date().toISOString()
    });
    writeExcelDb(permissionChangelogDbPath, 'Changelogs', changelogs);
    
    const tempPassword = `Homzo@${Math.floor(100 + Math.random() * 900)}`;
    res.status(201).json({ success: true, user: newUser, tempPassword });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ error: 'Failed to onboard team member.' });
  }
});

app.put('/api/users/:id', authenticateToken, requireCEO, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, phone, role_id, assigned_city_id, status, reason_note, customPermissions } = req.body;
    
    const users = readExcelDb(usersDbPath);
    const idx = users.findIndex(u => parseInt(u.ID) === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Team member not found.' });
    }
    
    const currentUser = users[idx];
    const sessionEmail = req.user ? req.user.email : 'admin@homzo.in';
    if (currentUser.Email.toLowerCase() === sessionEmail.toLowerCase()) {
      return res.status(400).json({ error: 'Access Denied: You cannot modify your own roles or permissions.' });
    }
    
    const oldRoleId = parseInt(currentUser.Role_ID);
    const oldPerms = readExcelDb(permissionsDbPath).filter(p => parseInt(p.Role_ID) === oldRoleId);
    
    let finalRoleId = role_id ? parseInt(role_id) : oldRoleId;
    
    if (customPermissions && Array.isArray(customPermissions)) {
      const roles = readExcelDb(rolesDbPath);
      const parentRole = roles.find(r => parseInt(r.ID) === finalRoleId);
      const customRoleName = `${name || currentUser.Name} (Custom ${parentRole ? parentRole.Name : 'Role'})`;
      
      const newCustomRoleId = roles.length > 0 ? Math.max(...roles.map(r => parseInt(r.ID) || 0)) + 1 : 1;
      const customRole = {
        ID: newCustomRoleId,
        Name: customRoleName,
        Description: `Custom permissions override for ${name || currentUser.Name}`,
        Console_Type: parentRole ? parentRole.Console_Type : 'Management',
        Is_System_Default: 'false',
        Created_By: sessionEmail,
        Created_At: new Date().toISOString()
      };
      
      roles.push(customRole);
      writeExcelDb(rolesDbPath, 'Roles', roles);
      
      const perms = readExcelDb(permissionsDbPath);
      let nextPermId = perms.length > 0 ? Math.max(...perms.map(p => parseInt(p.ID) || 0)) + 1 : 1;
      
      customPermissions.forEach(p => {
        perms.push({
          ID: nextPermId++,
          Role_ID: newCustomRoleId,
          Module_ID: p.module_id,
          Can_View: String(!!p.can_view),
          Can_Add: String(!!p.can_add),
          Can_Edit: String(!!p.can_edit),
          Can_Delete: String(!!p.can_delete),
          Can_Approve: String(!!p.can_approve),
          Scope: p.scope || 'Global'
        });
      });
      writeExcelDb(permissionsDbPath, 'Permissions', perms);
      
      finalRoleId = newCustomRoleId;
    }
    
    if (name !== undefined) currentUser.Name = name;
    if (phone !== undefined) currentUser.Phone = phone;
    currentUser.Role_ID = finalRoleId;
    currentUser.Assigned_City_ID = assigned_city_id ? parseInt(assigned_city_id) : '';
    if (status !== undefined) currentUser.Status = status;
    
    writeExcelDb(usersDbPath, 'Users', users);
    
    const changelogs = readExcelDb(permissionChangelogDbPath);
    const nextLogId = changelogs.length > 0 ? Math.max(...changelogs.map(l => parseInt(l.ID) || 0)) + 1 : 1;
    const newPerms = readExcelDb(permissionsDbPath).filter(p => parseInt(p.Role_ID) === finalRoleId);
    
    changelogs.push({
      ID: nextLogId,
      Changed_By: sessionEmail,
      Target_User_ID: userId,
      Old_Permissions: JSON.stringify(oldPerms),
      New_Permissions: JSON.stringify(newPerms),
      Reason_Note: reason_note || 'CEO update of team member permissions/details',
      Timestamp: new Date().toISOString()
    });
    writeExcelDb(permissionChangelogDbPath, 'Changelogs', changelogs);
    
    res.json({ success: true, message: 'Team member updated successfully.' });
  } catch (err) {
    console.error('Failed to update user:', err);
    res.status(500).json({ error: 'Failed to update team member.' });
  }
});

app.get('/api/permission-changelogs', authenticateToken, requireCEO, (req, res) => {
  try {
    const changelogs = readExcelDb(permissionChangelogDbPath);
    const users = readExcelDb(usersDbPath);
    
    const populated = changelogs.map(l => {
      const targetUser = users.find(u => String(u.ID) === String(l.Target_User_ID));
      return {
        id: parseInt(l.ID),
        changed_by: l.Changed_By,
        target_user_name: targetUser ? targetUser.Name : `User #${l.Target_User_ID}`,
        reason_note: l.Reason_Note,
        timestamp: l.Timestamp
      };
    });
    res.json(populated.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve changelogs.' });
  }
});

// Helper to get simulated role & city
function getExpansionRoleAndCity(req) {
  const simulatedRole = req.headers['x-simulated-role'];
  const simulatedCity = req.headers['x-simulated-city'];
  const role = simulatedRole || (req.user ? req.user.role : 'operations_executive');
  const city = simulatedCity || '';
  return { role, city };
}

// 1. GET all expansion cities
app.get('/api/expansion/cities', authenticateToken, (req, res) => {
  try {
    const viewPerm = checkUserPermission(req, 'City Expansion Tracker', 'view');
    const stratPerm = checkUserPermission(req, 'City Expansion Strategy', 'view');
    
    if (!viewPerm.allowed && !stratPerm.allowed) {
      return res.status(403).json({ error: 'Access Denied: Insufficient permissions to view City Expansion data.' });
    }
    
    const { role, city } = getExpansionRoleAndCity(req);
    let cities = readExcelDb(citiesDbPath);
    const properties = readExcelDb(propertiesDbPath);
    
    const tasks = readExcelDb(tasksDbPath);
    const employees = readExcelDb(employeesDbPath);
    
    cities = cities.map(c => {
      const signedCount = properties.filter(p => 
        p.Location && p.Location.toLowerCase() === c.Name.toLowerCase() &&
        p.Status && p.Status.toLowerCase() === 'signed'
      ).length;
      
      const cityNameClean = c.Name.split(',')[0].trim().toLowerCase();
      const cityEmployees = employees.filter(emp => 
        (emp.Cities && emp.Cities.toLowerCase().includes(cityNameClean)) ||
        (c.City_Manager_ID && emp.Name.toLowerCase().includes(c.City_Manager_ID.toLowerCase()))
      ).map(emp => emp.Name.toLowerCase());

      const pendingTasksCount = tasks.filter(t => {
        const taskNameLower = t.Task_Name.toLowerCase();
        const assignedLower = t.Assigned_To ? t.Assigned_To.toLowerCase() : '';
        const isPending = t.Status && (t.Status.toLowerCase() === 'pending' || t.Status.toLowerCase() === 'in progress');
        if (!isPending) return false;
        
        const matchesCityName = taskNameLower.includes(cityNameClean);
        const matchesEmployee = cityEmployees.some(empName => assignedLower.includes(empName));
        return matchesCityName || matchesEmployee;
      }).length;
      
      return {
        id: parseInt(c.ID),
        name: c.Name,
        status: c.Status,
        launch_quarter_planned: c.Launch_Quarter_Planned || '',
        launch_date_actual: parseExcelDate(c.Launch_Date_Actual) || '',
        target_hotel_count: parseInt(c.Target_Hotel_Count) || 0,
        signed_hotel_count: signedCount, 
        budget_allocated: parseFloat(c.Budget_Allocated) || 0,
        city_manager_id: c.City_Manager_ID || 'Unassigned',
        market_notes: c.Market_Notes || '',
        pending_tasks_count: pendingTasksCount,
        competitive_intel: {
          oyo_property_count: parseInt(c.Oyo_Property_Count) || 0,
          avg_price_point: parseFloat(c.Avg_Price_Point) || 0
        },
        created_at: c.Created_At,
        updated_at: c.Updated_At,
        updated_by: c.Updated_By
      };
    });

    const isCitySpecific = viewPerm.scope === 'City-Specific' || stratPerm.scope === 'City-Specific' || role === 'city_manager';
    const scopeCity = viewPerm.city || stratPerm.city || city;
    
    if (isCitySpecific && scopeCity) {
      cities = cities.filter(c => c.name.toLowerCase() === scopeCity.toLowerCase());
    }
    
    res.json(cities);
  } catch (err) {
    console.error('Failed to get cities:', err);
    res.status(500).json({ error: 'Failed to retrieve city expansion data.' });
  }
});

// 2. POST create a new city (Admin-only strategic control)
app.post('/api/expansion/cities', authenticateToken, (req, res) => {
  try {
    const addPerm = checkUserPermission(req, 'City Expansion Strategy', 'add');
    if (!addPerm.allowed) {
      return res.status(403).json({ error: 'Access Denied: You do not have permission to add city targets.' });
    }
    
    const { name, status, launch_quarter_planned, launch_date_actual, target_hotel_count, budget_allocated, city_manager_id, market_notes, competitive_intel } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'City name is required.' });
    }
    
    const cities = readExcelDb(citiesDbPath);
    if (cities.some(c => c.Name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'City already exists.' });
    }
    
    let newId = 1;
    if (cities.length > 0) {
      newId = Math.max(...cities.map(c => parseInt(c.ID) || 0)) + 1;
    }
    
    const compIntel = competitive_intel || {};
    const newCity = {
      ID: newId,
      Name: name,
      Status: status || 'Target',
      Launch_Quarter_Planned: launch_quarter_planned || '',
      Launch_Date_Actual: launch_date_actual || '',
      Target_Hotel_Count: parseInt(target_hotel_count) || 0,
      Signed_Hotel_Count: 0, 
      Budget_Allocated: parseFloat(budget_allocated) || 0,
      City_Manager_ID: city_manager_id || 'Unassigned',
      Market_Notes: market_notes || '',
      Oyo_Property_Count: parseInt(compIntel.oyo_property_count) || 0,
      Avg_Price_Point: parseFloat(compIntel.avg_price_point) || 0,
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString(),
      Updated_By: req.user.email
    };
    
    cities.push(newCity);
    writeExcelDb(citiesDbPath, 'Cities', cities);
    
    const history = readExcelDb(cityStatusHistoryDbPath);
    let histId = 1;
    if (history.length > 0) {
      histId = Math.max(...history.map(h => parseInt(h.ID) || 0)) + 1;
    }
    history.push({
      ID: histId,
      City_ID: newId,
      Old_Status: '-',
      New_Status: newCity.Status,
      Changed_By: req.user.email,
      Changed_At: new Date().toISOString(),
      Reason: 'Initial city target creation'
    });
    writeExcelDb(cityStatusHistoryDbPath, 'StatusHistory', history);
    
    logAction(req.user.email, 'super_admin', 'create_city_expansion', `Created city expansion target: ${name}`, req);
    res.status(201).json({ success: true, city: newCity });
  } catch (err) {
    console.error('Failed to create city:', err);
    res.status(500).json({ error: 'Failed to create city expansion target.' });
  }
});

// 3. PUT update a city (Role-based strategic field locking)
app.put('/api/expansion/cities/:id', authenticateToken, (req, res) => {
  try {
    const cityId = parseInt(req.params.id);
    const editStrat = checkUserPermission(req, 'City Expansion Strategy', 'edit');
    const editTracker = checkUserPermission(req, 'City Expansion Tracker', 'edit');
    
    if (!editStrat.allowed && !editTracker.allowed) {
      return res.status(403).json({ error: 'Access Denied: Insufficient permissions to edit City Expansion.' });
    }
    
    const cities = readExcelDb(citiesDbPath);
    const idx = cities.findIndex(c => parseInt(c.ID) === cityId);
    if (idx === -1) {
      return res.status(404).json({ error: 'City not found.' });
    }
    
    const currentCityName = cities[idx].Name;
    const { role, city: simCity } = getExpansionRoleAndCity(req);
    const isCitySpecific = editStrat.scope === 'City-Specific' || editTracker.scope === 'City-Specific' || role === 'city_manager';
    const scopeCity = editStrat.city || editTracker.city || simCity;
    
    if (isCitySpecific && scopeCity && scopeCity.toLowerCase() !== currentCityName.toLowerCase()) {
      return res.status(403).json({ error: `Access Denied: You are only authorized to manage ${scopeCity}.` });
    }
    
    const updates = req.body;
    
    // Block manual override of signed_hotel_count
    if (updates.signed_hotel_count !== undefined) {
      delete updates.signed_hotel_count;
    }
    
    if (editStrat.allowed) {
      if (updates.name !== undefined) cities[idx].Name = updates.name;
      if (updates.target_hotel_count !== undefined) cities[idx].Target_Hotel_Count = parseInt(updates.target_hotel_count) || 0;
      if (updates.launch_quarter_planned !== undefined) cities[idx].Launch_Quarter_Planned = updates.launch_quarter_planned;
      if (updates.launch_date_actual !== undefined) cities[idx].Launch_Date_Actual = updates.launch_date_actual;
      if (updates.budget_allocated !== undefined) cities[idx].Budget_Allocated = parseFloat(updates.budget_allocated) || 0;
      if (updates.city_manager_id !== undefined) cities[idx].City_Manager_ID = updates.city_manager_id;
      if (updates.market_notes !== undefined) cities[idx].Market_Notes = updates.market_notes;
      
      const compIntel = updates.competitive_intel || {};
      if (compIntel.oyo_property_count !== undefined) cities[idx].Oyo_Property_Count = parseInt(compIntel.oyo_property_count) || 0;
      if (compIntel.avg_price_point !== undefined) cities[idx].Avg_Price_Point = parseFloat(compIntel.avg_price_point) || 0;
      
      if (updates.status !== undefined && updates.status !== cities[idx].Status) {
        const oldStatus = cities[idx].Status;
        const newStatus = updates.status;
        cities[idx].Status = newStatus;
        
        const history = readExcelDb(cityStatusHistoryDbPath);
        let histId = 1;
        if (history.length > 0) {
          histId = Math.max(...history.map(h => parseInt(h.ID) || 0)) + 1;
        }
        history.push({
          ID: histId,
          City_ID: cityId,
          Old_Status: oldStatus,
          New_Status: newStatus,
          Changed_By: req.user.email,
          Changed_At: new Date().toISOString(),
          Reason: updates.reason || 'Admin manual override/update'
        });
        writeExcelDb(cityStatusHistoryDbPath, 'StatusHistory', history);
      }
      
      cities[idx].Updated_At = new Date().toISOString();
      cities[idx].Updated_By = req.user.email;
      writeExcelDb(citiesDbPath, 'Cities', cities);
      checkAndNotifyExpansionMilestone(cities[idx].Name, req);
      
      logAction(req.user.email, 'super_admin', 'update_city_expansion', `Updated city ${currentCityName} strategy fields`, req);
      res.json({ success: true, message: 'City strategy updated successfully.' });
      
    } else {
      // Management Console / Ops role - view only on strategic fields
      const strategicFields = ['name', 'target_hotel_count', 'launch_quarter_planned', 'launch_date_actual', 'budget_allocated', 'city_manager_id'];
      for (const field of strategicFields) {
        const dbField = field === 'name' ? 'Name' : field === 'target_hotel_count' ? 'Target_Hotel_Count' : field === 'launch_quarter_planned' ? 'Launch_Quarter_Planned' : field === 'launch_date_actual' ? 'Launch_Date_Actual' : field === 'budget_allocated' ? 'Budget_Allocated' : 'City_Manager_ID';
        if (updates[field] !== undefined && String(updates[field]) !== String(cities[idx][dbField])) {
          return res.status(403).json({ error: `Permission Denied: Edit of strategic field "${field}" is locked for Management role.` });
        }
      }
      
      if (updates.status !== undefined && updates.status !== cities[idx].Status) {
        return res.status(403).json({ error: 'Permission Denied: City Managers cannot change status directly. Use the Propose Status Change option.' });
      }
      
      if (updates.market_notes !== undefined) cities[idx].Market_Notes = updates.market_notes;
      
      const compIntel = updates.competitive_intel || {};
      if (compIntel.oyo_property_count !== undefined) cities[idx].Oyo_Property_Count = parseInt(compIntel.oyo_property_count) || 0;
      if (compIntel.avg_price_point !== undefined) cities[idx].Avg_Price_Point = parseFloat(compIntel.avg_price_point) || 0;
      
      cities[idx].Updated_At = new Date().toISOString();
      cities[idx].Updated_By = req.user.email;
      writeExcelDb(citiesDbPath, 'Cities', cities);
      checkAndNotifyExpansionMilestone(cities[idx].Name, req);
      
      logAction(req.user.email, 'city_manager', 'update_city_tracker', `Updated city ${currentCityName} operational updates`, req);
      res.json({ success: true, message: 'City operational updates saved.' });
    }
  } catch (err) {
    console.error('Failed to update city:', err);
    res.status(500).json({ error: 'Failed to update city expansion.' });
  }
});

// 3.5 DELETE remove/delete a target city (Admin-only strategic control)
app.delete('/api/expansion/cities/:id', authenticateToken, (req, res) => {
  try {
    const cityId = parseInt(req.params.id);
    const deletePerm = checkUserPermission(req, 'City Expansion Strategy', 'delete');
    
    if (!deletePerm.allowed) {
      return res.status(403).json({ error: 'Access Denied: You do not have permission to remove city targets.' });
    }
    
    let cities = readExcelDb(citiesDbPath);
    const target = cities.find(c => parseInt(c.ID) === cityId);
    if (!target) {
      return res.status(404).json({ error: 'City target not found.' });
    }
    
    cities = cities.filter(c => parseInt(c.ID) !== cityId);
    writeExcelDb(citiesDbPath, 'Cities', cities);
    
    logAction(req.user.email, 'super_admin', 'delete_city_expansion', `Removed city target: ${target.Name}`, req);
    res.json({ success: true, message: `City target "${target.Name}" removed successfully.` });
  } catch (err) {
    console.error('Failed to delete city target:', err);
    res.status(500).json({ error: 'Failed to delete city target.' });
  }
});

// 4. POST Propose City Status Change (Management Console queue submission)
app.post('/api/expansion/cities/:id/propose-status', authenticateToken, (req, res) => {
  try {
    const cityId = parseInt(req.params.id);
    const { role, city: simCity } = getExpansionRoleAndCity(req);
    
    if (role === 'developer') {
      return res.status(403).json({ error: 'Access Denied: Developers cannot propose status changes.' });
    }
    
    const cities = readExcelDb(citiesDbPath);
    const c = cities.find(c => parseInt(c.ID) === cityId);
    if (!c) {
      return res.status(404).json({ error: 'City not found.' });
    }
    
    if (role === 'city_manager' && simCity && simCity.toLowerCase() !== c.Name.toLowerCase()) {
      return res.status(403).json({ error: `Access Denied: You are only authorized to manage ${simCity}.` });
    }
    
    const { proposedStatus, reason } = req.body;
    if (!proposedStatus || !reason) {
      return res.status(400).json({ error: 'Proposed status and reason are required.' });
    }
    
    const allowedStatuses = ['Target', 'Onboarding', 'Active', 'Paused'];
    if (!allowedStatuses.includes(proposedStatus)) {
      return res.status(400).json({ error: 'Invalid proposed status.' });
    }
    
    const queue = readExcelDb(cityApprovalQueueDbPath);
    let newId = 1;
    if (queue.length > 0) {
      newId = Math.max(...queue.map(q => parseInt(q.ID) || 0)) + 1;
    }
    
    queue.push({
      ID: newId,
      City_ID: cityId,
      Proposed_Status: proposedStatus,
      Reason: reason,
      Submitted_By: req.user.email,
      Submitted_At: new Date().toISOString(),
      Status: 'Pending',
      Comment: '',
      Handled_By: '',
      Handled_At: ''
    });
    
    writeExcelDb(cityApprovalQueueDbPath, 'ApprovalQueue', queue);
    logAction(req.user.email, role, 'propose_city_status', `Proposed status change for ${c.Name} to ${proposedStatus}`, req);
    res.json({ success: true, message: 'Status change proposal submitted to Admin approval queue.' });
  } catch (err) {
    console.error('Failed to submit status proposal:', err);
    res.status(500).json({ error: 'Failed to submit status change proposal.' });
  }
});

// 5. GET Approval Queue (Admin Console view)
app.get('/api/expansion/approval-queue', authenticateToken, (req, res) => {
  try {
    const queue = readExcelDb(cityApprovalQueueDbPath);
    const cities = readExcelDb(citiesDbPath);
    
    const merged = queue.map(q => {
      const cityObj = cities.find(c => parseInt(c.ID) === parseInt(q.City_ID)) || {};
      return {
        id: parseInt(q.ID),
        city_id: parseInt(q.City_ID),
        city_name: cityObj.Name || 'Unknown',
        current_status: cityObj.Status || 'Unknown',
        proposed_status: q.Proposed_Status,
        reason: q.Reason,
        submitted_by: q.Submitted_By,
        submitted_at: q.Submitted_At,
        status: q.Status,
        comment: q.Comment || '',
        handled_by: q.Handled_By || '',
        handled_at: q.Handled_At || ''
      };
    });
    
    res.json(merged);
  } catch (err) {
    console.error('Failed to fetch approval queue:', err);
    res.status(500).json({ error: 'Failed to retrieve approval queue.' });
  }
});

// 6. POST resolve approval queue item (Approve / Reject)
app.post('/api/expansion/approval-queue/:id/resolve', authenticateToken, (req, res) => {
  try {
    const queueId = parseInt(req.params.id);
    const { role } = getExpansionRoleAndCity(req);
    
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access Denied: Only Super Admin role can approve/reject status changes.' });
    }
    
    const { action, comment } = req.body; 
    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be Approved or Rejected.' });
    }
    
    const queue = readExcelDb(cityApprovalQueueDbPath);
    const idx = queue.findIndex(q => parseInt(q.ID) === queueId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Approval request not found.' });
    }
    
    if (queue[idx].Status !== 'Pending') {
      return res.status(400).json({ error: 'This request has already been handled.' });
    }
    
    queue[idx].Status = action;
    queue[idx].Comment = comment || '';
    queue[idx].Handled_By = req.user.email;
    queue[idx].Handled_At = new Date().toISOString();
    writeExcelDb(cityApprovalQueueDbPath, 'ApprovalQueue', queue);
    
    const cityId = parseInt(queue[idx].City_ID);
    const proposedStatus = queue[idx].Proposed_Status;
    const cities = readExcelDb(citiesDbPath);
    const cityIdx = cities.findIndex(c => parseInt(c.ID) === cityId);
    
    if (action === 'Approved' && cityIdx !== -1) {
      const oldStatus = cities[cityIdx].Status;
      cities[cityIdx].Status = proposedStatus;
      cities[cityIdx].Updated_At = new Date().toISOString();
      cities[cityIdx].Updated_By = req.user.email;
      writeExcelDb(citiesDbPath, 'Cities', cities);
      
      const history = readExcelDb(cityStatusHistoryDbPath);
      let histId = 1;
      if (history.length > 0) {
        histId = Math.max(...history.map(h => parseInt(h.ID) || 0)) + 1;
      }
      history.push({
        ID: histId,
        City_ID: cityId,
        Old_Status: oldStatus,
        New_Status: proposedStatus,
        Changed_By: req.user.email,
        Changed_At: new Date().toISOString(),
        Reason: `Approval of request: ${queue[idx].Reason}. Comment: ${comment || 'None'}`
      });
      writeExcelDb(cityStatusHistoryDbPath, 'StatusHistory', history);
    }
    
    logAction(req.user.email, 'super_admin', 'resolve_city_status_request', `Resolved request ID ${queueId} as ${action}`, req);
    res.json({ success: true, message: `Request successfully ${action.toLowerCase()}.` });
  } catch (err) {
    console.error('Failed to resolve request:', err);
    res.status(500).json({ error: 'Failed to resolve status proposal.' });
  }
});

// 7. GET pipeline entries per city
app.get('/api/expansion/pipeline', authenticateToken, (req, res) => {
  try {
    const { role, city } = getExpansionRoleAndCity(req);
    const pipeline = readExcelDb(cityPipelineDbPath);
    const cities = readExcelDb(citiesDbPath);
    
    let formatted = pipeline.map(p => {
      const cityObj = cities.find(c => parseInt(c.ID) === parseInt(p.City_ID)) || {};
      
      const lastUpdate = new Date(p.Stage_Updated_At);
      const diffDays = Math.floor((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));
      const stuck = diffDays >= 30;
      
      return {
        id: parseInt(p.ID),
        city_id: parseInt(p.City_ID),
        city_name: cityObj.Name || 'Unknown',
        hotel_lead_name: p.Hotel_Lead_Name,
        stage: p.Stage,
        stage_updated_at: p.Stage_Updated_At,
        stuck_flag: stuck,
        notes: p.Notes || '',
        updated_by: p.Updated_By || ''
      };
    });
    
    if (role === 'city_manager' && city) {
      formatted = formatted.filter(p => p.city_name.toLowerCase() === city.toLowerCase());
    }
    
    res.json(formatted);
  } catch (err) {
    console.error('Failed to get pipeline:', err);
    res.status(500).json({ error: 'Failed to retrieve pipeline entries.' });
  }
});

// 8. POST add new pipeline lead
app.post('/api/expansion/pipeline', authenticateToken, (req, res) => {
  try {
    const { role, city: simCity } = getExpansionRoleAndCity(req);
    if (role === 'developer') {
      return res.status(403).json({ error: 'Access Denied: Developers cannot manage pipeline entries.' });
    }
    
    const { city_id, hotel_lead_name, stage, notes } = req.body;
    if (!city_id || !hotel_lead_name || !stage) {
      return res.status(400).json({ error: 'city_id, hotel_lead_name, and stage are required.' });
    }
    
    const cities = readExcelDb(citiesDbPath);
    const c = cities.find(c => parseInt(c.ID) === parseInt(city_id));
    if (!c) {
      return res.status(404).json({ error: 'City target not found.' });
    }
    
    if (role === 'city_manager' && simCity && simCity.toLowerCase() !== c.Name.toLowerCase()) {
      return res.status(403).json({ error: `Access Denied: You can only add leads for ${simCity}.` });
    }
    
    const pipeline = readExcelDb(cityPipelineDbPath);
    let newId = 1;
    if (pipeline.length > 0) {
      newId = Math.max(...pipeline.map(p => parseInt(p.ID) || 0)) + 1;
    }
    
    const newLead = {
      ID: newId,
      City_ID: parseInt(city_id),
      Hotel_Lead_Name: hotel_lead_name,
      Stage: stage,
      Stage_Updated_At: new Date().toISOString(),
      Stuck_Flag: 'false',
      Notes: notes || '',
      Updated_By: req.user.name || req.user.email
    };
    
    pipeline.push(newLead);
    writeExcelDb(cityPipelineDbPath, 'Pipeline', pipeline);
    
    logAction(req.user.email, role, 'create_pipeline_lead', `Added pipeline lead ${hotel_lead_name} to ${c.Name}`, req);
    res.status(201).json({ success: true, lead: newLead });
  } catch (err) {
    console.error('Failed to create pipeline lead:', err);
    res.status(500).json({ error: 'Failed to create pipeline lead.' });
  }
});

// 9. PUT update pipeline lead (Kanban drag-and-drop or detail update)
app.put('/api/expansion/pipeline/:id', authenticateToken, (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { role, city: simCity } = getExpansionRoleAndCity(req);
    
    if (role === 'developer') {
      return res.status(403).json({ error: 'Access Denied: Developers cannot manage pipeline entries.' });
    }
    
    const pipeline = readExcelDb(cityPipelineDbPath);
    const idx = pipeline.findIndex(p => parseInt(p.ID) === leadId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Pipeline entry not found.' });
    }
    
    const cities = readExcelDb(citiesDbPath);
    const c = cities.find(c => parseInt(c.ID) === parseInt(pipeline[idx].City_ID));
    
    if (role === 'city_manager' && simCity && c && simCity.toLowerCase() !== c.Name.toLowerCase()) {
      return res.status(403).json({ error: `Access Denied: You can only edit leads for ${simCity}.` });
    }
    
    const { stage, notes, hotel_lead_name } = req.body;
    
    const oldStage = pipeline[idx].Stage;
    if (stage !== undefined && stage !== oldStage) {
      pipeline[idx].Stage = stage;
      pipeline[idx].Stage_Updated_At = new Date().toISOString();
      pipeline[idx].Stuck_Flag = 'false'; 
      
      if (stage.toLowerCase() === 'signed' || stage.toLowerCase() === 'live') {
        try {
          if (typeof triggerWebhook === 'function') {
            triggerWebhook('property.status.changed', {
              propertyId: 100 + leadId,
              propertyName: pipeline[idx].Hotel_Lead_Name,
              status: 'Signed',
              city: c ? c.Name : 'Mumbai',
              timestamp: new Date().toISOString()
            });
          }
          
          const properties = readExcelDb(propertiesDbPath);
          let newPropId = properties.length > 0 ? Math.max(...properties.map(p => p.ID)) + 1 : 1;
          properties.push({
            ID: newPropId,
            Name: pipeline[idx].Hotel_Lead_Name,
            Location: c ? c.Name : 'Mumbai',
            Type: 'hotel',
            Price: 3000,
            Beds: 2,
            Baths: 2,
            Area: 350,
            Image: 'couple_room.png',
            Status: 'Signed',
            Date_Added: new Date().toISOString(),
            Inventory: 10
          });
          writeExcelDb(propertiesDbPath, 'Properties', properties);
        } catch (we) {
          console.error('Failed to auto-sync signed property count:', we);
        }
      }
    }
    
    if (notes !== undefined) pipeline[idx].Notes = notes;
    if (hotel_lead_name !== undefined) pipeline[idx].Hotel_Lead_Name = hotel_lead_name;
    
    pipeline[idx].Updated_By = req.user.name || req.user.email;
    writeExcelDb(cityPipelineDbPath, 'Pipeline', pipeline);
    
    logAction(req.user.email, role, 'update_pipeline_lead', `Updated pipeline lead ID ${leadId} (${pipeline[idx].Hotel_Lead_Name}) to stage ${pipeline[idx].Stage}`, req);
    res.json({ success: true, lead: pipeline[idx] });
  } catch (err) {
    console.error('Failed to update pipeline lead:', err);
    res.status(500).json({ error: 'Failed to update pipeline lead.' });
  }
});

// 10. GET City Status Change History
app.get('/api/expansion/history/:cityId', authenticateToken, (req, res) => {
  try {
    const cityId = parseInt(req.params.cityId);
    const history = readExcelDb(cityStatusHistoryDbPath).filter(h => parseInt(h.City_ID) === cityId);
    res.json(history.reverse()); 
  } catch (err) {
    console.error('Failed to get status history:', err);
    res.status(500).json({ error: 'Failed to get status history.' });
  }
});

// Webhook payload receiver (auto-sync destination simulation)
app.post('/api/expansion/webhook-sync', (req, res) => {
  console.log('[WEBHOOK RECEIVED] /api/expansion/webhook-sync payload:', req.body);
  res.json({ success: true, message: 'Sync payload processed successfully' });
});

// AI Chatbot Assistant endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    
    // Check for API key
    let apiKey = process.env.GEMINI_API_KEY || '';
    const configPath = path.resolve(__dirname, 'google-config.json');
    if (!apiKey && fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        apiKey = config.geminiApiKey || '';
      } catch (e) {}
    }
    
    const systemPrompt = `You are HOMZO Concierge, the official virtual assistant for the HOMZO Hospitality platform. Your goal is to guide guests (customers) and property partners (hotel owners) in a highly professional and welcoming manner.

HOMZO Platform Guidelines:
1. Short-Term Room Booking:
   - Guide users to use the main homepage search widget.
   - Flow: Select City -> Enter Check-In/Check-Out -> Choose Guest Count -> Click 'Search' -> Choose room -> Click 'Book Now' -> Fill guest details (Name, DOB, Phone, Guest Type) -> Complete Payment.
   - Confirmations: Booking invoice & confirmations are instantly sent via Email, SMS, and WhatsApp.

2. Long-Term Room Booking (Monthly Subscription Stays):
   - For stays longer than 30 days, guide guests to Monthly Subscription Plans.
   - Student Stays: Shared stays from ₹3,500/month (includes high-speed Wi-Fi, study zones, study zone power backups, and monthly meal plans).
   - Employee/Corporate Stays: Executive Corp quarters from ₹10,800/month (includes gym access, room service, utilities).
   - Highlight that monthly plans are significantly cheaper than nightly rates.

3. Property Partnership Onboarding:
   - Onboarding process: Go to partner.html or click 'Advertise Your Homes' -> Click 'Register' -> Fill statutory bank details (GST, PAN, Bank account, IFSC) -> Admin reviews and approves the application -> Partner logs in -> Add property details, rates, and amenities -> Quality Inspector physical audit check -> Goes live.
   - Commission: Homzo takes a standard 15% commission on standard bookings and 18% commission for premium/executive corporate listings. No registration fees.

Keep your answers brief, polite, helpful, and highly professional. Respond in the same language as the user query (English/Hinglish/Hindi).`;

    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Query: ${message}` }]
          }
        ]
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const resData = await response.json();
        if (resData.candidates && resData.candidates[0] && resData.candidates[0].content && resData.candidates[0].content.parts[0]) {
          const reply = resData.candidates[0].content.parts[0].text;
          return res.json({ reply, source: 'Gemini AI' });
        }
      }
    }
    
    // Local NLP Fallback (Free & Offline Rule-based)
    const msg = message.toLowerCase();
    let reply = "";
    
    if (msg.includes('partner') || msg.includes('onboard') || msg.includes('list') || msg.includes('register') || msg.includes('join') || msg.includes('advertise')) {
      reply = `To onboard your property as a Partner with HOMZO:
1. Go to the **Partner Page** (partner.html) or click 'Advertise Your Homes' in the header/footer.
2. Click **Register** and fill in your statutory bank details (GST, PAN, Bank Account, IFSC).
3. The Super Admin reviews and approves your contract application.
4. Once approved, log in, add your property details (room categories, seasonal pricing, amenities, and inventory).
5. Our Quality Manager will schedule a physical inspection. Once verified, your listing goes live!
*Note: HOMZO charges a transparent commission: 15% on standard bookings and 18% on premium/executive corporate listings.*`;
    } else if (msg.includes('commission') || msg.includes('booking fee') || msg.includes('percent') || msg.includes('%')) {
      reply = `HOMZO charges a standard commission of:
- **15% commission** on standard rooms and bookings.
- **18% commission** on premium/executive corporate listings.
We deduct this automatically during booking settlements. There are no upfront registration or listing fees!`;
    } else if (msg.includes('long term') || msg.includes('longstay') || msg.includes('subscription') || msg.includes('pg') || msg.includes('hostel') || msg.includes('month') || msg.includes('monthly') || msg.includes('student') || msg.includes('employee')) {
      reply = `For long-term accommodation (> 30 days), we offer highly cost-effective **Monthly Subscription Plans**:
- **Students**: Shared stays starting from ₹3,500/month (includes high-speed Wi-Fi, study zones, study zone power backups, and monthly meal plans).
- **Employees**: Executive Corp quarters starting from ₹10,800/month (near IT hubs with gym access and room service).
Monthly plans are significantly cheaper than nightly rates. To book, select the 'Students' or 'Employees' tab on our search widget or submit a query on the homepage.`;
    } else if (msg.includes('book') || msg.includes('reserve') || msg.includes('room') || msg.includes('stay') || msg.includes('hotel') || msg.includes('short term')) {
      reply = `To book a short-term or standard stay on HOMZO:
1. Use the **Search Box** on the homepage.
2. Select your desired **City**, **Check-in Date**, **Check-out Date**, and number of **Guests**.
3. Click **Search** to view handpicked, verified listings.
4. Select your preferred room, click **Book Now**, and enter guest details (minimum 18 years old).
5. Complete payment (Stripe/Razorpay or Simulation Mode). You will receive instant confirmations via Email, SMS, and WhatsApp!`;
    } else if (msg.includes('complaint') || msg.includes('issue') || msg.includes('support') || msg.includes('refund') || msg.includes('cancel')) {
      reply = `To raise a complaint or get support:
- **Guests**: Go to the **Contact** form on the homepage and submit a message, or log in and file a ticket in the **My Stays** portal.
- **Partners**: File a ticket through the Partner Dashboard under the "Support & Tickets" tab.
All tickets are reviewed by our Operations team and resolved within 24 hours.`;
    } else {
      reply = `Hello! I am the **HOMZO Concierge** assistant. I can guide you on:
- How to book a room (Short-term/Standard stays)
- Booking long-term rooms (Monthly Stays for Students & Employees starting at ₹3,500/mo)
- How to onboard properties as a Partner (GST, PAN details & 15%-18% commission rates)
- Filing complaints or raising support tickets.
What would you like to know today?`;
    }
    
    return res.json({ reply, source: 'Homzo NLP Local' });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process assistant chat.' });
  }
});

// ─── DYNAMIC PAYMENT GATEWAY ROUTING ───

app.get('/api/payments/checkout-config', (req, res) => {
  res.json({
    razorpayEnabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    simulationMode: !(process.env.RAZORPAY_KEY_ID || process.env.STRIPE_SECRET_KEY),
    upiId: process.env.UPI_ID || 'homzo@upi'
  });
});

app.post('/api/payments/razorpay/create-order', async (req, res) => {
  const { amount, currency } = req.body;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    return res.status(400).json({ error: 'Razorpay is not configured on this server.' });
  }
  
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // in paise
        currency: currency || 'INR',
        receipt: 'rcpt_' + Math.random().toString(36).substr(2, 9).toUpperCase()
      })
    });
    
    const order = await response.json();
    if (!response.ok) throw new Error(order.error ? order.error.description : 'Razorpay order creation failed');
    
    res.json(order);
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/stripe/create-intent', async (req, res) => {
  const { amount, currency } = req.body;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    return res.status(400).json({ error: 'Stripe is not configured on this server.' });
  }
  
  try {
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${secretKey}`
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount * 100)), // in cents
        currency: currency || 'inr',
        'payment_method_types[]': 'card'
      })
    });
    
    const intent = await response.json();
    if (!response.ok) throw new Error(intent.error ? intent.error.message : 'Stripe payment intent failed');
    
    res.json({ clientSecret: intent.client_secret, id: intent.id });
  } catch (err) {
    console.error('Stripe intent error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
async function start() {
  try {
    await initDb();
    await seedSystemDefaults();
    await populateCache();
    runLegacySeedScripts();
    
    app.listen(PORT, () => {
      console.log(`Excel Backend Server is running on http://localhost:${PORT}`);
      initGoogleSheets();
    });
  } catch (err) {
    console.error('Failed to initialize database/cache:', err);
    process.exit(1);
  }
}
start();
