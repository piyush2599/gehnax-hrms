import { Metadata } from "next";
import CRMClient from "@/components/crm/CRMClient";

export const metadata: Metadata = { title: "CRM | Gehnax HRMS" };

export default function CRMPage() {
  return <CRMClient />;
}
