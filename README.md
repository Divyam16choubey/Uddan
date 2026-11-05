# Uddan — Where Ideas Find Wings.

**Uddan** is a crowdfunding platform where people can share their ideas and get support from others who believe in them. The main goal is to help people bring their dreams closer to reality by connecting them with a community that wants to support their journey.

> Every great idea deserves a chance to fly.

---

## About Uddan

Everyone has ideas and dreams, but turning them into reality is not always easy. Sometimes, people have the passion and a good idea but lack the financial support or resources to get started.

This is where **Uddan** comes in.

Uddan aims to make it easier for people to share their ideas and connect with others who are willing to support them. It is being built as a platform where ideas can get the attention, encouragement, and support they need to grow.

The project is developed using modern web technologies, with a focus on a simple user experience, secure login, reliable data storage, and online payment integration.

---

## Features

- **Modern Landing Page:** A clean and attractive homepage that introduces Uddan and explains its purpose.
- **GitHub Login:** Users can sign in to the platform using their GitHub accounts.
- **User Dashboard:** Every logged-in user gets a personal dashboard to manage their profile.
- **Profile Management:** Users can update their name, username, profile picture, and cover picture.
- **Public Profiles:** Every user has a public profile page that can be visited using their unique username.
- **Razorpay Integration:** Razorpay is integrated to support online payments.
- **Responsive Design:** The website is designed to work across different screen sizes with a consistent dark theme.
- **Database Integration:** MongoDB is used to store user and application data.
- **Dynamic Routing:** Next.js App Router is used to create individual profile pages based on usernames.

---

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React.js, Tailwind CSS |
| Backend | Next.js App Router, Node.js |
| Authentication | NextAuth.js, GitHub OAuth |
| Database | MongoDB, Mongoose |
| Payment Gateway | Razorpay |
| Development Tools | Git, GitHub, VS Code, npm |

---

## How It Works

The current application follows a simple user flow:

1. Visitors land on the Uddan homepage and explore the website.
2. Users can sign in using their GitHub accounts.
3. After logging in, users are taken to their personal dashboard.
4. From the dashboard, they can view and update their profile details.
5. Each user gets a public profile page that can be accessed through their username.
6. Razorpay is integrated to handle online payment functionality.

---

## Getting Started

Want to run Uddan on your local machine? Follow these steps.

### Prerequisites

Before getting started, make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Divyam16choubey/Uddan.git
```

### 2. Open the Project Directory

```bash
cd Uddan
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment Variables

Create a `.env.local` file in the root folder of the project.

Add the following variables and replace the placeholder values with your own credentials:

```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/uddan

# GitHub OAuth
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

**A few things to keep in mind:**

- Make sure your local MongoDB server is running.
- Add your GitHub OAuth credentials and configure the correct callback URL.
- Use Razorpay Test Mode credentials while developing.
- Keep your secret keys private and never upload `.env.local` to GitHub.
- Make sure the variable names match the ones used in the application.

### 5. Start the Application

Run the following command:

```bash
npm run dev
```

Once the server starts, open your browser and visit:

```text
http://localhost:3000
```

That's it! Uddan should now be running locally.

---

## Project Structure

Uddan is built using the Next.js App Router. Here is a basic overview of the project structure:

```text
Uddan/
│
├── app/                  # Pages and application routes
│   ├── api/              # API routes
│   ├── [username]/       # Public user profile pages
│   └── ...               # Other application pages
│
├── actions/              # Server-side actions
│
├── components/           # Reusable UI components
│
├── db/                   # Database connection
│
├── models/               # MongoDB models
│
├── public/               # Images and other static files
│
├── .env.local            # Environment variables
├── package.json          # Project dependencies and scripts
└── README.md             # Project documentation
```

---

## Environment & Security

Keeping user information and application data safe is an important part of Uddan.

Some of the key practices followed in the project include:

- Storing sensitive credentials in environment variables.
- Using local MongoDB for database operations.
- Handling user authentication through GitHub OAuth.
- Protecting user-specific actions through authentication.
- Keeping Razorpay secret credentials on the server side.

---

## Repository

**GitHub:** [Divyam16choubey/Uddan](https://github.com/Divyam16choubey/Uddan)

---

## Project Information

| Detail | Description |
|---|---|
| Project Name | Uddan |
| Tagline | Where Ideas Find Wings. |
| Category | Crowdfunding Platform |
| Framework | Next.js |
| Development Status | In Progress |

---

<p align="center">
  <strong>Uddan — Where Ideas Find Wings.</strong>
  <br/>
  Turning possibilities into opportunities.
</p>