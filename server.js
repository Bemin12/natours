const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Uncaught Exceptions: all errors/bugs that occur in our synchronouse code but are not handled anywhere
process.on('uncaughtException', (err) => {
  console.log('UNHANDLER REJECTION! Shutting down...');
  console.log(err.name, err.message);

  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

// Handling Unhandled Rejections which are errors outside Express
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLER REJECTION! Shutting down...');
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});
