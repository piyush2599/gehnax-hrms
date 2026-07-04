import { Metadata } from "next";
import CRMClient from "@/components/crm/CRMClient";

export const metadata: Metadata = { title: "CRM" };

export default function CRMPage() {
  return <CRMClient />;
}
