# Felicity
## All libraries, frameworks and modules used are mentioned in the table below

### Backend

| Library | Version | Justification |
|---------|---------|---------------|
| **Express** | 5.2.1 | Minimalist Node.js web framework. Chosen for its lightweight routing, middleware ecosystem, and wide community support.|
| **Mongoose** | 9.2.1 | MongoDB ODM providing schema validation, middleware hooks, and query building.|
| **Socket.IO** | 4.8.3 | Enables real-time bidirectional communication for the discussion forum. Chosen over raw WebSockets for its automatic reconnection, room-based broadcasting, and fallback support. |
| **jsonwebtoken** | 9.0.3 | Stateless JWT-based authentication. Tokens encode user ID and role, eliminating server-side session storage and enabling role-based access control across endpoints. |
| **bcrypt** | 6.0.0 | password hashing algorithm. Provides secure one-way hashing to protect stored passwords. |
| **nodemailer** | 8.0.1 | Sends HTML emails with attachments. Supports SMTP transport for registration confirmations, credential delivery, and payment approval notifications. |
| **qrcode** | 1.5.4 | Generates QR code images (base64 PNG) embedded in registration confirmation emails. Each QR encodes the registration ID for attendance scanning. |
| **Fuse.js** | 7.1.0 | Client-side fuzzy search library used server-side for event search.|
| **axios** | 1.13.5 | HTTP client for outbound requests (Discord webhook notifications).|
| **dotenv** | 17.3.1 | Loads environment variables from `.env` files. Keeps secrets (DB URI, JWT secret, email credentials) out of source code. |
| **cors** | 2.8.6 | Configures Cross-Origin Resource Sharing headers. Required for the frontend (Vite dev server / Vercel) to communicate with the backend API. |
| **nodemon** | 3.1.11 | Dev dependency. Auto-restarts the server on file changes during development.|

### Frontend

| Library | Version | Justification |
|---------|---------|---------------|
| **React** | 19.2.0 | Component-based UI library. Chosen for its declarative rendering, hooks API, and ecosystem maturity. React 19 provides improved concurrent features. |
| **Vite** | 7.2.4 | Next-generation build tool with instant HMR and optimized production builds. Chosen over CRA for significantly faster development server startup and build times. |
| **Socket.IO Client** | 4.8.3 | Client-side companion to Socket.IO server. Provides real-time message delivery for the discussion forum with automatic reconnection handling. |
| **html5-qrcode** | 2.3.8 | Camera-based QR code scanner using the device camera. Enables organizers to scan attendee QR codes directly from the browser without native app dependencies. |
| **axios** | 1.13.5 | HTTP client for API calls with interceptors for JWT token injection. Provides consistent request/response handling and error management across all API calls. |
| **Vanilla CSS** | — | Custom CSS with CSS variables for theming. |

### External Services

| Service | Purpose |
|---------|---------|
| **MongoDB Atlas** | Cloud-hosted MongoDB database. Free tier provides sufficient storage with automatic backups and global availability. |
| **Google reCAPTCHA v3** | Bot protection on signup and login forms. Runs in the background to detect automated activity without requiring user interaction. |
| **Discord Webhooks** | Automated event announcements posted to a Discord channel when organizers publish new events.|
| **Render** | Backend hosting (Node.js). Free tier with auto-deploy from GitHub. |
| **Vercel** | Frontend hosting (static Vite build). Free tier with CDN, auto-deploy from GitHub, and preview deployments.|

---

## Advanced Features Implemented

### Tier 1-B: Merchandise Payment Approval Workflow

I choose this because feature A was very hard to implement

when a participant registers for an merchandise event , the backend asks the user to upload a payment proof and the user can upload a payment proof and then the organizer can look at the payment proofs in participants button in organizer dashboard under that event and then the organizer can approve/reject the payment proof and if approved the participant can download/print the ticket and also ticket is send to the participant email using nodemailer.
and the revenue is calculated by the backend and the revenue is updated in the organizer dashboard and stock is updated in the event dashboard.

### Tier 1-C: QR Scanner & Attendance Tracking

We chose QR-based attendance because by this i can get an experience of how qr code scanner is implemented in real life

When a participant registers for an event, the backend generates a QR code encoding their registration ID using the qrcode library. This QR is sent to them via email as a PNG attachment. Organizers can then open the Attendance Dashboard under that particular event, which uses html5-qrcode to access the device camera and scan QR codes. On scanning, the backend validates the registration, checks for duplicates, and marks attendance. The dashboard shows real-time stats like total registered, checked-in count, and percentage. There is also a manual ID entry fallback for damaged QR codes.

We used html5-qrcode instead of raw camera APIs for cross-browser compatibility.

### Tier 2-A: Real-Time Discussion Forum

We implemented a real-time forum so participants and organizers can discuss events before, during, and after they happen. Socket.IO was chosen for its reliability and ease of use.
they can only use this forum if they are registered for the event

Each event gets its own Socket.IO room keyed by event ID. Messages are saved in MongoDB using the ForumMessage model and broadcast in real-time to everyone in the room. The forum supports @everyone mentions which create notifications for all registered participants. Organizer messages are shown with organizer badge.

 Messages are persisted in the database so they survive page refreshes and server restarts. 

### Tier 2-B: Organizer Password Reset workflow

I implemented this feature because i already add the reset button in my frontend so i wanted to also add the backend for it

organizer goes to organizers profile and clicks on reset password and the admin will get that request in the admin dashboard under the reset password requests section and the admin can approve that request and the organizer can reset their password and the admin can also reject that request and when the request is accepted the new password is sent to the organizers email.

The backend uses a PasswordResetRequest model in MongoDB that stores the organizer ID, user ID, reason, status (PENDING, APPROVED, REJECTED), admin comment, and the generated password. When the organizer submits a reset request from their profile page, a new document is created with status PENDING. The admin dashboard fetches all pending requests using a GET endpoint that populates the organizer name and user email. When the admin approves, the backend generates a random 8-character password using crypto.randomBytes, hashes it with bcrypt, updates the user's password in the database, and sends the new password to the organizer's contact email using nodemailer. If rejected, the admin can provide a reason which is stored in the adminComment field and emailed to the organizer. All requests (pending, approved, rejected) are visible in the admin dashboard so the admin has a full history.

### Tier 3-C Bot Protection

We implemented reCAPTCHA v3 on the signup and login pages to prevent automated bot registrations and brute-force attacks while maintaining a frictionless user experience.

Unlike v2, which requires users to solve challenges, v3 runs in the background and assigns a score to each request. On the frontend, when a user submits the signup form, we use `window.grecaptcha.execute` to generate a unique token. This token is sent to the backend, where it is verified using Google's `siteverify` API. The backend checks for two things: that the verification was successful and that the user's score meets our threshold.

We chose a score threshold of **0.5**. This is the default recommended by Google as it provides a balanced middle ground—blocking high-probability bots (scores near 0.0) while allowing human users (scores near 1.0) to pass through without interruption. It ensures security without being so strict that it blocks legitimate users who might be using VPNs or privacy-focused browser configurations.

## Setup & Installation

1. Clone the repository
```
git clone https://github.com/Nikhith-2025/Dass_assignment_1.git
cd Dass_assignment_1
```

2. Backend setup
```
cd backend
npm install
```

Create a .env file in the backend/ directory with:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
DISCORD_WEBHOOK_URL=your_discord_webhook_url
PORT=5000
```

Start the backend:
```
npm run dev
```

3. Frontend setup
```
cd frontend
npm install
```

Create a .env file in the frontend/ directory with:
```
VITE_API_URL=http://localhost:5000/api
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

Start the frontend:
```
npm run dev
```

4. Open http://localhost:5173 in your browser
