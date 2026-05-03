import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "super_admin" | "hr_admin" | "manager" | "employee";
      employeeId?: string;
      avatar?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "super_admin" | "hr_admin" | "manager" | "employee";
    employeeId?: string;
    avatar?: string;
  }
}
