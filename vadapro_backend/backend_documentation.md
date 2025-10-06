npm init -y
npm install express

# VADAPRO Backend Documentation

## Overview
This backend is built with Node.js, Express, and MongoDB (using Mongoose). It provides user authentication (register and login) with secure password hashing.

## Technologies Used
- Node.js
- Express
- MongoDB (with Mongoose)
- bcryptjs (for password hashing)
- dotenv (for environment variables)
- body-parser, cors

## Project Structure

```
vadapro_backend/
  server.js
  .env
  package.json
  routes/
	 auth.js
  controllers/
	 authController.js
  models/
	 userModel.js
  middleware/
	 validateInput.js
```

## Setup Steps

1. **Initialize Node.js project**
	```
	npm init -y
	```

2. **Install dependencies**
	```
	npm install express mongoose bcryptjs body-parser cors dotenv
	```

3. **Create .env file**
	Add your MongoDB connection string:
	```
	MONGO_URI=mongodb://localhost:27017/vadapro
	PORT=3001
	```

4. **Set up MongoDB user model**
	- See `models/userModel.js` for schema definition.

5. **Create authentication controller**
	- Handles register and login logic using MongoDB and bcryptjs.

6. **Create routes**
	- `routes/auth.js` defines `/auth/register` and `/auth/login` endpoints.

7. **Add input validation middleware**
	- Ensures username and password are present and valid.

8. **Connect to MongoDB in server.js**
	- Uses Mongoose to connect using the URI from `.env`.

9. **Run the backend**
	```
	node server.js
	```

## Usage

- **Register:** Send POST request to `/auth/register` with JSON body `{ "username": "yourUsername", "password": "yourPassword" }`
- **Login:** Send POST request to `/auth/login` with JSON body `{ "username": "yourUsername", "password": "yourPassword" }`

## Notes
- Passwords are hashed before storing in the database.
- All user data is stored in MongoDB as documents.
- Environment variables are managed in `.env`.

---
This backend is ready for further expansion, such as JWT authentication, user roles, and more advanced features.