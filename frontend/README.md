# Certificate Verification System — Frontend

> 📌 **This is one of two services in this project.** For the full picture —
> including the new photo-server that replaced Firebase Storage, local dev
> setup for both services together, and VPS + domain deployment — see the
> **`README.md` in the parent project folder**, not this one. This file
> covers frontend-specific details only (Firebase/Firestore setup, project
> structure, admin panel usage).

A production-ready academic certificate management and public verification system built with **React + Firebase**.

---

## What This System Does

| Feature | Details |
|---|---|
| Admin Panel | Issue, edit, delete certificates with full form validation |
| CNIC Verification Gate | Public users verify a certificate by entering CNIC + solving a math captcha |
| Direct Document Lookup | CNIC is the Firestore document ID — verification is a single direct read, fast and cheap at any scale |
| Photo Storage | Upload applicant photo to your own photo-server (see project root README), auto-compressed in-browser |
| Purpose CRUD | Admin can manage dropdown options without code changes |

---

## Tech Stack

- **Frontend:** React 18 + Vite
- **Routing:** React Router v6
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (Email/Password)
- **Storage:** Custom Node.js photo-server on your own VPS (see project root README) — NOT Firebase Storage
- **Hosting:** Your custom server (Nginx)

---

## Project Structure

```
src/
├── admin/
│   ├── components/
│   │   ├── CertificateForm.jsx    ← Add/edit form (5 sections, CNIC locked on edit)
│   │   ├── CertificateTable.jsx   ← Records table with status indicators
│   │   ├── DeleteModal.jsx        ← Confirmation modal before delete
│   │   ├── MetricCard.jsx         ← Dashboard metric display card
│   │   └── SearchFilterBar.jsx    ← Search + city filter
│   ├── hooks/
│   │   ├── useCertificates.js     ← One-time fetch + cache, manual refresh()
│   │   ├── useDropdownList.js     ← Generic hook for the 3 dropdown lists
│   │   └── usePurposes.js         ← Thin wrapper over useDropdownList("purpose")
│   └── pages/
│       ├── Dashboard.jsx          ← Main admin dashboard
│       ├── AddCertificate.jsx     ← New certificate page
│       ├── EditCertificate.jsx    ← Edit existing certificate
│       └── ManagePurposes.jsx     ← Tabbed CRUD for all 3 dropdown lists
├── auth/
│   ├── LoginPage.jsx              ← Admin login form
│   └── ProtectedRoute.jsx         ← Route guard (redirects if not logged in)
├── context/
│   └── AuthContext.jsx            ← Firebase auth state provider
├── firebase/
│   ├── config.js                  ← Firebase app initialization
│   ├── authService.js             ← Login / logout / auth listener
│   ├── cache.js                   ← In-memory read cache (cost optimization)
│   ├── firestoreService.js        ← All Firestore reads/writes; CNIC = doc ID
│   └── storageService.js          ← Calls the photo-server (not Firebase Storage)
├── public/
│   ├── components/
│   │   └── CertificateDisplay.jsx ← The certificate card UI (shown after verification)
│   └── pages/
│       └── VerificationPage.jsx   ← CNIC + captcha gate, then shows CertificateDisplay
├── styles/
│   ├── global.css                 ← Shared variables, buttons, spinner
│   ├── login.css
│   ├── dashboard.css
│   ├── form.css
│   ├── purposes.css
│   └── verify.css                 ← Certificate card styles + CNIC/captcha gate styles
├── utils/
│   ├── generateCertId.js          ← Collision-safe SCH-XXXXXXXX generator
│   ├── cnicUtils.js                ← CNIC format validation + auto-format-as-you-type
│   ├── mathCaptcha.js              ← Simple two-number addition captcha generator
│   ├── compressImage.js            ← Browser-side image compression (<3MB)
│   └── validateForm.js             ← Form validation rules
├── App.jsx                        ← Routes definition
└── main.jsx                       ← React entry point
```

---

## STEP 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `cert-system`) → Continue
3. Disable Google Analytics if not needed → **Create project**

---

## STEP 2 — Enable Firebase Services

### Authentication
1. Firebase Console → **Authentication** → Get started
2. Click **Sign-in method** tab
3. Enable **Email/Password** → Save
4. Go to **Users** tab → **Add user**
5. Enter your admin email + strong password → **Add user**
6. ⚠️ This is the only account that can log in to the admin panel

### Firestore Database
1. Firebase Console → **Firestore Database** → Create database
2. Choose **Start in production mode** → Next
3. Select your nearest region (e.g. `asia-south1` for Pakistan) → Enable
4. Go to **Rules** tab → paste the contents of `firestore.rules` → **Publish**

> Firebase Storage is **not used** in this project — skip enabling it entirely.
> Applicant photos are stored on your own VPS via the separate photo-server.
> See the project root `README.md` for setting that up.

---

## STEP 3 — Get Firebase Config Keys

1. Firebase Console → **Project Settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → click **</>** (Web app)
3. Register app → copy the `firebaseConfig` object values

---

## STEP 4 — Set Up Environment Variables

```bash
# In the project root, copy the example file
cp .env.example .env
```

Open `.env` and fill in your values:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

VITE_PHOTO_SERVER_URL=http://localhost:4001
VITE_PHOTO_UPLOAD_SECRET=generate_a_random_key_here
```

**Generate the photo upload secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This same value must also be set as `UPLOAD_SECRET` in `photo-server/.env` —
see the project root `README.md` for setting up the photo-server.

⚠️ **NEVER** commit `.env` to Git. It is in `.gitignore` already.

---

## STEP 5 — Install Dependencies and Run

```bash
# Install packages
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You will be redirected to `/admin/login` — log in with the admin email/password you created in Firebase.

---

## STEP 6 — Seed Initial Purposes

Before adding certificates, add some purpose options:

1. Log in as admin
2. Go to **Manage Purposes** (sidebar link)
3. Add purposes like:
   - Employment Verification
   - Higher Education
   - Bank Account Opening
   - Visa Application
   - Government Record
4. These will appear as dropdown options in the certificate form

---

## STEP 7 — Build for Production

```bash
npm run build
```

This creates a `dist/` folder with the compiled React app.

---

## STEP 8 — Deploy to Your Custom Server (Nginx)

```bash
# On your server, copy the dist folder
scp -r dist/ user@your-server:/var/www/certificate/

# Or via Git:
# git clone your-repo on server
# npm install && npm run build
```

### Nginx Setup

```bash
# Copy the nginx config
sudo cp nginx.conf /etc/nginx/sites-available/certificate.com

# Enable the site
sudo ln -s /etc/nginx/sites-available/certificate.com /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### SSL (HTTPS) — Required for Production

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get free SSL certificate
sudo certbot --nginx -d certificate.com -d www.certificate.com
```

After SSL is working, uncomment the HTTPS server block in `nginx.conf` and re-run `sudo nginx -t && sudo systemctl reload nginx`.

---

## Admin Routes

| Route | Description |
|---|---|
| `/admin/login` | Admin login page |
| `/admin/dashboard` | Main dashboard — all records, metrics, search |
| `/admin/add` | Issue a new certificate |
| `/admin/edit/:id` | Edit an existing certificate |
| `/admin/purposes` | Manage purpose dropdown values |

## Public Routes

| Route | Description |
|---|---|
| `/verification/certificate/:slug` | Public CNIC + captcha verification page |
| `/verification/certificate` | Same page without a slug — both work identically |

---

## How CNIC Verification Works

```
Admin fills form → clicks "Issue Certificate"
        ↓
Form validated → CNIC format checked (XXXXX-XXXXXXX-X required)
        ↓
cert_id generated:  SCH-A1B2C3D4
        ↓
Record saved to Firestore using the CNIC itself as the document ID
  (dashes stripped, e.g. "3520112345671")
        ↓
Public user visits /verification/certificate
        ↓
Enters CNIC + solves a simple math captcha (e.g. "4 + 9")
        ↓
On submit: verifyCertificateByCnic(cnic) runs a DIRECT getDoc() —
not a query — by the same normalized CNIC used as the document ID
        ↓
Found  → certificate card displayed (read-only)
Not found → red "No record found for this CNIC" message
```

**Why this is fast and cheap at any scale:** because the CNIC is the document ID, looking it up is a direct document read — Firestore's cheapest possible operation. There is no query, no composite index, and no degradation in speed or cost whether you have 100 or 1,000,000 certificates stored. Combined with the in-memory cache (see below), checking the same CNIC twice in one session costs nothing on the second check.

---

## Security Notes

### What is Protected
- Admin panel requires Firebase JWT — impossible to bypass
- Public verification requires both a correct CNIC AND a correct captcha answer — a simple deterrent against casual bot scraping
- Firestore rules block any unauthenticated writes
- The CNIC field becomes read-only once a certificate is edited — since CNIC is the document's permanent identifier, it cannot be changed after issuance without creating a new record

### What is Intentionally Public
- `/verification/certificate` — CNIC is displayed in plain text on this system per project requirements; anyone who knows a valid CNIC and solves the captcha can view that one record
- Applicant photo URL — not guessable without first knowing the CNIC

### MAC Address Tracking — Why It Is Impossible
MAC addresses are Layer 2 network identifiers. They never leave the local network — your server only ever sees IP addresses. No browser API exposes MAC addresses. This system uses Firebase JWT tokens instead, which are cryptographically signed and server-verified on every request.

---

## Cost Optimization: Caching & Compression

This system is built to stay on Firebase's free tier as long as possible.

### Firestore Read Caching
Firestore bills per document read. Earlier versions of this system used `onSnapshot()` (a live listener), which counts a read for every document on every change, for as long as the page stays open — this gets expensive fast.

This system instead uses **one-time reads with an in-memory cache** (`src/firebase/cache.js`):
- Opening the Dashboard, navigating away, and coming back **does not** trigger a new read — the cached data is reused.
- The cache is only cleared the moment you actually **add, edit, or delete** a record — so the next load is guaranteed fresh, and nothing is read needlessly.
- The same applies to dropdown lists (Purpose, Purpose of Obtaining, Cities) and to public CNIC lookups — checking the same CNIC twice in one browser session costs only one read.

**Practical effect:** a typical admin session (open dashboard, add a few certificates, edit one, browse around) costs only a handful of reads/writes — not hundreds.

⚠️ The cache lives in memory only and clears on page refresh (F5) or closing the tab — this is intentional and safe, since the next load just performs one fresh fetch.

### Image Compression Before Upload
Applicant photos are automatically compressed in the browser (`src/utils/compressImage.js`) before they're uploaded:
- Resized so the longest side is at most 1280px
- Re-encoded as JPEG, with quality stepped down automatically until the file is under **3MB**
- This happens instantly when the photo is selected — by the time you click "Issue Certificate," the file is already small

This keeps uploads fast and keeps your VPS disk usage predictable even if admins select large phone-camera photos (often 5–15MB uncompressed). A server-side limit in `photo-server/src/server.js` also rejects any file over 3MB as a safety net, in case compression is ever bypassed.

---

## Firebase Free Tier Limits

| Resource | Free Limit | Your Usage |
|---|---|---|
| Firestore reads | 50,000/day | Monitor if public traffic is high |
| Firestore writes | 20,000/day | Fine — admin writes only |
| Auth | 10,000/month | Fine — single admin |

Storage is no longer a Firebase concern at all — applicant photos live on your own VPS disk via the photo-server (see project root README), so there's no Firebase Storage limit to track.

**Upgrade to Blaze (pay-as-you-go) when you exceed Firestore's free limits.** At 50k records with moderate traffic, costs are typically $1–5/month.

---

## Common Issues

**Q: Login fails with "auth/invalid-credential"**
A: Check that the email you entered in Firebase Auth → Users exactly matches what you type in the login form. Passwords are case-sensitive.

**Q: Firestore writes fail with "Missing or insufficient permissions"**
A: Make sure your `firestore.rules` file is deployed. Go to Firebase Console → Firestore → Rules and paste the rules manually if needed.

**Q: `/verification/certificate/...` shows blank page on production server**
A: Your Nginx config is missing `try_files $uri $uri/ /index.html;`. This is required for React Router to work on a custom server.

**Q: Photo upload works in dev but fails in production**
A: Check `VITE_PHOTO_SERVER_URL` in `frontend/.env` points to your deployed photo-server's real URL (not localhost), and that `VITE_PHOTO_UPLOAD_SECRET` matches `UPLOAD_SECRET` in `photo-server/.env` exactly. See the project root README for full photo-server setup.

**Q: CNIC field is locked/grey when editing a certificate**
A: This is intentional. Since CNIC is the certificate's permanent document ID in Firestore, it cannot be changed after issuance — changing it would effectively require creating a new record. If a CNIC was entered incorrectly, delete the certificate and re-issue it with the correct CNIC.

---

## Customisation Guide

### Change the Certificate ID prefix (SCH-)
Edit `src/utils/generateCertId.js` → change `const PREFIX = "SCH"` to your prefix.

### Add more cities, purposes, or "purpose of obtaining" options
These are no longer hardcoded — go to **Manage Dropdowns** in the admin sidebar and add/edit/delete items directly from the UI. No code changes needed.

### Change the captcha difficulty
Edit `src/utils/mathCaptcha.js` → adjust the random number ranges, or change the operation from addition to something else.

### Change the admin email shown in Firestore rules
Edit `firestore.rules` if you want to restrict by specific email. Or leave as-is to allow any verified Firebase user to write.

---

## Deployment Checklist

- [ ] Firebase project created
- [ ] Email/Password auth enabled
- [ ] Admin user created in Firebase Auth
- [ ] Firestore created in production mode
- [ ] `firestore.rules` deployed
- [ ] Photo-server deployed and running on your VPS (see project root README)
- [ ] `.env` file filled with real Firebase keys + photo-server URL/secret
- [ ] `npm run build` completed successfully
- [ ] `dist/` uploaded to server at `/var/www/certificate/`
- [ ] Nginx config installed and tested (both frontend and photo-server)
- [ ] SSL certificate obtained (HTTPS) for both domains/subdomains
- [ ] Purposes seeded in admin panel
- [ ] Test: issue one certificate end-to-end, including a photo upload
- [ ] Test: visit /verification/certificate, enter the saved CNIC + solve captcha → certificate and photo display correctly
- [ ] Test: logout and confirm admin routes redirect to login

---

*Built for production use — React 18 + Firebase 10 + Vite 5*
