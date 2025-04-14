# Boost Hotel Management System API

A FastAPI-based backend service for the Boost Hotel Management System, providing CRUD operations for rooms, tickets, and users, along with an AI-powered assistant for natural language queries.

## Features

- CRUD operations for rooms, tickets, and users
- AI-powered assistant using LangChain for natural language queries
- PostgreSQL database integration
- RESTful API endpoints
- Dashboard statistics
- Real-time room status tracking
- Ticket management system
- User management with role-based access

## Prerequisites

- Python 3.8+
- PostgreSQL
- OpenAI API key (for the AI assistant)

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hotel_db
OPENAI_API_KEY=your-openai-api-key
SECRET_KEY=your-secret-key
```

4. Initialize the database:
```bash
python init_db_script.py
```

## Running the Application

1. Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

2. Access the API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Rooms
- GET `/api/rooms` - List all rooms
- GET `/api/rooms/{room_id}` - Get room details
- POST `/api/rooms` - Create a new room
- PUT `/api/rooms/{room_id}` - Update room details
- DELETE `/api/rooms/{room_id}` - Delete a room
- GET `/api/rooms/status/{status}` - Get rooms by status
- GET `/api/rooms/floor/{floor}` - Get rooms by floor
- GET `/api/rooms/priority/{priority}` - Get rooms by cleaning priority

### Tickets
- GET `/api/tickets` - List all tickets
- GET `/api/tickets/{ticket_id}` - Get ticket details
- POST `/api/tickets` - Create a new ticket
- PUT `/api/tickets/{ticket_id}` - Update ticket details
- DELETE `/api/tickets/{ticket_id}` - Delete a ticket
- GET `/api/tickets/room/{room_id}` - Get tickets by room
- GET `/api/tickets/status/{status}` - Get tickets by status
- GET `/api/tickets/user/{user_id}` - Get tickets by user
- GET `/api/tickets/recent` - Get recent tickets

### Users
- GET `/api/users` - List all users
- GET `/api/users/{user_id}` - Get user details
- POST `/api/users` - Create a new user
- PUT `/api/users/{user_id}` - Update user details
- DELETE `/api/users/{user_id}` - Delete a user
- GET `/api/users/role/{role}` - Get users by role
- GET `/api/users/stats/dashboard` - Get dashboard statistics

### Assistant
- POST `/api/assistant/chat` - Chat with the AI assistant
- POST `/api/assistant/execute-query` - Execute a confirmed SQL query

## Frontend Integration

The API is designed to work with the Boost Hotel Management System frontend. The frontend can be found in the `hotel-management-system` directory.

## Development

To contribute to the project:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 