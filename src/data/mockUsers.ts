import { DemoUser } from "@/types/auth";

export const MOCK_DEMO_USERS: DemoUser[] = [
  {
    id: "usr_org_01",
    username: "organizer",
    password: "password123",
    role: "ORGANIZER",
    displayName: "City Operations Command",
    defaultRoute: "/organizer",
  },
  {
    id: "usr_ptr_01",
    username: "trident",
    password: "password123",
    role: "PARTNER",
    propertyId: "H1",
    displayName: "Trident Nariman Point Front Desk",
    propertyName: "Trident Nariman Point",
    zone: "ZONE A",
    defaultRoute: "/partner",
  },
  {
    id: "usr_ptr_02",
    username: "ramada",
    password: "password123",
    role: "PARTNER",
    propertyId: "H4",
    displayName: "Ramada by Wyndham Dadar Front Desk",
    propertyName: "Ramada by Wyndham Dadar",
    zone: "ZONE C",
    defaultRoute: "/partner",
  },
];

export function findUserByCredentials(username: string, password?: string): DemoUser | undefined {
  const cleanUsername = username.trim().toLowerCase();
  return MOCK_DEMO_USERS.find(u => {
    if (u.username.toLowerCase() !== cleanUsername) return false;
    if (password && u.password !== password) return false;
    return true;
  });
}

export function findUserById(id: string): DemoUser | undefined {
  return MOCK_DEMO_USERS.find(u => u.id === id);
}
