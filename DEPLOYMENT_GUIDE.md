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

## What's Being Deployed
The backend code now includes:
- ✅ `getPendingSubmissionsHandler` - accepts `fromDate`, `toDate`, `dateField` parameters
- ✅ `getConfirmedSubmissionsHandler` - accepts `fromDate`, `toDate`, `dateField`, `confirmedBy` parameters
- ✅ SQL queries filtering by date ranges on `created_at` or `confirmed_at` columns
- ✅ Summary endpoints with date-range support

## After Deployment
Once backend is redeployed:
1. Refresh the production dashboard (Ctrl+Shift+R for hard refresh)
2. Try the date filters again
3. Both Employee Tracking and Mobile User Tracking should work without 500 errors

## Frontend Deployment (Already Done)
Frontend is already deployed with:
- From/To date pickers in Summary and Tracking detail views
- Correct query parameters being sent to backend
