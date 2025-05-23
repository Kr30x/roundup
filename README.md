# Roundup - Expense Tracking App

A modern expense tracking application built with Next.js, Firebase, and Tailwind CSS.

## Deployment on Vercel

### Prerequisites

1. A Firebase project with the following services enabled:
   - Firebase Authentication (Google provider)
   - Cloud Firestore
   - Firebase Storage

2. A Google Cloud project with OAuth 2.0 credentials

### Environment Variables

Set up the following environment variables in your Vercel project settings:

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_CERT_URL=

# NextAuth.js
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key # Generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Deployment Steps

1. **Prepare Your Repository**
   - Make sure your code is pushed to a GitHub repository
   - Ensure all environment variables are documented (but not committed)
   - Verify `next.config.ts` includes necessary configuration

2. **Connect to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Configure the project:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: next build
     - Output Directory: .next

3. **Configure Environment Variables**
   - Add all environment variables in Vercel project settings
   - For `FIREBASE_PRIVATE_KEY`, make sure to replace `\n` with actual newlines
   - Set `NEXTAUTH_URL` to your production domain

4. **Deploy**
   - Deploy your project
   - Vercel will automatically build and deploy your application

### Important Notes

1. **Firebase Security Rules**
   - Ensure Firestore rules are properly configured
   - Deploy Storage rules for image uploads
   - Review Authentication settings

2. **NextAuth.js Configuration**
   - Update Google OAuth callback URLs in Google Cloud Console
   - Add your production domain to authorized domains in Firebase Console

3. **Image Optimization**
   - Verify `next.config.ts` includes Firebase Storage domain
   - Check image upload limits in Storage rules

## Local Development

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Fill in environment variables
4. Install dependencies: `npm install`
5. Run development server: `npm run dev`

## Features

- Google Authentication
- Expense tracking with image receipts
- Squad management
- Balance calculations
- Western-themed UI
- Responsive design

## Tech Stack

- Next.js 14
- Firebase (Auth, Firestore, Storage)
- NextAuth.js
- Tailwind CSS
- shadcn/ui
- TypeScript
