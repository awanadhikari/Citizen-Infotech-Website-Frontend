import axios, { AxiosRequestConfig } from "axios";

// API service — talks to the FastAPI backend
const getBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (typeof window !== "undefined") {
    if (
      configuredUrl &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(configuredUrl)
    ) {
      return configuredUrl.replace(/\/$/, "");
    }
    return "/api";
  }
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  return "http://127.0.0.1:8000";
};

const BASE_URL = getBaseUrl();

export const mediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

// ---- Auth token storage (access + refresh) ----
const ACCESS_KEY = "auth_token";
const REFRESH_KEY = "refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh?: string | null) => {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Try refresh flow on first 401
    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refresh = tokenStore.getRefresh?.();
      if (refresh) {
        try {
          const resp = await axios.post(
            `${BASE_URL}/auth/refresh`,
            { refresh_token: refresh },
            { headers: { "Content-Type": "application/json" } }
          );

          const newAccess = resp.data?.access_token;
          const newRefresh = resp.data?.refresh_token;
          if (newAccess) {
            tokenStore.setTokens(newAccess, newRefresh);
            // set Authorization for the original request and retry
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return apiClient.request(originalRequest);
          }
        } catch (refreshErr) {
          tokenStore.clear();
          return Promise.reject(new Error("Unauthorized"));
        }
      }
      tokenStore.clear();
      return Promise.reject(new Error("Unauthorized"));
    }

    let msg = error.message;
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data.detail === "string") {
        msg = data.detail;
      } else if (Array.isArray(data.detail)) {
        msg = data.detail
          .map((e: unknown) =>
            typeof e === "object" && e !== null && "msg" in e
              ? String((e as { msg: unknown }).msg)
              : JSON.stringify(e)
          )
          .join(", ");
      } else if (typeof data === "string") {
        msg = data;
      } else {
        msg = JSON.stringify(data);
      }
    }
    return Promise.reject(new Error(msg));
  }
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const isFormData = config.data instanceof FormData;

  const res = await apiClient.request<T>({
    ...config,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...config.headers,
    },
  });

  if (res.status === 204) return undefined as T;
  return res.data;
}


// ---- Types ----
export interface User {
  id: number;
  email: string;
  role: string;
  is_admin: boolean;
}

export interface UserCreate {
  email: string;
  password: string;
  role?: string;
  is_admin?: boolean;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  image_url?: string;
  bio?: string;
  order_index: number;
  img?: string;
  department_id?: number | null;
  department?: Department;
}

export interface Project {
  id: number;
  slug?: string | null;
  title: string;
  category: string;
  year: string;
  description: string;
  image_url?: string;
  order_index?: number;
  visible_on_home?: boolean;
  detail_content?: string;
  detail_design?: "modern" | "brutalist" | "pastel" | "terminal";
  detail_palette?: "ocean" | "sunset" | "forest" | "midnight";
  client?: string | null;
  status?: string | null;
  tech_stack?: string | null;
  impact_summary?: string | null;
  external_url?: string | null;
}

export interface Service {
  id: number;
  title: string;
  description: string;
  icon?: string;
  order_index?: number;
  show_on_home?: boolean;
}

export interface Department {
  id: number;
  name: string;
  order_index: number;
}

export interface SiteSettings {
  palette?: string;
  mode?: string;
  design?: string;
  logo_variant?: string;
  logo_style?: string;
  hero_eyebrow?: string;
  hero_title_line1?: string;
  hero_title_line2?: string;
  hero_title_line3?: string;
  hero_description?: string;
  hero_cta_primary?: string;
  hero_cta_secondary?: string;
  services_eyebrow?: string;
  services_title?: string;
  services_description?: string;
  work_eyebrow?: string;
  work_title?: string;
  cta_title?: string;
  cta_description?: string;
  testimonials?: { name: string; role: string; text: string }[];
  trusted_companies?: { name: string; logo_url?: string | null }[];
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  location: string;
  status: string;
}

export interface Application {
  id: number;
  job_id: number;
  job_title?: string;
  name: string;
  email: string;
  resume_url?: string;
  cover_letter?: string;
  applied_at?: string;
  status: "pending" | "reviewed" | "shortlisted" | "rejected";
}

export interface PageContent {
  id: number;
  slug: string;
  content: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at?: string;
  read?: boolean;
}

export interface InsideMedia {
  id: number;
  title?: string | null;
  media_type: "image" | "video";
  media_url: string;
  order_index: number;
}

// ---- Auth ----
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await request<{ access_token?: string; refresh_token?: string; error?: string }>({
      url: "/auth/login",
      method: "POST",
      data: { email, password },
    });
    const access = res?.access_token;
    const refresh = res?.refresh_token;
    if (access) tokenStore.setTokens(access, refresh);
    return res;
  },
  logout: () => {
    tokenStore.clear();
  },
};

// ---- Users ----
// Requires admin token
export const usersApi = {
  create: (data: UserCreate) =>
    request<User>({
      url: "/users/",
      method: "POST",
      data,
    }),
};

// ---- Team ----
export const teamApi = {
  getAll: () => request<TeamMember[]>({ url: "/team/" }),
  uploadImage: (data: FormData) =>
    request<{ url: string }>({
      url: "/team/upload-image",
      method: "POST",
      data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  create: (data: Omit<TeamMember, "id">) =>
    request<TeamMember>({
      url: "/team/",
      method: "POST",
      data,
    }),
  update: (id: number, data: Partial<TeamMember>) =>
    request<TeamMember>({
      url: `/team/${id}`,
      method: "PUT",
      data,
    }),
  delete: (id: number) => request<void>({ url: `/team/${id}`, method: "DELETE" }),
  reorder: (items: { id: number; order_index: number }[]) =>
    request<{ message: string }>({
      url: "/team/reorder",
      method: "PUT",
      data: items,
    }),
};

// ---- Jobs ----
export const jobsApi = {
  getAll: () => request<Job[]>({ url: "/jobs/" }),
  getById: (id: number) => request<Job>({ url: `/jobs/${id}` }),
  create: (data: Omit<Job, "id">) =>
    request<Job>({
      url: "/jobs/",
      method: "POST",
      data,
    }),
  update: (id: number, data: Partial<Job>) =>
    request<Job>({
      url: `/jobs/${id}`,
      method: "PUT",
      data,
    }),
  delete: (id: number) => request<void>({ url: `/jobs/${id}`, method: "DELETE" }),
};

// ---- Applications ----
export const applicationsApi = {
  getAll: () => request<Application[]>({ url: "/applications/" }),
  submit: (data: FormData) =>
    request<Application>({
      url: "/applications/",
      method: "POST",
      data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  updateStatus: (id: number, status: Application["status"]) =>
    request<void>({
      url: `/applications/${id}/status`,
      method: "PUT",
      data: { status },
    }),
};

// ---- Pages ----
export const pagesApi = {
  get: (slug: string) => request<PageContent>({ url: `/pages/${slug}` }),
  update: (slug: string, data: Partial<PageContent>) =>
    request<PageContent>({
      url: `/pages/${slug}`,
      method: "PUT",
      data,
    }),
};

// ---- Projects ----
type ProjectPayload = Omit<Project, "id"> | FormData;

export const projectsApi = {
  getAll: () => request<Project[]>({ url: "/projects/" }),
  getBySlug: (slugOrId: string | number) =>
    request<Project>({ url: `/projects/${slugOrId}` }),
  create: (data: ProjectPayload) =>
    request<Project>({
      url: "/projects/",
      method: "POST",
      data,
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    }),
  update: (id: number, data: Partial<Project> | FormData) =>
    request<Project>({
      url: `/projects/${id}`,
      method: "PUT",
      data,
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    }),
  uploadImage: (data: FormData) =>
    request<{ url: string }>({
      url: "/projects/upload-image",
      method: "POST",
      data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  reorder: (items: { id: number; order_index: number }[]) =>
    request<{ message: string }>({
      url: "/projects/reorder",
      method: "PUT",
      data: items,
    }),
  delete: (id: number) => request<void>({ url: `/projects/${id}`, method: "DELETE" }),
};

// ---- Services ----
export const servicesApi = {
  getAll: () => request<Service[]>({ url: "/services/" }),
  create: (data: Omit<Service, "id">) =>
    request<Service>({
      url: "/services/",
      method: "POST",
      data,
    }),
  update: (id: number, data: Partial<Service>) =>
    request<Service>({
      url: `/services/${id}`,
      method: "PUT",
      data,
    }),
  reorder: (items: { id: number; order_index: number }[]) =>
    request<{ message: string }>({
      url: "/services/reorder",
      method: "PUT",
      data: items,
    }),
  delete: (id: number) => request<void>({ url: `/services/${id}`, method: "DELETE" }),
};

// ---- Site Settings ----
export const settingsApi = {
  get: () => request<SiteSettings>({ url: "/settings/" }),
  update: (data: Partial<SiteSettings>) =>
    request<SiteSettings>({
      url: "/settings/",
      method: "PUT",
      data,
    }),
  uploadLogo: (data: FormData) =>
    request<{ url: string }>({
      url: "/settings/upload-logo",
      method: "POST",
      data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
};

// ---- Contact Messages ----
export const messagesApi = {
  getAll: () => request<ContactMessage[]>({ url: "/messages/" }),
  submit: (data: {
    name: string;
    email: string;
    message: string;
    recaptcha_token: string;
  }) =>
    request<ContactMessage>({
      url: "/messages/",
      method: "POST",
      data,
    }),
  markRead: (id: number) =>
    request<ContactMessage>({
      url: `/messages/${id}/read`,
      method: "PUT",
    }),
  delete: (id: number) => request<void>({ url: `/messages/${id}`, method: "DELETE" }),
};

// ---- Inside Citizen Infotech ----
export const insideApi = {
  getAll: () => request<InsideMedia[]>({ url: "/inside/" }),
  upload: (data: FormData) =>
    request<InsideMedia>({
      url: "/inside/",
      method: "POST",
      data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  update: (id: number, data: Partial<Pick<InsideMedia, "title" | "order_index">>) =>
    request<InsideMedia>({
      url: `/inside/${id}`,
      method: "PUT",
      data,
    }),
  reorder: (items: { id: number; order_index: number }[]) =>
    request<{ message: string }>({
      url: "/inside/reorder",
      method: "PUT",
      data: items,
    }),
  delete: (id: number) => request<void>({ url: `/inside/${id}`, method: "DELETE" }),
};

// ---- Admin Seed ----
export interface SeedResult {
  mode: string;
  settings: { updated: number };
  services: { created: number; updated: number };
  projects: { created: number; updated: number };
  team: { created: number; updated: number };
}

export const seedApi = {
  run: (mode: "upsert" | "replace" = "upsert") =>
    request<SeedResult>({
      url: "/admin/seed-content",
      method: "POST",
      data: { mode },
    }),
};

//--- Department=---
// ---- Departments ----
export const departmentsApi = {
  getAll: () =>
    request<Department[]>({
      url: "/departments/",
    }),

  create: (data: Omit<Department, "id">) =>
    request<Department>({
      url: "/departments/",
      method: "POST",
      data,
    }),

  update: (id: number, data: Partial<Department>) =>
    request<Department>({
      url: `/departments/${id}`,
      method: "PUT",
      data,
    }),

  delete: (id: number) =>
    request<void>({
      url: `/departments/${id}`,
      method: "DELETE",
    }),

  reorder: (items: { id: number; order_index: number }[]) =>
    request<{ message: string }>({
      url: "/departments/reorder",
      method: "PUT",
      data: items,
    }),
};
