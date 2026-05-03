export interface ParsedResume {
  firstName:          string;
  lastName:           string;
  email:              string;
  phone:              string;
  currentCompany:     string;
  currentDesignation: string;
  totalExperience:    string;
  skills:             string;
}

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf" || mimeType === "application/x-pdf") {
    // Use internal lib directly — the main entry point runs a self-test that
    // requires a local sample file which doesn't exist in this project.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text
  return buffer.toString("utf-8");
}

export function parseResumeText(text: string): ParsedResume {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // ── Email ────────────────────────────────────────────────
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  // ── Phone (India: 10-digit starting 6-9, optional +91) ───
  const phoneMatch = text.match(/(?:\+91[\s\-]?|0)?[6-9]\d{9}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s/g, "") : "";

  // ── Name ─────────────────────────────────────────────────
  // Look for explicit "Name:" label first, else take first clean line
  let fullName = "";
  const nameLabelMatch = text.match(/(?:^|\n)\s*(?:name|full\s*name)\s*[:\-]\s*([A-Za-z\s]{3,40})/im);
  if (nameLabelMatch) {
    fullName = nameLabelMatch[1].trim();
  } else {
    // First line that looks like a name (only letters + spaces, 2-5 words, no @)
    for (const line of lines.slice(0, 8)) {
      if (/^[A-Za-z][A-Za-z\s]{3,40}$/.test(line) && !line.includes("@") && line.split(" ").length <= 5) {
        fullName = line;
        break;
      }
    }
  }

  const nameParts  = fullName.trim().split(/\s+/);
  const firstName  = nameParts[0] ?? "";
  const lastName   = nameParts.slice(1).join(" ") ?? "";

  // ── Total Experience ─────────────────────────────────────
  const expMatch = text.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp(?:erience)?)?/i);
  const totalExperience = expMatch ? expMatch[1] : "";

  // ── Current Company ──────────────────────────────────────
  let currentCompany = "";
  const companyPatterns = [
    /(?:current(?:ly)?\s+(?:working\s+at|employed\s+at|with)|employer|organization|company)\s*[:\-]\s*([A-Za-z0-9\s&.,]{2,50})/im,
    /([A-Za-z0-9\s&.,]{2,50})\s*\(present\)/im,
    /([A-Za-z0-9\s&.,]{2,50})\s*[-–]\s*present/im,
  ];
  for (const p of companyPatterns) {
    const m = text.match(p);
    if (m) { currentCompany = m[1].trim(); break; }
  }

  // ── Current Designation ──────────────────────────────────
  let currentDesignation = "";
  const designationPatterns = [
    /(?:current\s+(?:role|designation|position|title)|designation|role|position)\s*[:\-]\s*([A-Za-z\s]{3,60})/im,
    /(?:senior|junior|lead|principal|staff|associate)?\s*(?:software|frontend|backend|full[\s\-]?stack|data|devops|qa|mobile|android|ios|cloud|machine learning|ml|ai)\s+(?:engineer|developer|architect|analyst|scientist)/im,
    /(?:manager|director|head|vp|cto|ceo|coo|president|consultant|specialist|executive|officer)\b/im,
  ];
  for (const p of designationPatterns) {
    const m = text.match(p);
    if (m) { currentDesignation = (m[1] ?? m[0]).trim(); break; }
  }

  // ── Skills ───────────────────────────────────────────────
  let skills = "";
  // Try to find a Skills section first
  const skillsSectionMatch = text.match(
    /(?:technical\s+)?skills?\s*[:\-\n]([\s\S]{10,400})(?:\n{2,}|\Z|(?:experience|education|projects|work|employment|objective|summary|certif))/im
  );
  if (skillsSectionMatch) {
    skills = skillsSectionMatch[1]
      .replace(/[\n\r]/g, ", ")
      .replace(/[•\-*|]/g, ",")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .slice(0, 20)
      .join(", ");
  }
  // Fallback: match known tech keywords from full text
  if (!skills) {
    const TECH_KEYWORDS = [
      "JavaScript","TypeScript","Python","Java","C#","C\\+\\+","Go","Rust","PHP","Ruby","Swift","Kotlin",
      "React","Angular","Vue","Next\\.js","Node\\.js","Express","Django","Spring","Laravel","FastAPI","Flask",
      "MongoDB","PostgreSQL","MySQL","Redis","SQL","GraphQL","REST","AWS","Azure","GCP","Docker","Kubernetes",
      "Git","Linux","HTML","CSS","Tailwind","Bootstrap","React Native","Flutter","Android","iOS",
      "Machine Learning","Deep Learning","TensorFlow","PyTorch","Data Science","AI","NLP",
      "Figma","Jira","Agile","Scrum","DevOps","CI/CD","Microservices","Blockchain","Solidity",
    ];
    const found = TECH_KEYWORDS.filter((kw) => new RegExp(`\\b${kw}\\b`, "i").test(text));
    skills = found.slice(0, 15).join(", ");
  }

  return { firstName, lastName, email, phone, currentCompany, currentDesignation, totalExperience, skills };
}
