# Deployment Guide - Date Range Filter Fix

## Problem
- ✅ **Frontend**: Already deployed with date-range UI (visible in production)
- ❌ **Backend**: NOT redeployed - returning 500 errors when frontend sends `fromDate`/`toDate` parameters

## Solution: Redeploy Backend

Your backend runs on **Google Cloud Run** at:
```
https://govt-survey-backend-19218031051.asia-south1.run.app
```

### Option 1: Using Google Cloud CLI (Recommended)

```bash
# 1. Authenticate with Google Cloud
gcloud auth login

# 2. Set your project ID (replace with your actual project ID)
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy backend from current directory
cd backend
gcloud run deploy govt-survey-backend --source . --platform managed --region asia-south1 --allow-unauthenticated
```

### Option 2: Using Cloud Build (if configured)

If you have Cloud Build set up, push to your repo:
```bash
git push origin main
```
This should automatically trigger a build and deploy.

### Option 3: Manual Docker Build & Push

```bash
# Build Docker image
docker build -t govt-survey-backend:latest backend/

# Tag for Google Container Registry
docker tag govt-survey-backend:latest gcr.io/YOUR_PROJECT_ID/govt-survey-backend:latest

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/govt-survey-backend:latest

# Deploy to Cloud Run
gcloud run deploy govt-survey-backend \
  --image gcr.io/YOUR_PROJECT_ID/govt-survey-backend:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

## Frontend Deployment (Firebase Hosting)

We have shifted the frontend hosting configuration from Google Cloud Run to **Firebase Hosting**. This allows you to easily bind custom domains.

### Steps to Deploy:

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Login to Firebase** (Only needed the first time):
   ```bash
   npx firebase login
   ```
   *This will open a browser tab asking you to log in with your Google account.*

3. **Build the production assets**:
   ```bash
   npm run build
   ```
   *This compiles all React components and outputs them into the `dist/` folder.*

4. **Deploy to Hosting**:
   ```bash
   npx firebase deploy --only hosting
   ```

---

## What was configured for Firebase Hosting:
* **SPA Routing**: Configured in `firebase.json` so that all routes redirect to `index.html` (resolving any page-reload 404 errors).
* **Caching Policy**:
  * `index.html` is configured to never cache, preventing users from seeing stale builds on new deployments.
  * Hashed assets (`/assets/**`) are cached for 1 year with `immutable` for optimal loading performance.
