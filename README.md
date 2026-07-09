# Assign Me — Assignment Stress Relief Portal

Welcome to **Assign Me**! This is a complete, fully-featured React, Vite, Tailwind CSS, and Firebase application configured for native local development in **VS Code** (or your editor of choice). 

This project was built to help manage and relieve assignment stress. It features an interactive student-facing order wizard, rich content sections, reviews, rewards, and a comprehensive, fully-functional **Admin Dashboard** and **User Dashboard** driven by live Firebase integrations.

---

## 🚀 Getting Started (Quick Run)

You can run this project locally in seconds by following these three steps:

### 1. Extract the Files
Extract the contents of the downloaded ZIP archive into a folder.

### 2. Install Dependencies
Open your terminal in the extracted project root directory and run:
```bash
npm install
```

### 3. Start the Development Server
Run the following command to start the development server:
```bash
npm run dev
```
Once the dev server is up, open your browser and go to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Project Structure

The project directory structure is clean, modular, and optimized for VS Code:

```
├── .env.example                # Example template for custom environment variables
├── .gitignore                  # Standard git ignoring rules
├── index.html                  # Main SPA HTML template
├── package.json                # Project dependencies and scripts
├── server.ts                   # Custom Express-Vite development and production server
├── tsconfig.json               # TypeScript compiler options
├── vite.config.ts              # Vite configuration (Tailwind & React plugins)
└── src/                        # Source directory
    ├── main.tsx                # Client application entry point
    ├── App.tsx                 # Main application structure, user state, and routing logic
    ├── firebase.ts             # Firebase Client initialization (with fallback)
    ├── types.ts                # Global TypeScript interfaces (User, Order, Reward, etc.)
    ├── index.css               # Global Tailwind CSS directives and theme fonts
    ├── components/             # Reusable UI components
    │   ├── AdminPortal.tsx     # Full Admin dashboard with live orders, statistics, etc.
    │   ├── AuthModal.tsx       # Firebase-driven login / registration modal
    │   ├── Hero.tsx            # Captivating landing section
    │   ├── HowItWorks.tsx      # Interactive step-by-step procedure
    │   ├── OrderWizard.tsx     # Custom pricing calculator and ordering flow
    │   ├── PhotoUploadSection.tsx # File drag-and-drop & selection with local compression
    │   ├── Pricing.tsx         # Clear price tiering cards
    │   ├── ReviewSection.tsx   # Live customer review slider
    │   └── RewardsSection.tsx  # Gamified loyalty rewards program
    ├── services/
    │   └── dbService.ts        # Modular Firestore queries (crud operations, stats, reviews)
    └── utils/
        └── imageCompressor.ts  # Client-side image compressor before file storage/uploading
```

---

## 🔑 Environment Variables & Firebase Configuration

By default, the application is pre-configured with active development credentials, meaning **it works out-of-the-box** without any additional steps!

However, if you want to deploy this with your own database or use your custom Google Firebase project, follow these instructions:

### 1. Create a Local Environment File
Copy the `.env.example` file to create `.env` (Vite automatically picks up `.env` files):
```bash
cp .env.example .env
```

### 2. Enter Your Own Firebase Credentials
Initialize a web app in your Firebase console and replace the placeholder keys in your `.env` file:
```env
# Firebase Client Configuration (VITE_ prefixed for Vite access)
VITE_FIREBASE_API_KEY="YOUR_ACTUAL_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_APP_ID"

# Database ID (Set to "(default)" to use your standard default Firestore database)
VITE_FIREBASE_DATABASE_ID="(default)"
```

---

## 📈 Firebase Database Setup Instructions

To support all application features (such as user profiles, assignments, feedback, and logs) on your custom database, make sure to enable the following services in your **Firebase Console**:

1. **Authentication**: Enable the **Email/Password** sign-in provider.
2. **Cloud Firestore**:
   - Create a database (either using the default database ID or a custom one).
   - Ensure you configure the proper collections. The application automatically initializes and writes collections dynamically as they are queried (e.g., `orders`, `profiles`, `reviews`, `rewards`, `system_logs`).

---

## 📦 Scripts Available

Inside the project, you can run the following npm scripts:

- **`npm run dev`**: Starts the development server on port 3000 using the custom Express-Vite engine (`server.ts`).
- **`npm run build`**: Compiles the static React frontend into `/dist` and bundles the Express server using `esbuild` into `/dist/server.cjs`.
- **`npm run start`**: Boots up the compiled, self-contained Express production backend serving the production build.
- **`npm run lint`**: Checks for TypeScript compiler errors and type mismatches.

---

## ❤️ Features Highlight

- **Student Order Wizard**: Dynamic estimation calculations based on difficulty, deadline, academic level, and double-spacing. Integrated local image compressor to minimize upload times.
- **Interactive Dashboards**: Dual-role architecture. Users can track their ordered assignments, look up current statuses, view milestones, and check loyalty reward progress. Administrators have an interactive dashboard with orders management, order tracking, review moderations, and real-time logs.
- **Gamified Rewards System**: Points-based milestone system where students earn loyalty coins for every assignment completed and redeem them for percentage-based discounts.
- **Modern Responsive Design**: Custom Tailwind layout with fluid CSS transitions and micro-animations for high-fidelity interactive feedback.
