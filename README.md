# Certificate Verification System

This project has **two separate services** that run independently:

```
project/
├── frontend/       ← React admin panel + public verification page
└── photo-server/   ← Tiny Node.js server that stores applicant photos
```

**Why two services?** Firebase Storage's free tier caps out at 5GB. Rather than
pay for Firebase Storage, applicant photos are now stored on your own VPS's
disk (you mentioned having 20GB free there) using a small custom Node.js
server. Everything else — Firestore (the certificate database) and Firebase
Authentication (admin login) — is **unchanged** and still runs through
Firebase exactly as before.

| Piece | Technology | Where it runs |
|---|---|---|
| Admin panel + verification page | React (Vite) | Your VPS, served as static files via Nginx |
| Certificate database | Firebase Firestore | Firebase (unchanged) |
| Admin login | Firebase Authentication | Firebase (unchanged) |
| Applicant photos | Custom Node.js server | Your VPS (new — replaces Firebase Storage) |

---

## How a photo upload works now

```
Admin selects a photo in the form
        ↓
Browser compresses it client-side (already built into the app, <3MB target)
        ↓
React app sends the compressed photo to YOUR photo-server
  (NOT Firebase Storage anymore)
        ↓
photo-server saves it to disk as e.g. SCH-A1B2C3D4.jpg
        ↓
photo-server returns a plain URL:
  https://photos.poli.com/photos/SCH-A1B2C3D4.jpg
        ↓
That URL string is saved into Firestore's student_photo_url field —
exactly like the old Firebase Storage download URL was saved before
```

Firestore never stores the actual photo — only this URL, same as before.

---

## Running Everything Locally

You need **three terminals** open at once: one for the photo server, one for
the frontend, and (already done) your Firebase project set up from before.

### Terminal 1 — Photo Server

```bash
cd photo-server
cp .env.example .env
```

Open `.env` and set a real `UPLOAD_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy that output into `UPLOAD_SECRET=` in `photo-server/.env`.

```bash
npm install
npm run dev
```

You should see:
```
Photo server running on port 4001
Serving uploads from: /path/to/photo-server/uploads
Public base URL: http://localhost:4001
```

### Terminal 2 — Frontend

```bash
cd frontend
cp .env.example .env
```

Open `.env` and fill in:
- Your existing Firebase project keys (same as before — unchanged)
- `VITE_PHOTO_SERVER_URL=http://localhost:4001`
- `VITE_PHOTO_UPLOAD_SECRET=` — **must match exactly** the `UPLOAD_SECRET` you set in `photo-server/.env`

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:3000`).

### Test it

1. Log in to the admin panel
2. Add a new certificate with a photo
3. Check `photo-server/uploads/` on your machine — you should see the new image file appear there
4. Verify the certificate via the public verification page — the photo should display, now being served from your local photo server instead of Firebase Storage

---

## Deploying to Your VPS

This assumes a fresh Ubuntu VPS with Node.js, Nginx, and a domain (e.g. `poli.com`) already pointed at your server's IP.

### Step 1 — Get the code onto your VPS

```bash
# On your VPS
mkdir -p /var/www/cert-system
cd /var/www/cert-system
# Upload both frontend/ and photo-server/ folders here (via git clone, scp, or sftp)
```

### Step 2 — Set up and start the photo server

```bash
cd /var/www/cert-system/photo-server
cp .env.example .env
nano .env
```

In `.env`, set:
- `UPLOAD_SECRET` — a strong random value (same command as above)
- `CORS_ORIGIN=https://poli.com,https://www.poli.com`
- `PUBLIC_BASE_URL=https://photos.poli.com` (or your chosen subdomain/subpath — see Step 4)

```bash
npm install
```

Install PM2 globally if you don't have it, so the server stays running and restarts automatically:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # follow the one printed command it gives you, run it once
```

Confirm it's running:
```bash
pm2 status
curl http://localhost:4001/health
# should return: {"status":"ok"}
```

### Step 3 — Build and deploy the frontend

```bash
cd /var/www/cert-system/frontend
cp .env.example .env
nano .env
```

Fill in your real Firebase keys, plus:
- `VITE_PHOTO_SERVER_URL=https://photos.poli.com`
- `VITE_PHOTO_UPLOAD_SECRET=` — same value as `UPLOAD_SECRET` in `photo-server/.env`

```bash
npm install
npm run build
```

This produces a `dist/` folder — copy or symlink it to where Nginx expects it:

```bash
mkdir -p /var/www/certificate
cp -r dist /var/www/certificate/dist
```

(Adjust the path here and in `nginx.conf` to match if you prefer a different location.)

### Step 4 — Configure Nginx for both services

You're running **two separate things** behind Nginx: the React app (static files) and the photo server (a live Node process on port 4001). The simplest approach is a subdomain for photos.

**Add your DNS record first:** in your domain provider's DNS settings, add an `A` record for `photos.poli.com` pointing to the same VPS IP as your main domain.

**Frontend config** (your main domain):
```bash
sudo cp /var/www/cert-system/frontend/nginx.conf /etc/nginx/sites-available/poli.com
sudo ln -s /etc/nginx/sites-available/poli.com /etc/nginx/sites-enabled/
```
Edit `server_name` inside that file to `poli.com www.poli.com` if needed.

**Photo server config** (the new subdomain):
```bash
sudo cp /var/www/cert-system/photo-server/nginx-photo-server.conf /etc/nginx/sites-available/photos.poli.com
sudo ln -s /etc/nginx/sites-available/photos.poli.com /etc/nginx/sites-enabled/
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5 — Add SSL (HTTPS) for both domains

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d poli.com -d www.poli.com -d photos.poli.com
```

Certbot will automatically update both Nginx configs to redirect HTTP → HTTPS and configure the certificates. Once done, double check `PUBLIC_BASE_URL` in `photo-server/.env` and `VITE_PHOTO_SERVER_URL` in `frontend/.env` both use `https://`, then rebuild the frontend if you changed it:

```bash
cd /var/www/cert-system/frontend
npm run build
cp -r dist/* /var/www/certificate/dist/
```

And restart the photo server if its `.env` changed:
```bash
cd /var/www/cert-system/photo-server
pm2 restart cert-photo-server
```

### Step 6 — Final checks

```bash
curl https://photos.poli.com/health
# {"status":"ok"}

# Visit https://poli.com/admin/login in a browser, log in, add a test
# certificate with a photo, then verify it on the public page.
```

---

## Updating the Photo Server Later

Since it runs under PM2, deploying changes is simple:

```bash
cd /var/www/cert-system/photo-server
git pull              # or re-upload changed files
npm install           # only if dependencies changed
pm2 restart cert-photo-server
```

---

## Backing Up Photos

Your applicant photos now live on your VPS disk, not in Firebase. Make sure
you have a backup strategy — a simple cron job copying the `uploads/` folder
to another location (or another server) periodically is enough for most
cases:

```bash
# Example: daily backup via cron
0 3 * * * tar -czf /backups/cert-photos-$(date +\%F).tar.gz /var/www/cert-system/photo-server/uploads
```

---

## What Did NOT Change

To be explicit about scope — none of the following were touched:
- Firestore database structure, reads, writes, or caching logic
- Firebase Authentication / admin login flow
- The CNIC + captcha public verification page (`VerificationPage.jsx`) and its styling (`verify.css`) — untouched, exactly as requested
- The certificate display design (`CertificateDisplay.jsx`)
- Any certificate form fields, validation, or dropdown management features

Only the **storage mechanism for applicant photos** changed — from Firebase
Storage to a small self-hosted Node.js file server.

---

## Troubleshooting

**Q: Photos don't upload — console shows a CORS error**
A: Check `CORS_ORIGIN` in `photo-server/.env` includes the exact origin your frontend is running on (including `http://` vs `https://` and the port in local dev).

**Q: Upload returns 401 Unauthorized**
A: `VITE_PHOTO_UPLOAD_SECRET` in `frontend/.env` must exactly match `UPLOAD_SECRET` in `photo-server/.env`. Any mismatch (even whitespace) causes this.

**Q: Photos uploaded fine but don't display on the verify page**
A: Check the saved `student_photo_url` value in Firestore — it should start with your photo server's public URL. If it still shows an old `firebasestorage.googleapis.com` URL, that record was created before this migration; old photos remain on Firebase Storage until you re-upload them.

**Q: Photo server stops working after a VPS reboot**
A: Run `pm2 startup` once (see Step 2) so PM2 itself restarts on boot, and always run `pm2 save` after starting your apps so PM2 remembers what to restart.

**Q: How do I increase the 3MB upload limit?**
A: Change the `fileSize` value in `photo-server/src/server.js` (the `limits` option in the multer config), and also raise `client_max_body_size` in `photo-server/nginx-photo-server.conf` to match.
