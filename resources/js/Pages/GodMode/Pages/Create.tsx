import PageForm from "./PageForm";
import type { Admin } from "./types";

interface CreatePageProps {
  admin: Admin;
  baseUrl: string;
}

export default function CreatePage({ admin, baseUrl }: CreatePageProps) {
  return <PageForm admin={admin} baseUrl={baseUrl} />;
}
