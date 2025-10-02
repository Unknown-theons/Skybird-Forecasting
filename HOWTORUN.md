# 🚀 How to Run Skybird Forecasting

This guide will help you set up and test the Skybird Forecasting application on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Package Manager**: npm (comes with Node.js) or pnpm (recommended)

## 🛠️ Setup Instructions

### 1. Clone and Navigate to the Repository

```bash
git clone <repository-url>
cd Skybird-Forecasting
```

### 2. Environment Configuration

Create your environment file from the template:

```bash
# Windows
copy env.example .env

# macOS/Linux
cp env.example .env
```

**Important**: Edit the `.env` file and update the following values:

```env
# Update these values in your .env file:
JWT_SECRET_KEY=your-actual-secret-key-here-minimum-32-characters
VITE_GOOGLE_MAPS_API_KEY=your-actual-google-maps-api-key-here
```

### 3. Install Dependencies

#### Frontend Dependencies (Node.js)

```bash
# Using npm (comes with Node.js)
npm install

# OR using pnpm (recommended - faster)
pnpm install
```

#### Backend Dependencies (Python)

```bash
# Navigate to the API directory
cd api

# Install Python dependencies
pip install -r requirements.txt

# Go back to root directory
cd ..
```

### 4. Database Setup

The application uses SQLite database. The database will be created automatically when you first run the application.

If you need to run database migrations manually:

```bash
cd api
alembic upgrade head
cd ..
```

## 🚀 Running the Application

### Option 1: Frontend Only (Recommended for Development)

```bash
# Start the development server
npm run dev
# OR
pnpm dev
```

The application will be available at: **http://localhost:8080**

### Option 2: Full Stack (Frontend + Backend)

#### Terminal 1 - Start the Backend API:
```bash
cd api
python app.py
```

The API will be available at: **http://localhost:5000**

#### Terminal 2 - Start the Frontend:
```bash
npm run dev
# OR
pnpm dev
```

The frontend will be available at: **http://localhost:8080**

## 🧪 Testing the Application

### 1. Frontend Testing

1. **Open your browser** and navigate to `http://localhost:8080`
2. **Check the homepage** - You should see the Skybird Forecasting interface
3. **Test navigation** - Try clicking through different pages (About, Login, etc.)
4. **Test responsive design** - Resize your browser window

### 2. Backend API Testing

If you're running the full stack, test the API endpoints:

#### Test Demo Endpoint:
```bash
curl http://localhost:5000/api/demo
```

Expected response:
```json
{
  "message": "Hello from Skybird Forecasting API!",
  "status": "success"
}
```

#### Test Authentication Endpoints:
```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword","full_name":"Test User"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

### 3. Database Testing

Check if the database was created:

```bash
# On Windows
dir api\app.db

# On macOS/Linux
ls -la api/app.db
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. "npm: command not found"
- **Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)
- **Verify**: Run `node --version` and `npm --version`

#### 2. "python: command not found"
- **Solution**: Install Python from [python.org](https://python.org/)
- **Verify**: Run `python --version` or `python3 --version`

#### 3. Port Already in Use
- **Error**: `EADDRINUSE: address already in use :::8080`
- **Solution**: 
  ```bash
  # Kill process using port 8080
  npx kill-port 8080
  # OR
  netstat -ano | findstr :8080
  taskkill /PID <PID_NUMBER> /F
  ```

#### 4. Database Connection Issues
- **Solution**: Delete the database file and restart:
  ```bash
  rm api/app.db  # macOS/Linux
  del api\app.db  # Windows
  ```

#### 5. CORS Issues
- **Solution**: Make sure both frontend and backend are running on the correct ports
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:5000

#### 6. Environment Variables Not Loading
- **Solution**: 
  1. Make sure `.env` file exists in the root directory
  2. Restart the development server after changing `.env`
  3. Check that there are no spaces around the `=` in `.env` file

### 7. Google Maps Not Loading
- **Solution**: 
  1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
  2. Enable the Maps JavaScript API
  3. Update `VITE_GOOGLE_MAPS_API_KEY` in your `.env` file

## 📁 Project Structure

```
Skybird-Forecasting/
├── client/                 # React frontend
│   ├── components/         # UI components
│   ├── pages/             # Route pages
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
├── api/                   # Python Flask backend
│   ├── routes/            # API endpoints
│   ├── models/            # Database models
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic
├── shared/                # Shared types
├── public/                # Static assets
└── .env                   # Environment variables
```

## 🎯 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run typecheck    # TypeScript type checking
npm run format.fix   # Format code with Prettier
```

## 🌐 API Endpoints

When the backend is running, these endpoints are available:

- `GET /api/demo` - Demo endpoint
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires authentication)

## 📞 Getting Help

If you encounter issues:

1. **Check the logs** in your terminal for error messages
2. **Verify all dependencies** are installed correctly
3. **Ensure environment variables** are set properly
4. **Check that ports** 8080 and 5000 are available
5. **Restart the development server** after making changes

## 🎉 Success!

If everything is working correctly, you should see:
- ✅ Frontend running on http://localhost:8080
- ✅ Backend API responding to requests
- ✅ Database file created in `api/app.db`
- ✅ No console errors in browser or terminal

Happy coding! 🚀
