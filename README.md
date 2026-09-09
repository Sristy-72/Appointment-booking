# Appointment Booking System

This is a simple full-stack appointment booking project. It lets patients choose a doctor, select an available time, and book an appointment. It also has an admin page where appointments can be checked and updated.

Backend Server on Render :- https://appointment-booking-ghdk.onrender.com/  

Frontend Server On Render :-- https://appointment-booking-1-dfl7.onrender.com/

## What this project can do

- Show available doctors and their specializations
- Show available time slots for a selected doctor and date
- Book an appointment with name, email, date, time, and reason
- Create a unique appointment ID for every booking
- Let users find their appointments using their email address
- Let users cancel pending or confirmed appointments
- Let admins view all appointments
- Let admins filter appointments by date, status, or doctor
- Let admins update appointment status
- 

## Screenshots

<img width="1892" height="915" alt="image" src="https://github.com/user-attachments/assets/ec1f9168-48f9-4b15-9b2a-b20395452e59" />
<img width="1907" height="902" alt="image" src="https://github.com/user-attachments/assets/8745da54-630d-4ec3-96ac-3c4c2d157de4" />
<img width="1857" height="911" alt="image" src="https://github.com/user-attachments/assets/24463f7e-a783-4592-ad9a-207b739e76ba" />



## Project folders

```text
client/   React and Vite frontend
server/   Express and MongoDB backend
```

## Tools used

- React
- Vite
- Node.js
- Express
- MongoDB
- Mongoose

## Run the project on your computer

You need Node.js and MongoDB before starting the project.

### 1. Set up the backend

Open a terminal in the `server` folder and install packages:

```bash
npm install
```

Create a file called `.env` inside the `server` folder:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

Start the backend:

```bash
npm start
```

The backend runs at `http://localhost:3000`.

The first time the backend connects to an empty database, it automatically adds the default doctors.

### 2. Set up the frontend

Open another terminal in the `client` folder and install packages:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the local address shown by Vite. It is usually `http://localhost:5173`.

## Appointment status

An appointment can have one of these statuses:

- Pending
- Confirmed
- Completed
- Cancelled

When a user cancels an appointment, its status changes to `Cancelled`. That time slot becomes available for another booking.




