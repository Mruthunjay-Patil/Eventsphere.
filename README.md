# EventSphere — Event & Wedding Marketplace

<p align="center">
  <strong>Discover. Plan. Celebrate.</strong>
</p>

<p align="center">
  A full-stack event and wedding marketplace connecting customers with professional event service providers through a unified booking platform.
</p>

<p align="center">
  <a href="https://eventsphere-7rfn.onrender.com">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#installation--setup">Installation</a> •
  <a href="#project-structure">Project Structure</a>
</p>

---

## Overview

**EventSphere** is a full-stack event management and service marketplace designed to simplify event planning and vendor discovery.

The platform connects customers looking for event services with vendors offering professional services such as wedding photography, catering, decoration and other event-related solutions.

EventSphere provides separate experiences for customers, vendors and administrators, making it easier to discover services, manage bookings, handle enquiries and manage vendor approvals.

The application is built using modern web technologies, with a Node.js backend, React frontend and MongoDB database.

## Live Application

| Application | URL |
|---|---|
| Customer & Vendor Portal | [EventSphere Live](https://eventsphere-7rfn.onrender.com) |
| Admin Portal | Available through the deployed application at `/admin.html` |

## Features

### Customer Portal
- Browse and discover event services.
- Explore services based on event categories.
- Search and filter available vendors.
- View detailed vendor profiles and service information.
- Check service availability and time slots.
- Reserve services through a booking modal.
- Track bookings through My Bookings.
- Make payments through the integrated Stripe Checkout flow.
- Receive booking and payment email notifications.

### Vendor Portal
- Dedicated vendor registration and login.
- Manage vendor profiles and service listings.
- Upload service images and event cover photos.
- Submit new services for administrator approval.
- Manage customer enquiries.
- Accept or decline booking requests.
- Manage service availability.
- Mark completed bookings.
- View booking and payment-related information.

### Admin Portal
- Separate administrator interface.
- Review submitted vendor services.
- Approve or reject service listings.
- Manage vendor and marketplace visibility.
- Ensure only approved services appear in the customer marketplace.

### Booking Management
- Interactive service reservation modal.
- Date-based availability selection.
- Live time-slot availability.
- Booking status management.
- Backend availability verification.
- MongoDB unique-index protection against concurrent double-booking.
- Active bookings remain unavailable to other customers.

### Payment Integration
- Stripe-hosted Checkout.
- Test-mode payment support.
- Advance and full-payment configuration.
- Backend payment verification through Stripe webhooks.
- Separate booking and payment statuses.
- Payment records associated with bookings.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, HTML5, CSS3, TypeScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Authentication | JWT, Google Identity Services, Email OTP |
| Payments | Stripe Checkout, Razorpay configuration |
| Email Services | Nodemailer, SMTP |
| Development Tools | VS Code, Git, GitHub |
| Deployment | Render |

## Application Architecture

```text
                  EventSphere
                       |
          +------------+------------+
          |            |            |
       Customer      Vendor        Admin
        Portal       Portal       Portal
          |            |            |
          +------------+------------+
                       |
                 React Frontend
                       |
                  REST APIs
                       |
                Node.js / Express
                       |
          +------------+------------+
          |            |            |
       MongoDB       Stripe       Nodemailer
        Atlas        Checkout      SMTP
```

## Project Structure

```text
EventSphere/
│
├── assets/
├── src/
│
├── admin.html
├── admin-server.ts
├── server.ts
├── dev.ts
├── index.html
│
├── public/
│
├── .env.example
├── .gitignore
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
│
├── README.md
└── render.yaml
```

*The structure above represents the main project files; additional folders may exist in the repository.*

## Installation & Setup

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- Git
- MongoDB Atlas account
- VS Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Mruthunjay-Patil/EventSphere.git
```

### 2. Navigate to the Project Directory

```bash
cd EventSphere
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root using the provided example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update the environment variables with your own credentials.

Required configuration includes:

- MongoDB connection URI.
- MongoDB database name.
- JWT authentication secret.

Optional integrations include:

- Gemini API key.
- Stripe test credentials.
- Razorpay credentials.
- SMTP email credentials.
- Google OAuth client ID.

**Important:** Never upload your actual `.env` file or expose private API keys, database credentials or authentication secrets.

### 5. Start the Main Application

```bash
npm run dev:main
```

The customer and vendor application runs at:

`http://localhost:3000`

### 6. Start the Admin Portal

Open another terminal in the project directory:

```bash
npm run dev:admin
```

The separate local admin portal runs at:

`http://localhost:3001`

Alternatively, use the combined development command if configured:

```bash
npm run dev
```

## Booking Workflow

1. Customers browse approved event services.
2. Customers select a service and click Reserve.
3. The reservation modal displays the selected service, date, available time slots and customer details.
4. The backend checks existing active bookings.
5. The booking API revalidates availability before creating a reservation.
6. MongoDB unique-index protection helps prevent concurrent double-booking.
7. Vendors receive booking requests through their portal.
8. Vendors can accept, decline or complete bookings.

## Vendor Verification Workflow

1. Vendors register on EventSphere.
2. Vendors create their service listings.
3. New services are initially marked as pending.
4. Administrators review submitted services.
5. Approved services become visible in the customer marketplace.
6. Rejected services remain unavailable for customer discovery.

## Payment Integration

EventSphere includes Stripe-hosted Checkout for payment processing.

### Stripe Configuration

Configure the following values in your private `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_MODE=test
STRIPE_CURRENCY=inr
STRIPE_ADVANCE_PERCENT=20
APP_BASE_URL=http://localhost:3000
```

### Stripe Webhook Setup

For local testing, install the Stripe CLI and authenticate:

```bash
stripe login
```

Start the webhook listener:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the webhook signing secret into your `.env` file.

Use Stripe test credentials and test payment methods during development.

**Note:** Razorpay configuration is included for payment integration review. Verify its implementation and payment flow separately before enabling it in production. Refund handling and production payment hardening also require verification.

## Deployment

EventSphere supports deployment through Render using the included `render.yaml` configuration.

### Deployment Steps

1. Push the project to GitHub.
2. Create a new Blueprint in Render using the repository.
3. Configure the required environment variables in Render.
4. Set MongoDB Atlas connection details.
5. Configure Google OAuth authorized origins.
6. Configure SMTP credentials for email notifications.
7. Configure Stripe test credentials and the production webhook endpoint.
8. Deploy the application.
9. Test customer authentication, vendor verification, booking and payment workflows.

The deployed application serves the customer/vendor interface and admin interface from the same public host.

**Production note:** Complete security, payment, email and deployment verification before using the application for real customer transactions.

## Security Considerations

- Environment variables are stored outside source control.
- JWT secrets must use strong, randomly generated values.
- Passwords and authentication credentials must be protected.
- Payment verification is handled on the backend.
- Stripe webhook signatures are validated.
- Booking availability is rechecked by the backend.
- Vendor services require administrator approval before marketplace publication.

## Future Enhancements

Potential improvements for future releases include:

- Advanced vendor analytics and earnings dashboard.
- AI-powered event planning assistant.
- Advanced marketplace recommendations.
- Customer reviews and ratings.
- Comprehensive refund management.
- Advanced admin reporting and analytics.
- Enhanced notification and communication system.

## Author

**Mruthunjay V Patil**

Computer Science & Engineering Student | Full Stack Developer

- GitHub: [@Mruthunjay-Patil](https://github.com/Mruthunjay-Patil)
- LinkedIn: [Connect with me](https://www.linkedin.com/in/Mruthunjay-Patil/)

## License

This project is currently provided for educational and portfolio purposes. Add an appropriate open-source license before granting others permission to reuse or distribute the code.

---

<p align="center">
  <strong>EventSphere — Discover the Perfect Services. Create Unforgettable Events.</strong>
</p>
