# LostLink Backend

> **Secure, intelligent digital lost-and-found platform — Node.js/Express/MongoDB backend**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (access + refresh tokens, HTTP-only cookies) |
| Real-time | Socket.IO |
| File Storage | Cloudinary |
| Email | Nodemailer (SMTP/Gmail) |
| AI Matching | TF-IDF cosine similarity + Haversine geo-scoring |
| Background Jobs | node-cron |
| Security | Helmet, CORS, express-rate-limit, bcryptjs |

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # DB, Cloudinary, env validation
│   ├── models/          # 12 Mongoose models
│   │   ├── User.js
│   │   ├── ItemPost.js
│   │   ├── Match.js
│   │   ├── Claim.js
│   │   ├── VerificationQuestion.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── Report.js
│   │   ├── SuspiciousActivity.js
│   │   ├── AuditLog.js
│   │   └── Category.js
│   ├── controllers/     # 12 thin controllers
│   ├── routes/          # 13 route files
│   ├── services/        # 7 business logic services
│   │   ├── matchingService.js      # Smart Match (TF-IDF)
│   │   ├── verificationService.js  # Answer hashing/checking
│   │   ├── notificationService.js  # DB + Socket.IO push
│   │   ├── trustScoreService.js    # Score adjustments
│   │   ├── suspiciousActivityService.js
│   │   ├── expiryService.js
│   │   └── cloudinaryService.js
│   ├── middleware/      # auth, role, upload, validate, rateLimit, error
│   ├── utils/           # jwt, password, scoreCalculator, geoUtils, auditLogger
│   ├── sockets/         # Socket.IO server
│   ├── jobs/            # 3 node-cron background jobs
│   ├── seeds/           # Demo data seeder
│   ├── app.js           # Express app setup
│   └── server.js        # Entry point
├── .env.example
├── package.json
└── README.md
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` — Min 32 chars
- `JWT_REFRESH_SECRET` — Min 32 chars
- `JWT_RESET_SECRET` — Min 32 chars

Optional (features disabled if not set):
- `CLOUDINARY_*` — Image uploads
- `EMAIL_*` — Password reset emails

### 3. Seed Demo Data

```bash
npm run seed
```

This creates:
- **Admin**: `admin@lostlink.app` / `Admin@LostLink2024!`
- **Moderator**: `moderator@lostlink.app` / `Moderator@LostLink2024!`
- **Alex (USER)**: `alex@example.com` / `Alex@LostLink2024!`
- **Priya (USER)**: `priya@example.com` / `Priya@LostLink2024!`
- Alex's lost black wallet post
- Priya's found black wallet post
- 3 verification questions on Alex's post
- Pre-computed **91% HIGH confidence** Smart Match between the two posts
- Match notifications for both users

Clear and reseed:
```bash
npm run seed:clear
```

### 4. Start Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:5000`
Health check: `http://localhost:5000/health`

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

### Response Format
All responses follow this format:
```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... },
  "errors": [ { "field": "...", "message": "..." } ]
}
```

### Authentication
Tokens are set as HTTP-only cookies on login. For API clients, include:
```
Authorization: Bearer <accessToken>
```

### Auth Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login |
| POST | `/auth/logout` | ✅ | Logout |
| GET | `/auth/me` | ✅ | Get current user |
| POST | `/auth/forgot-password` | — | Request password reset |
| POST | `/auth/reset-password/:token` | — | Reset password |
| POST | `/auth/refresh-token` | — | Refresh access token |
| PATCH | `/auth/change-password` | ✅ | Change password |

### User Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | ✅ | My profile |
| PATCH | `/users/me` | ✅ | Update profile |
| PATCH | `/users/me/avatar` | ✅ | Update avatar |
| GET | `/users/me/dashboard` | ✅ | Dashboard data |
| GET | `/users/me/posts` | ✅ | My posts |
| GET | `/users/me/claims` | ✅ | My claims |
| GET | `/users/me/matches` | ✅ | My matches |
| GET | `/users/me/notifications` | ✅ | My notifications |
| PATCH | `/users/me/notification-preferences` | ✅ | Update preferences |
| GET | `/users/:id/public-profile` | — | Public profile |
| GET | `/users/:id/trust-score` | — | Trust score |

### Post Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/posts` | ✅ | Create post (triggers Smart Match) |
| GET | `/posts` | — | List public posts |
| GET | `/posts/:id` | — | Get post |
| PATCH | `/posts/:id` | ✅ | Update post |
| DELETE | `/posts/:id` | ✅ | Delete post |
| POST | `/posts/:id/images` | ✅ | Upload images |
| DELETE | `/posts/:id/images/:imageId` | ✅ | Delete image |
| POST | `/posts/:id/renew` | ✅ | Renew expired post |
| POST | `/posts/:id/cancel` | ✅ | Cancel post |
| POST | `/posts/:id/mark-returned` | ✅ | Mark as returned |
| GET | `/posts/:id/matches` | ✅ | Get post matches |
| GET | `/posts/:id/claims` | ✅ | Get post claims |
| POST | `/posts/:id/smart-matches` | ✅ | Run Smart Match |
| POST | `/posts/:id/verification-questions` | ✅ | Add verification question |
| GET | `/posts/:id/verification-questions` | ✅ | Get questions |
| PATCH | `/posts/:id/verification-questions/:qId` | ✅ | Update question |
| DELETE | `/posts/:id/verification-questions/:qId` | ✅ | Delete question |

### Search Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/posts?q=&type=&category=&city=&dateFrom=&dateTo=&color=&brand=&sort=&page=&limit=` | — | Full-text search |
| GET | `/search/nearby?lat=&lng=&radius=&type=&category=` | — | Geospatial search |
| GET | `/search/suggestions?q=` | — | Auto-complete |

### Match Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/matches` | ✅ | My matches |
| GET | `/matches/:id` | ✅ | Match detail |
| POST | `/matches/:id/viewed` | ✅ | Mark viewed |
| POST | `/matches/:id/dismiss` | ✅ | Dismiss match |
| POST | `/matches/:id/refresh` | ✅ | Refresh match |

### Claim Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/claims` | ✅ | Create claim |
| GET | `/claims` | ✅ | My claims |
| GET | `/claims/:id` | ✅ | Claim detail |
| POST | `/claims/:id/verify` | ✅ | Submit verification answers |
| POST | `/claims/:id/cancel` | ✅ | Cancel claim |
| POST | `/claims/:id/approve` | ✅ | Approve claim (finder) |
| POST | `/claims/:id/reject` | ✅ | Reject claim (finder) |
| POST | `/claims/:id/request-more-info` | ✅ | Request more info |
| POST | `/claims/:id/complete-handover` | ✅ | Mark handover complete |
| PATCH | `/claims/:id/handover-details` | ✅ | Update handover details |

### Message Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/conversations/claim/:claimId` | ✅ | Create conversation (approved claims only) |
| GET | `/conversations` | ✅ | My conversations |
| GET | `/conversations/:id` | ✅ | Conversation detail |
| GET | `/conversations/:id/messages` | ✅ | Get messages |
| POST | `/conversations/:id/messages` | ✅ | Send message |
| PATCH | `/messages/:id/read` | ✅ | Mark message read |
| POST | `/messages/:id/report` | ✅ | Report message |

### Notification Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | ✅ | My notifications |
| PATCH | `/notifications/:id/read` | ✅ | Mark read |
| PATCH | `/notifications/read-all` | ✅ | Mark all read |
| DELETE | `/notifications/:id` | ✅ | Delete notification |

### Report Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports` | ✅ | Create report |
| GET | `/reports/my-reports` | ✅ | My reports |
| GET | `/reports/:id` | ✅ | Report detail |
| PATCH | `/reports/:id/cancel` | ✅ | Cancel report |

### Moderator Routes (MODERATOR+)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/moderator/dashboard` | Moderator dashboard |
| GET | `/moderator/reports` | Report queue |
| PATCH | `/moderator/reports/:id/assign` | Assign report |
| PATCH | `/moderator/reports/:id/resolve` | Resolve report |
| GET | `/moderator/claims/pending` | Pending claims |
| PATCH | `/moderator/claims/:id/review` | Review claim |
| GET | `/moderator/suspicious-activity` | Suspicious activity |
| PATCH | `/moderator/suspicious-activity/:id/review` | Review activity |
| PATCH | `/moderator/posts/:id/hide` | Hide post |
| PATCH | `/moderator/posts/:id/restore` | Restore post |
| GET | `/moderator/audit-logs` | Audit logs |

### Admin Routes (ADMIN only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | Admin dashboard |
| GET/PATCH/DELETE | `/admin/users` | User management |
| PATCH | `/admin/users/:id/role` | Update role |
| PATCH | `/admin/users/:id/suspend` | Suspend user |
| PATCH | `/admin/users/:id/unsuspend` | Unsuspend user |
| GET/DELETE/PATCH | `/admin/posts` | Post management |
| GET/POST/PATCH/DELETE | `/admin/categories` | Category management |
| GET | `/admin/claims` | All claims |
| GET | `/admin/matches` | All matches |
| GET | `/admin/reports` | All reports |
| GET | `/admin/analytics` | Platform analytics |
| GET | `/admin/audit-logs` | Audit logs |
| PATCH | `/admin/settings/post-expiry` | Update expiry settings |

### Analytics Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/platform` | MOD+ | Platform-wide stats |
| GET | `/analytics/user/me` | ✅ | My stats |
| GET | `/analytics/recovery-rate` | MOD+ | Recovery rate |
| GET | `/analytics/category-stats` | MOD+ | Category distribution |
| GET | `/analytics/match-performance` | MOD+ | Match performance |

---

## Smart Match Algorithm

When a post is created or updated, the matching engine:

1. Finds all active opposite-type posts (LOST ↔ FOUND)
2. Filters by date range (±30 days) and prioritizes same category/city
3. Scores each pair using weighted components:

| Component | Weight | Method |
|-----------|--------|--------|
| Category | 20% | Exact match |
| Description | 30% | TF-IDF cosine similarity + token overlap |
| Location | 20% | Haversine distance / city name fallback |
| Date/Time | 15% | Day proximity scoring |
| Color/Brand | 10% | Token overlap |
| Other attributes | 5% | Characteristic overlap |

4. Assigns confidence levels:
   - **HIGH** (≥90%): Notify both users immediately
   - **MEDIUM** (70–89%): Notify + show in suggestions
   - **LOW** (<70%): Store internally only

---

## Socket.IO Events

### Server → Client
| Event | Description |
|-------|-------------|
| `notification` | New notification pushed to user room |
| `new_message` | New message in conversation |
| `match_found` | High-confidence match alert |
| `claim_update` | Claim status changed |
| `typing` | Typing indicator from other participant |
| `messages_read` | Messages marked as read |

### Client → Server
| Event | Description |
|-------|-------------|
| `join_conversation` | Join private conv room (validated) |
| `leave_conversation` | Leave conv room |
| `typing_start` | Start typing indicator |
| `typing_stop` | Stop typing indicator |
| `mark_read` | Mark messages read |

---

## Environment Variables

See [.env.example](.env.example) for all variables. Critical ones:

```env
MONGODB_URI=mongodb://localhost:27017/lostlink
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_RESET_SECRET=<min 32 chars>

# Cloudinary (optional but needed for image uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email (optional but needed for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=...
EMAIL_PASS=...
```

---

## Background Jobs (node-cron)

| Job | Schedule | Description |
|-----|----------|-------------|
| Expire Posts | Daily 00:05 | Sets status=EXPIRED for past-expiry posts |
| Smart Match Refresh | Hourly | Re-runs matching on recently updated posts |
| Expiry Warnings | Daily 08:00 | Sends 3-day expiry warning notifications |

---

## Security Features

- **Passwords**: bcrypt (12 rounds)
- **JWTs**: HTTP-only cookies (15m access / 7d refresh)
- **Role-based access**: USER → MODERATOR → ADMIN hierarchy
- **Verification answers**: bcrypt-hashed, normalized before hashing
- **Rate limiting**: Login (10/15m), Register (5/h), Verification (3/24h)
- **Private fields**: Never returned in public API responses
- **Audit trail**: All sensitive actions logged to AuditLog
- **Suspicious activity**: Automatic detection + moderator alerts

---

## Demo Scenario (Seed Data)

```
Alex reported: LOST black leather wallet
  → Near Central Library, Hyderabad
  → August 25, 2:30 PM
  → Private detail: "Small red sticker inside"
  → 3 verification questions set

Priya reported: FOUND black wallet
  → Central Library entrance, Hyderabad  
  → August 25, 3:00 PM

Smart Match Result: 91% HIGH confidence
  ✅ Same category (Wallet)
  ✅ Similar description (78% text similarity)
  ✅ Nearby location (95% — ~44m apart)
  ✅ Same date (100%)
  ✅ Similar color/brand (90%)

Both users receive: "🟢 91% Smart Match Found!" notification

Claim Flow:
1. Alex claims Priya's found item
2. Alex answers verification questions
3. Priya reviews and approves
4. Private chat opens between Alex and Priya
5. Handover arranged and confirmed
6. Item status → RETURNED
7. Trust scores updated for both users
```
