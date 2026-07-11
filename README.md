# 🏥 ClinicHub System

---

## 📌 About the System

Patients often do not know which clinic or hospital near them can treat their condition, has the medicine they need, or has available appointments. They waste time visiting multiple places with no central source of information.

**ClinicHub System** solves this. It is a full-stack healthcare web platform that connects patients directly with clinics and hospitals. Patients can search for nearby clinics, check real-time medicine availability, book appointments, place medicine orders, and communicate with medical staff — all from one place. Staff get a complete dashboard to manage inventory, handle bookings and orders, and communicate with patients. Admins oversee the entire platform from a central control panel.

---

## 🛠 Tech Stack

| Layer        | Technologies                                                    |
| ------------ | --------------------------------------------------------------- |
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS                        |
| **Backend**  | Node.js, Express.js, TypeScript                                 |
| **Database** | MongoDB                                                         |
| **Hosting**  | Vercel (frontend) · Render (backend) · MongoDB Atlas (database) |

---

## 👥 Actors & What They Can Do

### 👤 Patient

- Search for clinics and hospitals by name or location
- Check real-time medicine availability and stock
- Book appointments at clinics and hospitals
- Place and track medicine orders online
- Chat and call medical staff directly
- Save favourite clinics and hospitals
- View digital receipts for treatments and orders
- Submit complaints about services received
- Manage account, preferences, and notifications

### 🏥 Clinic / Hospital Staff

- Manage medicine inventory — add, update, and remove stock
- Receive, confirm, and process patient bookings and orders
- Chat with patients in real time
- Issue digital receipts for treatments and fulfilled orders
- View staff notifications and activity dashboard

### 🛡️ Admin

- Approve, suspend, and manage all clinics and hospitals
- Manage all registered users
- Maintain the global medicine catalogue
- Pin announcements to clinic profiles
- Review and resolve patient complaints
- Monitor platform-wide activity

---

## 📁 Project Structure

```
ClinicHub-System/
│
├── backend/
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       │   ├── env.ts
│       │   ├── logger.ts
│       │   ├── mongo.ts
│       │   ├── sentry.ts
│       │   └── swagger.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   ├── errorHandler.ts
│       │   ├── rateLimiter.ts
│       │   ├── requestId.ts
│       │   ├── roleGuard.ts
│       │   ├── upload.ts
│       │   └── validate.ts
│       ├── models/
│       │   ├── Call.ts
│       │   ├── Complaint.ts
│       │   ├── Inventory.ts
│       │   ├── Medicine.ts
│       │   ├── Message.ts
│       │   ├── Notification.ts
│       │   ├── Order.ts
│       │   ├── Pharmacy.ts
│       │   ├── Receipt.ts
│       │   ├── User.ts
│       │   └── Watchlist.ts
│       ├── modules/
│       │   ├── admin/
│       │   ├── auth/
│       │   ├── calls/
│       │   ├── chats/
│       │   ├── complaints/
│       │   ├── inventory/
│       │   ├── medicines/
│       │   ├── notifications/
│       │   ├── orders/
│       │   ├── pharmacies/
│       │   ├── receipts/
│       │   └── users/
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           ├── jwt.ts
│           ├── pagination.ts
│           ├── password.ts
│           └── response.ts
│
└── frontend-web/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── account/
    │   ├── admin/
    │   ├── auth/
    │   ├── callback/
    │   ├── compliant_user/
    │   ├── contact-us/
    │   ├── favorites/
    │   ├── help-center/
    │   ├── login/
    │   ├── medicines/
    │   ├── notifications/
    │   ├── patient-rights/
    │   ├── pharmacies/
    │   ├── pharmacy-partner/
    │   ├── registration/
    │   ├── reset-password/
    │   ├── search/
    │   ├── signup/
    │   └── staff/
    ├── components/
    │   ├── AuthGuard.tsx
    │   ├── AuthPrompt.tsx
    │   ├── CallOverlay.tsx
    │   ├── CTA.tsx
    │   ├── Footer.tsx
    │   ├── Hero.tsx
    │   ├── LayoutWrapper.tsx
    │   ├── MedicineCard.tsx
    │   ├── MedicineDiscovery.tsx
    │   ├── Navbar.tsx
    │   ├── NearbyPharmacies.tsx
    │   ├── PharmacyCard.tsx
    │   ├── PharmacyDiscovery.tsx
    │   ├── StarRating.tsx
    │   ├── TrustFeatures.tsx
    │   └── providers.tsx
    ├── context/
    │   └── UserContext.tsx
    └── lib/
        ├── api.ts
        ├── auth.ts
        └── auth-storage.ts
```

---

## 🔗 API Endpoints

| Method | Route                              | Access        |
| ------ | ---------------------------------- | ------------- |
| POST   | `/api/v1/auth/register`            | 🌐 Everyone   |
| POST   | `/api/v1/auth/login`               | 🌐 Everyone   |
| POST   | `/api/v1/auth/forgot-password`     | 🌐 Everyone   |
| GET    | `/api/v1/pharmacies`               | 🌐 Everyone   |
| GET    | `/api/v1/pharmacies/:id`           | 🌐 Everyone   |
| GET    | `/api/v1/medicines`                | 🌐 Everyone   |
| GET    | `/api/v1/pharmacies/:id/inventory` | 🌐 Everyone   |
| GET    | `/api/v1/users/me`                 | 🔒 Logged in  |
| PUT    | `/api/v1/users/me`                 | 🔒 Logged in  |
| POST   | `/api/v1/orders`                   | 🔒 Logged in  |
| GET    | `/api/v1/orders`                   | 🔒 Logged in  |
| GET    | `/api/v1/notifications`            | 🔒 Logged in  |
| POST   | `/api/v1/chats`                    | 🔒 Logged in  |
| GET    | `/api/v1/receipts`                 | 🔒 Logged in  |
| POST   | `/api/v1/complaints`               | 🔒 Logged in  |
| GET    | `/api/v1/admin/*`                  | 👑 Admin only |

---

<div align="center">

🌐 Live : [Demo](https://clinic-hub-system-9jzx-psi.vercel.app)

Built with ❤️ by the ClinicHub Team

</div>
