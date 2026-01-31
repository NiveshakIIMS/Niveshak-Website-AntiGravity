# Niveshak - IIM Shillong Finance Club Website

A high-performance, modern full-stack website for Niveshak, built with **Next.js 15**, **Tailwind CSS**, and **Supabase**.

![Niveshak Preview](./public/logo.png)

## 🚀 Key Features

*   **Modern UI/UX**: Glassmorphism design system with responsive animations using Framer Motion.
*   **Content Management**: Secure Admin Portal for managing Team, Events, and Magazines.
*   **Financial Dashboard**: Interactive NAV Chart with historical performance analytics.
*   **Digital Magazine**: Integrated Flipbook viewer for reading monthly issues.
*   **Dark Mode**: Fully supported system-wide dark/light theme toggle.

## 🛠️ Tech Stack

*   **Frontend**: Next.js 15 (App Router), React, TypeScript
*   **Styling**: Tailwind CSS, Lucide Icons
*   **Animations**: Framer Motion
*   **Backend & Auth**: Supabase (PostgreSQL, Auth)
*   **Charts**: Recharts

## 📦 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/niveshak-website.git
    cd niveshak-website
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) inside your browser.

## 🚢 Deployment

### Vercel (Recommended)
1.  Push code to GitHub.
2.  Import project to [Vercel](https://vercel.com).
3.  Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Environment Variables.
4.  Deploy!

## 🔐 Admin Access
Navigate to `/admin` to access the CMS portal. Requires authentication via Supabase.

---
Developed for Niveshak, IIM Shillong.
