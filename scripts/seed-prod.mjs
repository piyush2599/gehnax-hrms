import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = "MONGODB_URI_REDACTED";

await mongoose.connect(MONGODB_URI);
console.log("Connected to hrms-prod on Atlas");

/* ── Schemas ── */
const DeptSchema = new mongoose.Schema({ name: String, code: String, description: String, managerId: mongoose.Schema.Types.ObjectId });
const UserSchema = new mongoose.Schema({ name: String, email: String, password: String, role: String, employeeId: mongoose.Schema.Types.ObjectId });
const EmpSchema = new mongoose.Schema({
  employeeCode: String, userId: mongoose.Schema.Types.ObjectId,
  firstName: String, lastName: String, email: String, phone: String,
  gender: String, dateOfBirth: Date, department: mongoose.Schema.Types.ObjectId,
  designation: String, employmentType: String, joiningDate: Date,
  salary: { basic: Number, hra: Number, allowances: Number, deductions: Number },
  leaveBalance: { annual: Number, sick: Number, casual: Number, maternity: Number, paternity: Number, unpaid: Number },
  reportingManager: mongoose.Schema.Types.ObjectId,
});
const AttSchema = new mongoose.Schema({ employeeId: mongoose.Schema.Types.ObjectId, date: Date, status: String, checkIn: String, checkOut: String, workingHours: Number });
const LeaveSchema = new mongoose.Schema({ employeeId: mongoose.Schema.Types.ObjectId, leaveType: String, startDate: Date, endDate: Date, totalDays: Number, reason: String, status: String, appliedOn: Date, reviewedBy: mongoose.Schema.Types.ObjectId, reviewedOn: Date });
const PayrollSchema = new mongoose.Schema({ employeeId: mongoose.Schema.Types.ObjectId, month: Number, year: Number, payPeriod: String, earnings: Object, deductions: Object, grossPay: Number, totalDeductions: Number, netPay: Number, workingDays: Number, presentDays: Number, leaveDays: Number, status: String, processedBy: mongoose.Schema.Types.ObjectId, processedOn: Date });
const AnnSchema = new mongoose.Schema({ title: String, content: String, priority: String, targetRoles: [String], postedBy: mongoose.Schema.Types.ObjectId, isActive: Boolean, expiresAt: Date });
const HolSchema = new mongoose.Schema({ name: String, date: Date, type: String, description: String, year: Number, isActive: Boolean });

const Department  = mongoose.models.Department  || mongoose.model("Department",  DeptSchema);
const User        = mongoose.models.User        || mongoose.model("User",        UserSchema);
const Employee    = mongoose.models.Employee    || mongoose.model("Employee",    EmpSchema);
const Attendance  = mongoose.models.Attendance  || mongoose.model("Attendance",  AttSchema);
const Leave       = mongoose.models.Leave       || mongoose.model("Leave",       LeaveSchema);
const Payroll     = mongoose.models.Payroll     || mongoose.model("Payroll",     PayrollSchema);
const Announcement = mongoose.models.Announcement || mongoose.model("Announcement", AnnSchema);
const Holiday     = mongoose.models.Holiday     || mongoose.model("Holiday",     HolSchema);

/* ── Departments ── */
const deptData = [
  { name: "Engineering",     code: "ENG", description: "Software Engineering & Development" },
  { name: "Human Resources", code: "HR",  description: "HR & People Operations" },
  { name: "Finance",         code: "FIN", description: "Finance & Accounts" },
  { name: "Marketing",       code: "MKT", description: "Marketing & Growth" },
  { name: "Operations",      code: "OPS", description: "Business Operations" },
];
const departments = {};
for (const d of deptData) {
  const dept = await Department.findOneAndUpdate({ code: d.code }, d, { upsert: true, new: true });
  departments[d.code] = dept;
}
console.log("Departments seeded");

/* ── Helper ── */
async function createEmployee(opts) {
  let user = await User.findOne({ email: opts.email });
  if (user) {
    const emp = await Employee.findOne({ userId: user._id });
    return { user, employee: emp };
  }
  const hash = await bcrypt.hash(opts.password, 12);
  user = await User.create({ name: `${opts.firstName} ${opts.lastName}`, email: opts.email, password: hash, role: opts.role });
  const employee = await Employee.create({
    employeeCode: opts.code, userId: user._id,
    firstName: opts.firstName, lastName: opts.lastName, email: opts.email,
    phone: opts.phone, gender: opts.gender, dateOfBirth: opts.dateOfBirth,
    department: departments[opts.dept]._id, designation: opts.designation,
    employmentType: opts.employmentType || "full_time", joiningDate: opts.joiningDate,
    salary: opts.salary,
    leaveBalance: { annual: 12, sick: 7, casual: 7, maternity: 0, paternity: 0, unpaid: 0 },
  });
  await User.findByIdAndUpdate(user._id, { employeeId: employee._id });
  return { user, employee };
}

/* ── Employees ── */
const { employee: adminEmp } = await createEmployee({ code:"EMP0001", firstName:"Rahul",  lastName:"Sharma", email:"admin@gehnax.com",         password:"Admin@123",   role:"super_admin", dept:"HR",  designation:"System Administrator",  joiningDate:new Date("2020-01-15"), salary:{basic:90000,  hra:36000, allowances:12000, deductions:0}, phone:"9876500001", gender:"male",   dateOfBirth:new Date("1985-03-10") });
const { employee: hrEmp }    = await createEmployee({ code:"EMP0002", firstName:"Priya",  lastName:"Nair",   email:"hr@gehnax.com",            password:"Hr@123456",   role:"hr_admin",    dept:"HR",  designation:"HR Manager",            joiningDate:new Date("2021-06-01"), salary:{basic:65000,  hra:26000, allowances:9000,  deductions:0}, phone:"9876500002", gender:"female", dateOfBirth:new Date("1990-07-22") });
const { employee: johnEmp }  = await createEmployee({ code:"EMP0003", firstName:"John",   lastName:"Doe",    email:"john@gehnax.com",          password:"Emp@123456",  role:"employee",    dept:"ENG", designation:"Software Engineer",      joiningDate:new Date("2022-03-15"), salary:{basic:55000,  hra:22000, allowances:6000,  deductions:0}, phone:"9876500003", gender:"male",   dateOfBirth:new Date("1995-11-05") });
const { employee: mgr1Emp }  = await createEmployee({ code:"EMP0004", firstName:"Rohan",  lastName:"Verma",  email:"rohan.verma@gehnax.com",   password:"Welcome@123", role:"manager",     dept:"ENG", designation:"Engineering Manager",    joiningDate:new Date("2019-08-01"), salary:{basic:120000, hra:48000, allowances:15000, deductions:0}, phone:"9876500004", gender:"male",   dateOfBirth:new Date("1988-05-14") });
const { employee: emp5 }     = await createEmployee({ code:"EMP0005", firstName:"Ananya", lastName:"Singh",  email:"ananya.singh@gehnax.com",  password:"Welcome@123", role:"employee",    dept:"ENG", designation:"Frontend Developer",     joiningDate:new Date("2022-09-01"), salary:{basic:60000,  hra:24000, allowances:7000,  deductions:0}, phone:"9876500005", gender:"female", dateOfBirth:new Date("1997-02-18") });
const { employee: emp6 }     = await createEmployee({ code:"EMP0006", firstName:"Vikram", lastName:"Patel",  email:"vikram.patel@gehnax.com",  password:"Welcome@123", role:"employee",    dept:"ENG", designation:"DevOps Engineer",        joiningDate:new Date("2021-11-10"), salary:{basic:70000,  hra:28000, allowances:8000,  deductions:0}, phone:"9876500006", gender:"male",   dateOfBirth:new Date("1993-09-30") });
const { employee: emp7 }     = await createEmployee({ code:"EMP0007", firstName:"Neha",   lastName:"Joshi",  email:"neha.joshi@gehnax.com",    password:"Welcome@123", role:"manager",     dept:"FIN", designation:"Finance Manager",        joiningDate:new Date("2020-04-01"), salary:{basic:85000,  hra:34000, allowances:10000, deductions:0}, phone:"9876500007", gender:"female", dateOfBirth:new Date("1987-12-08") });
const { employee: emp8 }     = await createEmployee({ code:"EMP0008", firstName:"Arjun",  lastName:"Kumar",  email:"arjun.kumar@gehnax.com",   password:"Welcome@123", role:"employee",    dept:"FIN", designation:"Senior Accountant",      joiningDate:new Date("2021-07-15"), salary:{basic:50000,  hra:20000, allowances:6000,  deductions:0}, phone:"9876500008", gender:"male",   dateOfBirth:new Date("1992-04-25") });
const { employee: emp9 }     = await createEmployee({ code:"EMP0009", firstName:"Sneha",  lastName:"Reddy",  email:"sneha.reddy@gehnax.com",   password:"Welcome@123", role:"manager",     dept:"MKT", designation:"Marketing Manager",      joiningDate:new Date("2020-10-01"), salary:{basic:80000,  hra:32000, allowances:9000,  deductions:0}, phone:"9876500009", gender:"female", dateOfBirth:new Date("1989-08-17") });
const { employee: emp10 }    = await createEmployee({ code:"EMP0010", firstName:"Raj",    lastName:"Mehta",  email:"raj.mehta@gehnax.com",     password:"Welcome@123", role:"employee",    dept:"MKT", designation:"Marketing Executive",    joiningDate:new Date("2023-01-02"), salary:{basic:40000,  hra:16000, allowances:5000,  deductions:0}, phone:"9876500010", gender:"male",   dateOfBirth:new Date("1998-06-11") });
const { employee: emp11 }    = await createEmployee({ code:"EMP0011", firstName:"Amit",   lastName:"Tiwari", email:"amit.tiwari@gehnax.com",   password:"Welcome@123", role:"manager",     dept:"OPS", designation:"Operations Manager",     joiningDate:new Date("2019-03-01"), salary:{basic:75000,  hra:30000, allowances:9000,  deductions:0}, phone:"9876500011", gender:"male",   dateOfBirth:new Date("1986-01-20") });
const { employee: emp12 }    = await createEmployee({ code:"EMP0012", firstName:"Kavya",  lastName:"Nair",   email:"kavya.nair@gehnax.com",    password:"Welcome@123", role:"employee",    dept:"OPS", designation:"Operations Executive",   joiningDate:new Date("2023-06-01"), salary:{basic:38000,  hra:15200, allowances:4500,  deductions:0}, phone:"9876500012", gender:"female", dateOfBirth:new Date("1999-03-28") });

const allEmployees = [adminEmp,hrEmp,johnEmp,mgr1Emp,emp5,emp6,emp7,emp8,emp9,emp10,emp11,emp12].filter(Boolean);
console.log(`Employees seeded: ${allEmployees.length}`);

/* ── Attendance: last 60 days ── */
const todayDate = new Date(); todayDate.setHours(0,0,0,0);
let attCount = 0;
for (const emp of allEmployees) {
  for (let d = 60; d >= 0; d--) {
    const date = new Date(todayDate); date.setDate(date.getDate() - d);
    const dow = date.getDay();
    let status, checkIn, checkOut, workingHours = 0;
    if (dow === 0 || dow === 6) { status = "weekend"; } else {
      const rand = Math.random();
      if (rand < 0.78) {
        status = "present";
        const inH = 9+Math.floor(Math.random()*0.5), inM = Math.floor(Math.random()*30);
        const outH = 17+Math.floor(Math.random()*2), outM = Math.floor(Math.random()*60);
        checkIn  = `${String(inH).padStart(2,"0")}:${String(inM).padStart(2,"0")}`;
        checkOut = `${String(outH).padStart(2,"0")}:${String(outM).padStart(2,"0")}`;
        workingHours = parseFloat((outH+outM/60-(inH+inM/60)).toFixed(1));
      } else if (rand < 0.88) {
        status = "late";
        const inH = 10+Math.floor(Math.random()*2), inM = Math.floor(Math.random()*60);
        const outH = 18+Math.floor(Math.random()*2), outM = Math.floor(Math.random()*60);
        checkIn  = `${String(inH).padStart(2,"0")}:${String(inM).padStart(2,"0")}`;
        checkOut = `${String(outH).padStart(2,"0")}:${String(outM).padStart(2,"0")}`;
        workingHours = parseFloat((outH+outM/60-(inH+inM/60)).toFixed(1));
      } else if (rand < 0.93) { status = "absent";
      } else if (rand < 0.97) { status = "on_leave";
      } else { status = "half_day"; checkIn="09:30"; checkOut="13:30"; workingHours=4; }
    }
    await Attendance.findOneAndUpdate({ employeeId: emp._id, date }, { employeeId: emp._id, date, status, checkIn, checkOut, workingHours }, { upsert: true, new: true });
    attCount++;
  }
}
console.log(`Attendance seeded: ${attCount} records`);

/* ── Leaves ── */
function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d; }
function daysFromNow(n) { const d=new Date(); d.setDate(d.getDate()+n); d.setHours(0,0,0,0); return d; }
const leaveRequests = [
  { emp:johnEmp, type:"Annual", start:daysAgo(25), end:daysAgo(23), days:3, reason:"Family vacation", status:"approved" },
  { emp:emp5,    type:"Sick",   start:daysAgo(15), end:daysAgo(14), days:2, reason:"Fever and cold",  status:"approved" },
  { emp:emp6,    type:"Casual", start:daysAgo(8),  end:daysAgo(8),  days:1, reason:"Personal work",   status:"approved" },
  { emp:emp8,    type:"Sick",   start:daysAgo(5),  end:daysAgo(4),  days:2, reason:"Doctor visit",    status:"pending"  },
  { emp:emp10,   type:"Annual", start:daysAgo(3),  end:daysAgo(1),  days:3, reason:"Travel plans",    status:"pending"  },
  { emp:emp12,   type:"Casual", start:daysFromNow(3), end:daysFromNow(3), days:1, reason:"Personal errand", status:"pending" },
  { emp:johnEmp, type:"Casual", start:daysFromNow(7), end:daysFromNow(8), days:2, reason:"Festival",  status:"pending" },
  { emp:emp5,    type:"Annual", start:daysAgo(45), end:daysAgo(42), days:4, reason:"Holiday trip",    status:"rejected" },
];
for (const lr of leaveRequests) {
  if (!lr.emp) continue;
  const existing = await Leave.findOne({ employeeId:lr.emp._id, startDate:lr.start, leaveType:lr.type });
  if (!existing) await Leave.create({ employeeId:lr.emp._id, leaveType:lr.type, startDate:lr.start, endDate:lr.end, totalDays:lr.days, reason:lr.reason, status:lr.status, appliedOn:new Date(lr.start.getTime()-3*24*60*60*1000), reviewedBy:lr.status!=="pending"?hrEmp?._id:undefined, reviewedOn:lr.status!=="pending"?new Date():undefined });
}
console.log("Leaves seeded");

/* ── Payroll ── */
const now = new Date(); const curMonth=now.getMonth()+1; const curYear=now.getFullYear(); const payPeriod=`${curYear}-${String(curMonth).padStart(2,"0")}`; const workingDays=22;
for (const emp of allEmployees) {
  if (!emp) continue;
  const existing = await Payroll.findOne({ employeeId:emp._id, payPeriod });
  if (existing) continue;
  const presentDays = 18+Math.floor(Math.random()*4); const leaveDays=workingDays-presentDays;
  const s=emp.salary; const ratio=presentDays/workingDays;
  const basic=Math.round(s.basic*ratio), hra=Math.round(s.hra*ratio), allow=Math.round(s.allowances*ratio), gross=basic+hra+allow;
  const pf=Math.round(basic*0.12), esi=gross<=21000?Math.round(gross*0.0075):0, tax=gross>50000?Math.round((gross-50000)*0.05):0, totalDed=pf+esi+tax;
  await Payroll.create({ employeeId:emp._id, month:curMonth, year:curYear, payPeriod, earnings:{basic,hra,allowances:allow,overtime:0,bonus:0}, deductions:{pf,esi,tax,advance:0,other:0}, grossPay:gross, totalDeductions:totalDed, netPay:gross-totalDed, workingDays, presentDays, leaveDays, status:"processed", processedBy:adminEmp?._id, processedOn:new Date() });
}
console.log("Payroll seeded");

/* ── Announcements ── */
const announcements = [
  { title:"Q2 Goals & Targets", content:"Team, please review and align with the Q2 goals shared in the company portal. Focus areas: product delivery, customer success, and revenue growth.", priority:"high", targetRoles:["super_admin","hr_admin","manager","employee"] },
  { title:"Office Renovation Notice", content:"The 3rd floor will be under renovation from May 10-20. Engineering and Finance teams please shift to the temporary seating on Floor 2.", priority:"normal", targetRoles:["super_admin","hr_admin","manager","employee"] },
  { title:"New Leave Policy Update", content:"Effective June 1st, 2026: Casual leave quota increases from 7 to 10 days per year. The HR team will update leave balances accordingly.", priority:"high", targetRoles:["super_admin","hr_admin","manager","employee"] },
  { title:"Company Annual Picnic", content:"Mark your calendars! The annual company picnic is scheduled for May 25th at Eco Park. Families welcome. Registration closes May 18th.", priority:"normal", targetRoles:["super_admin","hr_admin","manager","employee"] },
  { title:"Mandatory Security Training", content:"All employees must complete the cybersecurity awareness training module by May 31st. Access via the Learning Portal.", priority:"urgent", targetRoles:["super_admin","hr_admin","manager","employee"] },
];
for (const ann of announcements) {
  const existing = await Announcement.findOne({ title:ann.title });
  if (!existing) await Announcement.create({ ...ann, postedBy:adminEmp?._id, isActive:true, expiresAt:new Date(Date.now()+30*24*60*60*1000) });
}
console.log("Announcements seeded");

/* ── Holidays ── */
const holidays2026 = [
  { name:"New Year's Day",      date:"2026-01-01", type:"national" },
  { name:"Makar Sankranti",     date:"2026-01-14", type:"regional" },
  { name:"Republic Day",        date:"2026-01-26", type:"national" },
  { name:"Holi",                date:"2026-03-05", type:"national" },
  { name:"Good Friday",         date:"2026-04-03", type:"national" },
  { name:"Ram Navami",          date:"2026-04-15", type:"regional" },
  { name:"Eid ul-Fitr",         date:"2026-04-21", type:"national" },
  { name:"Maharashtra Day",     date:"2026-05-01", type:"regional" },
  { name:"Buddha Purnima",      date:"2026-05-22", type:"national" },
  { name:"Company Anniversary", date:"2026-06-15", type:"company",  description:"Gehnax Technologies founded 2018" },
  { name:"Independence Day",    date:"2026-08-15", type:"national" },
  { name:"Ganesh Chaturthi",    date:"2026-08-22", type:"regional" },
  { name:"Dussehra",            date:"2026-10-09", type:"national" },
  { name:"Diwali",              date:"2026-10-28", type:"national" },
  { name:"Diwali (Day 2)",      date:"2026-10-29", type:"national" },
  { name:"Christmas Day",       date:"2026-12-25", type:"national" },
];
for (const h of holidays2026) {
  await Holiday.findOneAndUpdate({ name:h.name, date:new Date(h.date) }, { ...h, date:new Date(h.date), year:2026, isActive:true }, { upsert:true, new:true });
}
console.log("Holidays seeded");

/* ── Department managers & reporting managers ── */
if (mgr1Emp) await Department.findOneAndUpdate({ code:"ENG" }, { managerId:mgr1Emp._id });
if (hrEmp)   await Department.findOneAndUpdate({ code:"HR"  }, { managerId:hrEmp._id });
if (emp7)    await Department.findOneAndUpdate({ code:"FIN" }, { managerId:emp7._id });
if (emp9)    await Department.findOneAndUpdate({ code:"MKT" }, { managerId:emp9._id });
if (emp11)   await Department.findOneAndUpdate({ code:"OPS" }, { managerId:emp11._id });
if (mgr1Emp) {
  if (johnEmp) await Employee.findByIdAndUpdate(johnEmp._id, { reportingManager:mgr1Emp._id });
  if (emp5)    await Employee.findByIdAndUpdate(emp5._id,    { reportingManager:mgr1Emp._id });
  if (emp6)    await Employee.findByIdAndUpdate(emp6._id,    { reportingManager:mgr1Emp._id });
}
if (emp7 && emp8)   await Employee.findByIdAndUpdate(emp8._id,  { reportingManager:emp7._id });
if (emp9 && emp10)  await Employee.findByIdAndUpdate(emp10._id, { reportingManager:emp9._id });
if (emp11 && emp12) await Employee.findByIdAndUpdate(emp12._id, { reportingManager:emp11._id });
console.log("Managers assigned");

await mongoose.disconnect();
console.log("\n✓ Production database seeded successfully!");
console.log("Login credentials:");
console.log("  Super Admin : admin@gehnax.com     / Admin@123");
console.log("  HR Admin    : hr@gehnax.com        / Hr@123456");
console.log("  Employee    : john@gehnax.com      / Emp@123456");
console.log("  Manager     : rohan.verma@gehnax.com / Welcome@123");
console.log("  All others  : Welcome@123");
