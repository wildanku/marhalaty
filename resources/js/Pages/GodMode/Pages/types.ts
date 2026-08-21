export interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

export type PageMode = "basic" | "full_html";

export interface ManagedPage {
  id: number;
  title: string;
  slug: string;
  mode: PageMode;
  content: string;
  is_published: boolean;
  public_url: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PageSummary {
  id: number;
  title: string;
  slug: string;
  mode: PageMode;
  is_published: boolean;
  public_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface PaginatedPages {
  data: PageSummary[];
  links: PaginationLink[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}
