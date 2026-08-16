////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////

import { z } from "zod";
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////


export type LoginFormValues = z.infer<typeof loginSchema>;
export const registerCompanySchema = z
  .object({
    company_name: z.string().min(2).max(255),
    company_code: z.string().min(2).max(50),
    email: z.string().email(),
    phone: z.string().max(50).optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    max_users: z.number().int().positive().optional(),  
    admin_full_name: z.string().min(2, "Full name is required"),
    admin_username: z.string().min(3, "Username must be at least 3 characters"),
    admin_password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.admin_password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

////////////////////////////////////////////////////////////
//
///////////////////////////////////////////////////////////


export type RegisterCompanyFormValues = z.infer<typeof registerCompanySchema>;