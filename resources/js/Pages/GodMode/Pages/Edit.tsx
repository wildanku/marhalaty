import PageForm from "./PageForm";
import type { Admin, ManagedPage } from "./types";

interface EditPageProps {
  admin: Admin;
  baseUrl: string;
  page: ManagedPage;
}

export default function EditPage({ admin, baseUrl, page }: EditPageProps) {
  return <PageForm admin={admin} baseUrl={baseUrl} page={page} />;
}
