# JUNCTION — Clerk Partner Setup & Metadata Configuration Guide

This document explains how Clerk authentication and partner metadata are configured for the JUNCTION Partner Portal.

---

## 1. Authentication Architecture

JUNCTION uses **Clerk** as its sole identity store. 
- **NO PostgreSQL sync** or Clerk webhooks are required to maintain user accounts.
- Partner role and property assignments are stored directly in **Clerk User `publicMetadata`**.
- The server reads `publicMetadata` via Clerk's server-side SDK (`currentUser()`) to establish identity, authorize access, and determine which hotel or restaurant establishment the logged-in partner manages.

---

## 2. Setting Partner Metadata in Clerk Dashboard

To configure a Clerk user as a JUNCTION Partner:

1. Open the [Clerk Dashboard](https://dashboard.clerk.com/).
2. Navigate to **Users** and select the user account.
3. Scroll to the **`publicMetadata`** section and click **Edit**.
4. Set the JSON metadata according to the partner type:

### Hotel Partner Example
```json
{
  "junctionRole": "RESTAURANT_PARTNER",
  "propertyId": "H4",
  "propertyType": "HOTEL"
}
```

### Restaurant Partner Example
```json
{
  "junctionRole": "RESTAURANT_PARTNER",
  "propertyId": "R1",
  "propertyType": "RESTAURANT"
}
```

> **Note on Role Name:** `RESTAURANT_PARTNER` is the canonical Clerk role name used in JUNCTION for all venue/establishment partners (both hotels and restaurants).

---

## 3. Supported Establishment IDs

JUNCTION uses canonical establishment IDs. Do not invent new IDs.

### Canonical Hotels (H1 – H5)
| Property ID | Hotel Name | Zone | Total Rooms |
|---|---|---|---|
| **H1** | Trident Nariman Point | ZONE_A | 540 |
| **H2** | Intercontinental Marine Drive | ZONE_A | 410 |
| **H3** | Hotel Marine Plaza | ZONE_B | 68 |
| **H4** | Ramada by Wyndham Dadar | ZONE_C | 250 |
| **H5** | Hotel Kohinoor Dadar | ZONE_C | 180 |

### Canonical Restaurants (R1 – R5)
| Property ID | Restaurant Name | Zone | Capacity (covers) |
|---|---|---|---|
| **R1** | Trishna | ZONE_A | 80 |
| **R2** | Bade Miya | ZONE_A | 60 |
| **R3** | Britannia & Co. | ZONE_B | 120 |
| **R4** | Café Madras | ZONE_C | 90 |
| **R5** | Shalimar Restaurant | ZONE_C | 150 |

---

## 4. Automatic Inferences & Error Handling

- **Property Type Inference:** If `propertyType` is omitted from `publicMetadata`, JUNCTION automatically infers `HOTEL` for IDs starting with `H` and `RESTAURANT` for IDs starting with `R`.
- **Unassigned User (`404`):** If a user with role `RESTAURANT_PARTNER` logs in but has no `propertyId` in `publicMetadata`, the Partner Portal displays an explicit **"No Establishment Assigned"** warning screen. It does *not* fall back to a hardcoded property.
- **Unauthorized User (`403`):** If a user logs in with an administrative or non-partner role (e.g. `ORGANIZER_ADMIN`), access is denied and an guidance box is displayed.

---

## 5. Server-Side APIs

- **`/api/partner/identity` (`GET`)**: Reads `publicMetadata` from Clerk server-side via `currentUser()`, resolves establishment details from `MOCK_HOTELS_BASE` or `MOCK_RESTAURANTS_BASE`, and returns the verified profile.
- **`/api/partner/update` (`POST`)**: Accepts room/table inventory updates. Server validates that `propertyId` comes from Clerk metadata (ignoring any client-sent property IDs to prevent spoofing) and validates inventory ranges.

---

## 6. Testing Instructions

1. Log into `/login/restaurant` using a Clerk user account.
2. If `publicMetadata` has `{ "junctionRole": "RESTAURANT_PARTNER", "propertyId": "H4" }`, you will see **Ramada by Wyndham Dadar**.
3. If `publicMetadata` has `{ "junctionRole": "RESTAURANT_PARTNER", "propertyId": "H1" }`, you will see **Trident Nariman Point**.
4. Updating available rooms updates JUNCTION live state and recalculates usable capacity immediately.
