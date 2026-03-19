# 🚲 Neighborhood Rider

Your friendly local delivery service connecting neighbors with trusted riders for quick errands, groceries, and parcels.

## 🌟 Features

-   **Role-Based Access**: Specialized dashboards for Users, Riders, and Admins.
-   **Smart Chatbot**: AI-powered assistant (via Groq) to help users place orders and find riders naturally.
-   **Real-Time Tracking**: Live rider location sharing using Socket.IO and Leaflet maps.
-   **Automated Assignments**: "Smart Match" system to find the nearest online rider.
-   **Secure Payments**: Integrated M-Pesa payment flow.
-   **Fun & Modern UI**: "Bubblegum Pop" aesthetic with glassmorphism and smooth animations.

---

## 🛠️ Tech Stack

### Frontend
-   **Framework**: React.js (v18)
-   **Styling**: Tailwind CSS (Custom "Fun" Theme), Vanilla CSS
-   **Animations**: Framer Motion
-   **Maps**: Leaflet / React-Leaflet
-   **Real-time**: Socket.IO Client
-   **Routing**: React Router DOM

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose ODM)
-   **Authentication**: JWT (Access & Refresh Tokens), BCrypt
-   **AI**: Groq SDK (LLM for Chatbot)
-   **Real-time**: Socket.IO
-   **Payment**: M-Pesa API integration

---

## 📚 User Guide

### 👤 Normal User (The Neighbor)
1.  **Sign Up/Login**: Create an account to start ordering.
2.  **Place an Order**:
    -   Use the **"Order Now"** form for specific details.
    -   Or chat with the **Bot** (bottom right) and say "I need milk from the shop". Type "Yes" to confirm sending the order.
3.  **Track Delivery**: Go to "My Orders" to see status updates. Once a rider is assigned, you'll see their location on the map.
4.  **Notifications**: Receive pop-up alerts when a rider is assigned or arrives.

### 🏍️ Rider
1.  **Get verified**: Register as a rider. An admin must approve your profile before you can work.
2.  **Go Online**: Log in to your **Rider Dashboard**. You are automatically marked "Online" upon login.
    -   Toggle your status (Online/Offline) in the "My Profile" tab.
3.  **Receive Orders**:
    -   When a job matches your location, it appears in "Assigned Orders".
    -   Click **"Accept Order"** to start.
4.  **Complete Delivery**:
    -   Use the "Navigate" button to see the route.
    -   Mark as **"Arrived/Delivered"** when you reach the drop-off.
    -   Once paid, click **"Payment Received & Complete"** to finish the job.

### 🛡️ Admin
1.  **Dashboard Overview**: View live stats (Revenue, Active Orders, Active Riders) at a glance.
2.  **Manage Riders**:
    -   Go to the "Riders" tab to see all registrations.
    -   **Approve** pending riders to let them start working.
    -   **Reject** or deactivate riders if necessary.
3.  **Monitor Orders**: Watch live orders come in. You can manually re-assign orders if needed.
4.  **Content Management**: Add/Edit/Delete FAQs and view user inquiries.

---

## 🚀 Getting Started (Development)

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    # Backend
    cd backend
    npm install

    # Frontend
    cd frontend
    npm install
    ```
3.  **Environment Variables**:
    -   Create `.env` in `backend/` (MONGO_URI, JWT_SECRET, GROQ_API_KEY, ADMIN_EMAIL).
    -   Create `.env` in `frontend/` (REACT_APP_API_URL).
4.  **Run Locally**:
    ```bash
    # Terminal 1 (Backend)
    cd backend
    npm run dev

    # Terminal 2 (Frontend)
    cd frontend
    npm start
    ```

## 🔐 Credentials (Demo)

-   **Admin**: `admin@neighborhood.com` (Auto-promoted if matches ENV)
-   **Test Rider**: `smurkcarter855@gmail.com` / `password`
# neighborhood-rider
