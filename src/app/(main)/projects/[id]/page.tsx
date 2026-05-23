import { Metadata } from "next";
import ProjectDetailClient from "@/components/projects/ProjectDetailClient";

export const metadata: Metadata = { title: "Project | Gehnax HRMS" };

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient projectId={params.id} />;
}
