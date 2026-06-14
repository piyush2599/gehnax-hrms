// Import all models so their schemas are registered with Mongoose before any
// query that uses .populate() runs. This file is imported by connectDB() so
// every API route gets all schemas automatically.
import "@/models/User";
import "@/models/Employee";
import "@/models/Department";
import "@/models/Attendance";
import "@/models/Leave";
import "@/models/Payroll";
import "@/models/Timesheet";
import "@/models/Announcement";
import "@/models/Holiday";
import "@/models/JobPosting";
import "@/models/Candidate";
import "@/models/HiringDocument";
import "@/models/OnboardingInvite";
import "@/models/Expense";
import "@/models/PurchaseOrder";
import "@/models/Project";
import "@/models/Task";
import "@/models/OfferLetter";
import "@/models/CandidateAccount";
import "@/models/AttendanceRegularization";
import "@/models/CRMLead";
