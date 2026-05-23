import { Metadata } from "next";
import ProjectsClient from "@/components/projects/ProjectsClient";

export const metadata: Metadata = { title: "Projects | Gehnax HRMS" };

export default function ProjectsPage() {
  return <ProjectsClient />;
}
