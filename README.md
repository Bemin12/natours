# Natours Application

## Overview

Natours is a web application for booking tours, built using modern technologies such as Node.js, Express, MongoDB, and Mongoose. It provides a platform for users to explore and book various tours, manage their accounts, and leave reviews. The application also includes an administrative interface for managing tours, users, and reviews.

## Features

- **Tours:**

  - **Browse and Book:** Users can explore and book tours with detailed information.
  - **Detailed Information:** Tours include descriptions, itineraries, pricing, and reviews.
  - **Tour Statistics:** Aggregated tour statistics like average ratings and prices are available.
  - **Geospatial Queries:** Find tours within a specified distance of a location.
  - **Monthly Plan:** Get a monthly plan of tours for admin and lead-guides.
  - **Image Management:** Tours have multiple images and a cover image.
  - **Start Dates:** Tours have multiple start dates with participant limits.

- **Users:**

  - **Account Management:** Users can manage their profiles and update their information.
  - **Profile Pictures:** Users can upload and manage their profile pictures.

- **Authentication and Authorization:**

  - **Secure Authentication:** User registration, login, and authentication using JWT (JSON Web Tokens) with refresh tokens.
  - **Email Verification:** Users must verify their email addresses.
  - **Password Management:** Users can update their passwords and reset forgotten passwords.
  - **Role-Based Authorization:** Admin and lead-guide roles have access to specific functionalities.
  - **Protected Routes:** Authentication middleware protects routes.
  - **Rate Limiting:** Login attempts are rate-limited to prevent brute-force attacks.

- **Reviews:**

  - **Submit Reviews and Ratings:** Users can submit reviews and ratings for tours they have experienced.
  - **Nested Routes:** Reviews are implemented as nested routes under tours.
  - **Review Ownership:** Users can only edit or delete their own reviews.
  - **Tour Statistics Update:** Tour statistics (average rating, number of ratings) are updated when reviews are created, updated, or deleted.
  - **Populated Reviews:** Tours are populated with their reviews.
  - **Unique Reviews:** Users can only submit one review per tour.

- **Bookings:**

  - **Booking Management:** Users can book tours.
  - **Checkout Sessions:** Integration with Stripe for secure payment processing.
  - Webhook Integration: Stripe webhooks are used to confirm bookings after successful payments.
  - **Tour Instance Management:** The number of participants for a specific tour date is tracked.
  - **Sold Out Handling:** Tour dates are marked as sold out when the maximum group size is reached.
  - **Booking History:** Users can view their booking history.

## Technologies and Some of Key Packages Used

- **JavaScript:** A high-level, versatile programming language.
- **Node.js:** A JavaScript runtime built on Chrome's V8 JavaScript engine.
- **Express:** A minimal and flexible Node.js web application framework.
- **MongoDB:** A NoSQL document database.
- **Mongoose:** An Object Data Modeling (ODM) library for MongoDB and Node.js.
- **Pug:** A template engine for Node.js.
- **JWT (JSON Web Tokens):** A standard for securely transmitting information between parties as a JSON object.
- **Nodemailer**: Email functionality
- **Multer**: A node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
- **Cloudinary** A powerful media API.
- **Stripe:** A payment processing platform.

## Project Structure

The project follows an MVC (Model-View-Controller) architecture:

- `app.js`: Main application file that sets up the Express server and middleware.
- `server.js`: Starts the server and connects to the database.
- `config.env`: Configuration file for environment variables.
- `controllers/`: Contains the route handler functions for each resource.
  - `tourController.js`: Handles tour-related requests.
  - `userController.js`: Handles user-related requests.
  - `authController.js`: Handles authentication and authorization.
  - `reviewController.js`: Handles review-related requests.
  - `bookingController.js`: Handles booking-related requests.
- `models/`: Defines the data models using Mongoose.
  - `tourModel.js`: Defines the tour model.
  - `userModel.js`: Defines the user model.
  - `reviewModel.js`: Defines the review model.
  - `bookingModel.js`: Defines the booking model.
  - `refreshTokenModel.js`: Defines the refresh token model.
- `routes/`: Defines the API routes.
  - `tourRoutes.js`: Defines tour routes.
  - `userRoutes.js`: Defines user routes.
  - `reviewRoutes.js`: Defines review routes.
  - `bookingRoutes.js`: Defines booking routes.
- `utils/`: Contains utility functions and classes.
  - `apiFeatures.js`: Implements API filtering, sorting, and pagination.
  - `appError.js`: Custom error class for handling application errors.
  - `catchAsync.js`: Utility function for catching asynchronous errors.
  - `email.js`: Handles sending emails.
- `views/`: Contains Pug templates for rendering HTML pages.
  - `base.pug`: Base template for all pages.
  - `error.pug`: Template for error pages.
  - `tour.pug`: Template for tour details page.
  - `overview.pug`: Template for the tour overview page.
  - `login.pug`: Template for the login page.
  - `signup.pug`: Template for the signup page.
  - `account.pug`: Template for the user account page.
  - `email/`: Contains email templates.
- `public/`: Contains static assets such as CSS, JavaScript, and images.
  - `js/`: Contains JavaScript files.
  - `css/`: Contains CSS files.
  - `img/`: Contains images.
- `dev-data/`: Contains seed data for the database.
  - `data/`: Contains JSON files with initial data for tours, users, and reviews.
  - `import-dev-data.js`: Script for importing data into the database.
- `.eslintrc.json`: Configuration file for ESLint, a JavaScript linter.
- `.prettierrc`: Configuration file for Prettier, a code formatter.
- `package.json`: Contains project metadata and dependencies.
- `README.md`: Project documentation.

## Setup Instructions

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/Bemin12/natours.git
    cd natours
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

3.  **Configure environment variables:**

    - Create a file in the root directory.
    - Define the necessary environment variables, such as:

      ```
      NODE_ENV=development
      PORT=3000
      DATABASE=mongodb://localhost:27017/natours -or- <your-atlas-connection-string>
      DATABASE_PASSWORD=<your-database-password>

      JWT_ACCESS_SECRET=<your-access-token-secret>
      JWT_ACCESS_EXPIRES_IN=15m
      JWT_ACCESS_COOKIE_EXPIRES_IN=15
      JWT_REFRESH_SECRET=<your-refresh-token-secret>
      JWT_REFRESH_EXPIRES_IN=7d
      JWT_REFRESH_COOKIE_EXPIRES_IN=7

      EMAIL_USERNAME=<your-mailtrap-username>
      EMAIL_PASSWORD=<your-mailtrap-password>
      EMAIL_HOST=<your-mailtrap-host>
      EMAIL_PORT=587

      SENDGRID_USERNAME=apikey
      SENDGRID_PASSWORD=<your-sendgrid-password>

      STRIPE_SECRET_KEY=<your-stripe-secret-key>
      STRIPE_PUBLIC_KEY=<your-stripe-public-key>
      STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

      CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
      CLOUDINARY_API_KEY=<your-cloudinary-api-key>
      CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
      ```

4.  **Import development data (optional):**

    Disable first pre save hock in `models`/`userModel.js`, then run the following:

    ```sh
    node dev-data/data/import-dev-data.js --import
    ```

    To delete the data:

    ```sh
    node dev-data/data/import-dev-data.js --delete
    ```

    Password for all users is **test1234**

5.  **Start the server:**

    ```sh
    npm start
    ```

    or for development:

    ```sh
    npm run dev
    ```

## Available Scripts

`npm start`: Start production server.

`npm run dev`: Start development server with nodemon.

`npm run start:prod`: Start server in production mode.

`npm run debug`: Start server in debug mode.

`npm run watch:js`: Watch and compile JavaScript files.

## API Documentation

Check out the API documentation [here](https://documenter.getpostman.com/view/33112303/2sAYJ4j1tC)

## Live Demo

Visit the live demo: [Natours](https://natours-puce-eta.vercel.app/)
