import { Metadata } from "next";
import PurchaseOrdersClient from "@/components/purchase-orders/PurchaseOrdersClient";

export const metadata: Metadata = { title: "Purchase Orders | Gehnax HRMS" };

export default function PurchaseOrdersPage() {
  return <PurchaseOrdersClient />;
}
