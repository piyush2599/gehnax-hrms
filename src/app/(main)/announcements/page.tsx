import type { Metadata } from "next";
import AnnouncementsClient from "@/components/AnnouncementsClient";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return <AnnouncementsClient />;
}
