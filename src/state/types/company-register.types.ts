export interface CompanyRegisterRequest {
  company_name: string;
  company_email: string;
  owner_username: string;
  owner_email: string;
  owner_password: string;
  owner_full_name?: string;
}

export interface CompanyRegisterResponse {
  company: {
    id: number;
    name: string;
    email: string;
    plan: string;
    status: string;
    created_at: string;
  };
  owner: {
    id: number;
    username: string;
    email: string;
    role: string;
    company_id: number;
  };
}