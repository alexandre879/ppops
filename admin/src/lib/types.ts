export type Module =
  | "dashboard"
  | "services"
  | "projects"
  | "finance"
  | "crm"
  | "quotes"
  | "inventory"
  | "staff"
  | "users"
  | "settings";

export type Me = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: string;
  role_display: string;
  language: string;
  is_superuser: boolean;
  permissions: Record<Module, { read: boolean; write: boolean }>;
};

/** API rows are open-ended JSON objects; pages narrow the fields they use. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any> & { id: number };
