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
	npm install express mongoose bcryptjs body-parser cors dotenv multer
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

10. **File uploads**
- The backend supports uploading datasheets and images for programs and work years. Endpoints:
	- POST /programs/:id/datasheets (field name: datasheets) - accepts multiple files
	- POST /programs/:id/images (field name: images) - accepts multiple files
	- POST /workyears/:id/datasheets (field name: datasheets) - accepts multiple files
	- POST /workyears/:id/images (field name: images) - accepts multiple files

	Files are stored in MongoDB using GridFS (Atlas if your MONGO_URI points to Atlas). The API exposes file downloads at `/files/:id` — stored documents (programs/workYears) keep metadata with `url` values pointing to `/files/<fileId>`.

11. **Notes**
- If you use MongoDB Atlas, set `MONGO_URI` in `.env` to your Atlas connection string (including db name). Ensure network access is allowed for your IP or set to allow access from anywhere during development.

## Usage

- **Register:** Send POST request to `/auth/register` with JSON body `{ "username": "yourUsername", "password": "yourPassword" }`
- **Login:** Send POST request to `/auth/login` with JSON body `{ "username": "yourUsername", "password": "yourPassword" }`

## Notes
- Passwords are hashed before storing in the database.
- All user data is stored in MongoDB as documents.
- Environment variables are managed in `.env`.

---
This backend is ready for further expansion
