export type Site = {
  company_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string | null;
  about_text: string;
  mission: string;
  promise: string;
  phones: string[];
  email: string;
  address: string;
  working_hours: string;
  facebook_url: string;
  instagram_url: string;
  map_embed_url: string;
  years_experience: number;
  projects_completed: number;
  specialists: number;
};

export type CategoryIcon = "building" | "layers" | "brush" | "hammer" | "sofa" | "factory" | "shield";

export type ServiceRef = { title: string; slug: string; summary: string; image: string | null };

export type Category = {
  name: string;
  slug: string;
  description: string;
  icon: CategoryIcon;
  image: string | null;
  services: ServiceRef[];
};

export type Solution = {
  name: string;
  slug: string;
  kind: string;
  kind_display: string;
  description: string;
  image: string | null;
};

export type ServiceSummary = {
  title: string;
  slug: string;
  summary: string;
  image: string | null;
  price_from: number | null;
  unit: string;
  unit_display: string;
  is_featured: boolean;
  category: { name: string; slug: string; icon: CategoryIcon };
};

export type ProjectSummary = {
  title: string;
  slug: string;
  public_summary: string;
  city: string;
  building_type: string;
  building_type_display: string;
  floors: number | null;
  area_m2: number | null;
  status: string;
  status_display: string;
  year: number | null;
  cover: string | null;
  services: { title: string; slug: string }[];
  is_featured: boolean;
};

export type ProjectDetail = ProjectSummary & {
  photos: { image: string; caption: string; stage: string; stage_display: string }[];
};

export type ServiceDetail = ServiceSummary & {
  description: string;
  features: string[];
  images: { image: string; caption: string }[];
  solutions: Solution[];
  projects: ProjectSummary[];
};

export type Product = {
  name: string;
  slug: string;
  category: string;
  category_display: string;
  description: string;
  standard: string;
  image: string | null;
  unit_display: string;
};
