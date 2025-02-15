# E-Learning Platform

This is a full-stack e-learning platform built with React for the frontend and Node.js for the backend. The application allows students to browse and enroll in courses, and educators to create and manage courses. Authentication is handled using Clerk, and payments are processed through Stripe.

## Features

### Student Features
- Browse available courses
- View course details
- Enroll in courses
- Watch course videos via an embedded player
- Track enrolled courses

### Educator Features
- Create and manage courses
- View enrolled students
- Access educator dashboard

### General Features
- Authentication via Clerk
- Secure payments using Stripe
- Toast notifications for user feedback
- Interactive rich text editing with Quill.js
- Responsive UI built with Tailwind CSS

## Tech Stack

### Frontend
- React.js
- React Router
- Tailwind CSS
- React Toastify
- Quill.js

### Backend
- Node.js
- Express.js
- Webhooks (Clerk for authentication, Stripe for payments)

## Installation

### Prerequisites
Make sure you have the following installed:
- Node.js (>= 14.x)
- npm or yarn

### Clone the Repository
```sh
git clone https://github.com/your-repo/e-learning-platform.git
cd e-learning-platform
```

### Install Dependencies
#### Client
```sh
cd client
npm install
```

#### Server
```sh
cd server
npm install
```

## Running the Application

### Start the Backend
```sh
cd server
npm start
```

### Start the Frontend
```sh
cd client
npm start
```

## Environment Variables
Create a `.env` file in the server directory and set up the following:
```env
CLERK_SECRET_KEY=your_clerk_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
DATABASE_URL=your_database_url
```

## API Endpoints
### Authentication (via Clerk Webhooks)
- `POST /webhooks/clerk` - Handle authentication events

### Courses
- `GET /api/courses` - Fetch all courses
- `POST /api/courses` - Add a new course (Educator only)
- `GET /api/courses/:id` - Get details of a specific course

### Payments (via Stripe Webhooks)
- `POST /webhooks/stripe` - Handle payment events

## Deployment
The application can be deployed on platforms like Vercel (for frontend) and Render or DigitalOcean (for backend). Ensure environment variables are configured correctly.

## License
This project is licensed under the MIT License.

## Contributors
- Your Name (Yuvraj004)

Feel free to contribute by submitting issues or pull requests!

