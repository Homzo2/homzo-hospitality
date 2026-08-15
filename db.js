const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Load env configuration
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
  console.log('Using PostgreSQL / Supabase Remote Database Connection.');
} else {
  const dbPath = path.resolve(__dirname, process.env.DATABASE_STORAGE || 'database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
  });
  console.log('Using SQLite Local File-based Database Connection.');
}


// Model definitions
const Client = sequelize.define('Client', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Email: { type: DataTypes.STRING, allowNull: false },
  Phone: { type: DataTypes.STRING },
  DOB: { type: DataTypes.STRING },
  Persons: { type: DataTypes.INTEGER, defaultValue: 1 },
  Guest_Type: { type: DataTypes.STRING },
  Property: { type: DataTypes.STRING },
  Check_In: { type: DataTypes.STRING },
  Check_Out: { type: DataTypes.STRING },
  Notes: { type: DataTypes.TEXT },
  Status: { type: DataTypes.STRING, defaultValue: 'confirmed' },
  Date_Added: { type: DataTypes.STRING },
  Payment_Status: { type: DataTypes.STRING, defaultValue: 'Unpaid' },
  Payment_ID: { type: DataTypes.STRING },
  Transaction_Ref: { type: DataTypes.STRING },
  Customer_ID: { type: DataTypes.STRING }
}, { tableName: 'Clients', timestamps: false });

const Property = sequelize.define('Property', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Location: { type: DataTypes.STRING, allowNull: false },
  Type: { type: DataTypes.STRING },
  Price: { type: DataTypes.INTEGER },
  Beds: { type: DataTypes.INTEGER },
  Baths: { type: DataTypes.INTEGER },
  Area: { type: DataTypes.INTEGER },
  Image: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'Active' },
  Date_Added: { type: DataTypes.STRING },
  Inventory: { type: DataTypes.INTEGER, defaultValue: 10 },
  Rating: { type: DataTypes.FLOAT },
  Reviews: { type: DataTypes.INTEGER },
  Latitude: { type: DataTypes.FLOAT },
  Longitude: { type: DataTypes.FLOAT },
  Onboarding_Stage: { type: DataTypes.STRING, defaultValue: 'Draft' },
  Commission_Rate: { type: DataTypes.FLOAT, defaultValue: 15 },
  Registration_Status: { type: DataTypes.STRING, defaultValue: 'Registered' },
  Is_Founding_Partner: { type: DataTypes.BOOLEAN, defaultValue: false },
  Min_Rooms_Checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  Aadhaar_Doc: { type: DataTypes.STRING },
  PAN_Doc: { type: DataTypes.STRING },
  Owner_Photo_Doc: { type: DataTypes.STRING },
  Incorporation_Doc: { type: DataTypes.STRING },
  Authorization_Doc: { type: DataTypes.STRING },
  Ownership_Doc: { type: DataTypes.STRING },
  Rent_Agreement_Doc: { type: DataTypes.STRING },
  NOC_Doc: { type: DataTypes.STRING },
  GST_Doc: { type: DataTypes.STRING },
  Business_Registration_Doc: { type: DataTypes.STRING },
  Partnership_Deed_Doc: { type: DataTypes.STRING },
  Fire_Safety_Doc: { type: DataTypes.STRING },
  Police_Verification_Doc: { type: DataTypes.STRING },
  Trade_License_Doc: { type: DataTypes.STRING },
  FSSAI_Doc: { type: DataTypes.STRING },
  Cancelled_Cheque_Doc: { type: DataTypes.STRING },
  Address: { type: DataTypes.STRING },
  City: { type: DataTypes.STRING },
  State: { type: DataTypes.STRING },
  Pincode: { type: DataTypes.STRING },
  Google_Maps_Link: { type: DataTypes.STRING },
  Contact_Person: { type: DataTypes.STRING },
  Phone: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  Total_Rooms: { type: DataTypes.INTEGER },
  Available_Rooms: { type: DataTypes.INTEGER },
  Max_Guests: { type: DataTypes.INTEGER },
  Bank_Account_Holder: { type: DataTypes.STRING },
  Bank_Account_Number: { type: DataTypes.STRING },
  Bank_IFSC: { type: DataTypes.STRING },
  Bank_Verification_Note: { type: DataTypes.STRING },
  Checklist_Status: { type: DataTypes.TEXT },
  Correction_Notes: { type: DataTypes.TEXT },
  Policies: { type: DataTypes.TEXT },
  Partner_Agreement_Accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  Commission_Change_Log: { type: DataTypes.TEXT }
}, { tableName: 'Properties', timestamps: false });

const Inquiry = sequelize.define('Inquiry', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Email: { type: DataTypes.STRING, allowNull: false },
  Type: { type: DataTypes.STRING },
  Message: { type: DataTypes.TEXT },
  Date_Added: { type: DataTypes.STRING }
}, { tableName: 'Inquiries', timestamps: false });

const Review = sequelize.define('Review', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Email: { type: DataTypes.STRING, allowNull: false },
  Rating: { type: DataTypes.INTEGER, allowNull: false },
  Review: { type: DataTypes.TEXT },
  Status: { type: DataTypes.STRING, defaultValue: 'pending' },
  Date_Added: { type: DataTypes.STRING },
  Reply: { type: DataTypes.TEXT }
}, { tableName: 'Reviews', timestamps: false });

const Partner = sequelize.define('Partner', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Email: { type: DataTypes.STRING, allowNull: false, unique: true },
  Password: { type: DataTypes.STRING, allowNull: false },
  Phone: { type: DataTypes.STRING },
  Assigned_Properties: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'active' },
  GST: { type: DataTypes.STRING },
  PAN: { type: DataTypes.STRING },
  Bank_Account: { type: DataTypes.STRING },
  Bank_IFSC: { type: DataTypes.STRING },
  Verification_Status: { type: DataTypes.STRING, defaultValue: 'pending' },
  Date_Created: { type: DataTypes.STRING }
}, { tableName: 'Partners', timestamps: false });

const AuditLog = sequelize.define('AuditLog', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Timestamp: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  Role: { type: DataTypes.STRING },
  Action: { type: DataTypes.STRING },
  Details: { type: DataTypes.TEXT },
  IP: { type: DataTypes.STRING },
  User_Agent: { type: DataTypes.STRING }
}, { tableName: 'AuditLogs', timestamps: false });

const Ticket = sequelize.define('Ticket', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Partner_Email: { type: DataTypes.STRING },
  Subject: { type: DataTypes.STRING },
  Category: { type: DataTypes.STRING },
  Message: { type: DataTypes.TEXT },
  Status: { type: DataTypes.STRING, defaultValue: 'open' },
  Reply: { type: DataTypes.TEXT },
  Date_Created: { type: DataTypes.STRING }
}, { tableName: 'Tickets', timestamps: false });

const Notification = sequelize.define('Notification', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Recipient_Email: { type: DataTypes.STRING },
  Title: { type: DataTypes.STRING },
  Message: { type: DataTypes.TEXT },
  Status: { type: DataTypes.STRING, defaultValue: 'unread' },
  Date_Created: { type: DataTypes.STRING }
}, { tableName: 'Notifications', timestamps: false });

const Payout = sequelize.define('Payout', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Partner: { type: DataTypes.STRING, allowNull: false },
  Amount: { type: DataTypes.INTEGER, allowNull: false },
  Date: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'pending_approval' }
}, { tableName: 'Payouts', timestamps: false });

const PartnerMeta = sequelize.define('PartnerMeta', {
  Property_ID: { type: DataTypes.INTEGER, primaryKey: true },
  Room_Categories: { type: DataTypes.TEXT },
  Inventory: { type: DataTypes.INTEGER, defaultValue: 10 },
  Seasonal_Price: { type: DataTypes.INTEGER, defaultValue: 0 },
  Weekend_Price: { type: DataTypes.INTEGER, defaultValue: 0 },
  Discounts: { type: DataTypes.TEXT },
  Blocked_Dates: { type: DataTypes.TEXT },
  Policies: { type: DataTypes.TEXT },
  Amenities: { type: DataTypes.TEXT },
  Check_In_Out: { type: DataTypes.TEXT }
}, { tableName: 'PartnerMeta', timestamps: false });

const Task = sequelize.define('Task', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Task_Name: { type: DataTypes.STRING },
  Assigned_To: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  Date_Created: { type: DataTypes.STRING }
}, { tableName: 'Tasks', timestamps: false });

const City = sequelize.define('City', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Status: { type: DataTypes.STRING, defaultValue: 'Target' },
  Launch_Quarter_Planned: { type: DataTypes.STRING },
  Launch_Date_Actual: { type: DataTypes.STRING },
  Target_Hotel_Count: { type: DataTypes.INTEGER },
  Signed_Hotel_Count: { type: DataTypes.INTEGER },
  Budget_Allocated: { type: DataTypes.INTEGER },
  City_Manager_ID: { type: DataTypes.STRING },
  Market_Notes: { type: DataTypes.TEXT },
  Oyo_Property_Count: { type: DataTypes.INTEGER },
  Avg_Price_Point: { type: DataTypes.INTEGER },
  Created_At: { type: DataTypes.STRING },
  Updated_At: { type: DataTypes.STRING },
  Updated_By: { type: DataTypes.STRING }
}, { tableName: 'Cities', timestamps: false });

const Pipeline = sequelize.define('Pipeline', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  City_ID: { type: DataTypes.INTEGER },
  Hotel_Lead_Name: { type: DataTypes.STRING },
  Stage: { type: DataTypes.STRING },
  Stage_Updated_At: { type: DataTypes.STRING },
  Stuck_Flag: { type: DataTypes.STRING, defaultValue: 'false' },
  Notes: { type: DataTypes.TEXT },
  Updated_By: { type: DataTypes.STRING }
}, { tableName: 'Pipeline', timestamps: false });

const StatusHistory = sequelize.define('StatusHistory', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  City_ID: { type: DataTypes.INTEGER },
  Old_Status: { type: DataTypes.STRING },
  New_Status: { type: DataTypes.STRING },
  Changed_By: { type: DataTypes.STRING },
  Changed_At: { type: DataTypes.STRING },
  Reason: { type: DataTypes.TEXT }
}, { tableName: 'StatusHistory', timestamps: false });

const ApprovalQueue = sequelize.define('ApprovalQueue', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  City_ID: { type: DataTypes.INTEGER },
  Proposed_Status: { type: DataTypes.STRING },
  Reason: { type: DataTypes.TEXT },
  Submitted_By: { type: DataTypes.STRING },
  Submitted_At: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'Pending' },
  Comment: { type: DataTypes.TEXT },
  Handled_By: { type: DataTypes.STRING },
  Handled_At: { type: DataTypes.STRING }
}, { tableName: 'ApprovalQueue', timestamps: false });

const Role = sequelize.define('Role', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Description: { type: DataTypes.TEXT },
  Console_Type: { type: DataTypes.STRING },
  Is_System_Default: { type: DataTypes.STRING, defaultValue: 'false' },
  Created_By: { type: DataTypes.STRING },
  Created_At: { type: DataTypes.STRING }
}, { tableName: 'Roles', timestamps: false });

const Permission = sequelize.define('Permission', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Role_ID: { type: DataTypes.INTEGER },
  Module_ID: { type: DataTypes.STRING },
  Can_View: { type: DataTypes.STRING, defaultValue: 'false' },
  Can_Add: { type: DataTypes.STRING, defaultValue: 'false' },
  Can_Edit: { type: DataTypes.STRING, defaultValue: 'false' },
  Can_Delete: { type: DataTypes.STRING, defaultValue: 'false' },
  Can_Approve: { type: DataTypes.STRING, defaultValue: 'false' },
  Scope: { type: DataTypes.STRING }
}, { tableName: 'Permissions', timestamps: false });

const User = sequelize.define('User', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Email: { type: DataTypes.STRING, allowNull: false, unique: true },
  Password: { type: DataTypes.STRING, allowNull: false },
  Phone: { type: DataTypes.STRING },
  Role_ID: { type: DataTypes.INTEGER },
  Assigned_City_ID: { type: DataTypes.INTEGER },
  Status: { type: DataTypes.STRING, defaultValue: 'Active' },
  Created_By: { type: DataTypes.STRING },
  Last_Login: { type: DataTypes.STRING }
}, { tableName: 'Users', timestamps: false });

const Changelog = sequelize.define('Changelog', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Changed_By: { type: DataTypes.STRING },
  Target_User_ID: { type: DataTypes.INTEGER },
  Old_Permissions: { type: DataTypes.TEXT },
  New_Permissions: { type: DataTypes.TEXT },
  Reason_Note: { type: DataTypes.TEXT },
  Timestamp: { type: DataTypes.STRING }
}, { tableName: 'Changelogs', timestamps: false });

const Employee = sequelize.define('Employee', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  EmployeeID: { type: DataTypes.STRING },
  Name: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  Role: { type: DataTypes.STRING },
  Cities: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'Active' },
  Documents: { type: DataTypes.STRING }
}, { tableName: 'Employees', timestamps: false });

const Job = sequelize.define('Job', {
  ID: { type: DataTypes.STRING, primaryKey: true },
  Title: { type: DataTypes.STRING },
  Department: { type: DataTypes.STRING },
  Location: { type: DataTypes.STRING },
  Employment_Type: { type: DataTypes.STRING },
  Experience_Level: { type: DataTypes.STRING },
  Salary: { type: DataTypes.STRING },
  Vacancies: { type: DataTypes.STRING },
  Description: { type: DataTypes.TEXT },
  Responsibilities: { type: DataTypes.TEXT },
  Skills: { type: DataTypes.TEXT },
  Qualifications: { type: DataTypes.TEXT },
  Benefits: { type: DataTypes.TEXT },
  Work_Mode: { type: DataTypes.STRING },
  Deadline: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'Open' },
  Date_Added: { type: DataTypes.STRING }
}, { tableName: 'Jobs', timestamps: false });

const Application = sequelize.define('Application', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Job_ID: { type: DataTypes.STRING },
  Name: { type: DataTypes.STRING },
  Email: { type: DataTypes.STRING },
  Phone: { type: DataTypes.STRING },
  Resume: { type: DataTypes.STRING },
  Cover_Letter: { type: DataTypes.TEXT },
  Status: { type: DataTypes.STRING, defaultValue: 'Applied' },
  Applied_At: { type: DataTypes.STRING }
}, { tableName: 'Applications', timestamps: false });

const Customer = sequelize.define('Customer', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  Name: { type: DataTypes.STRING, allowNull: false },
  Email: { type: DataTypes.STRING, allowNull: false, unique: true },
  Password: { type: DataTypes.STRING, allowNull: false },
  Phone: { type: DataTypes.STRING },
  Status: { type: DataTypes.STRING, defaultValue: 'Active' },
  Date_Created: { type: DataTypes.STRING }
}, { tableName: 'Customers', timestamps: false });

// Helper mapping for seed script
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
  'customers_database.csv': Customer,
  'payouts_database.csv': Payout
};

// Read Excel / CSV DB Helper (copied from server.js legacy helper)
function readExcelDb(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(ws);
  } catch (err) {
    console.error('Error reading CSV for seed:', filePath, err);
    return [];
  }
}

// Database Seeder
async function seedFromCSV() {
  console.log('--- Checking SQLite Database Seeding ---');
  for (const [csvFile, model] of Object.entries(fileToModelMap)) {
    const count = await model.count();
    if (count === 0) {
      const csvPath = path.resolve(__dirname, csvFile);
      if (fs.existsSync(csvPath)) {
        console.log(`Seeding model ${model.name} from ${csvFile}...`);
        const records = readExcelDb(csvPath);
        if (records.length > 0) {
          // Clean up records to match types
          const sanitizedRecords = records.map(record => {
            const clean = { ...record };
            // Ensure ID is matched correctly
            if (clean.ID !== undefined && model !== Job) {
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
            if (clean.Latitude !== undefined) {
              const parsed = parseFloat(clean.Latitude);
              clean.Latitude = isNaN(parsed) ? null : parsed;
            }
            if (clean.Longitude !== undefined) {
              const parsed = parseFloat(clean.Longitude);
              clean.Longitude = isNaN(parsed) ? null : parsed;
            }
            if (clean.Price !== undefined && typeof clean.Price === 'string') {
              // Extract number from price like "₹4,200" or "$45"
              const num = parseInt(clean.Price.replace(/[^0-9]/g, ''));
              clean.Price = isNaN(num) ? null : num;
            }
            if (clean.Inventory !== undefined) {
              const parsed = parseInt(clean.Inventory);
              clean.Inventory = isNaN(parsed) ? null : parsed;
            }
            if (clean.Property_ID !== undefined) {
              const parsed = parseInt(clean.Property_ID);
              clean.Property_ID = isNaN(parsed) ? null : parsed;
            }
            return clean;
          });
          
          try {
            await model.bulkCreate(sanitizedRecords);
            console.log(`Successfully seeded ${sanitizedRecords.length} records into table: ${model.tableName}`);
          } catch (err) {
            console.error(`Failed to bulk insert into ${model.name}:`, err.message);
          }
        }
      }
    }
  }
  console.log('--- Seeding Checks Finished ---');
}

async function initDb() {
  await sequelize.sync({ alter: true });
  await seedFromCSV();
}

module.exports = {
  sequelize,
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
};
