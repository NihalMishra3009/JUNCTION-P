export type UserRole = "ORGANIZER" | "PARTNER";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  propertyId?: string; // Only for PARTNER (e.g. "H1", "H4")
  defaultRoute: string; // e.g. "/organizer" or "/partner"
}

export interface DemoUser extends AuthUser {
  password: string;
  propertyName?: string;
  zone?: string;
}

export interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}
