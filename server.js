const mongoose = require('mongoose');
const dotenv = require('dotenv');

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

// mongoose.connect(DB).then((con) => {
//   console.log(con.connection);
//   console.log('DB connection successful!');
// });

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

// const testTour = new Tour({
//   name: 'The Park Camper',
//   price: 997,
// });

// testTour
//   .save()
//   .then((doc) => console.log(doc))
//   .catch((err) => console.log('Error 💣', err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

// Handling Unhandled Rejections which are errors outside Express

// Each time that there is unhandled rejection somewhere in our application, the process object will emit an object called unhandled rejection
// and so we can subscribe to that event just like this
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLER REJECTION! Shutting down...');
  console.log(err.name, err.message);
  // if we really have like someproblem with the database connection, then our application is not gonna work, so we can here shut our application
  // process.exit(1); // code 0 stands for success, 1 stands for uncaught exception
  // This is a very abrupt way of ending the program because this will just immediately abort all the requests that are currently still running or pending
  // So we shutdown gracefully, first close the server, only then we shutdown the application

  console.log(err);

  server.close(() => {
    process.exit(1);
  });
});
// any other promise rejection that we might not catch somewhere in the application is handled here

// Uncaught Exceptions: all errors/bugs that occur in our synchronouse code but are not handled anywhere
// process.on('uncaughtException', (err) => {
//   console.log('UNHANDLER REJECTION! Shutting down...');
//   console.log(err.name, err.message);

//   // In unhandled rejections it's optional to crash the application, but when there's uncaught exception, we need to crash our application
//   // because after there was an uncaught exception, then entire node process is in a so-called unclean state
//   server.close(() => {
//     process.exit(1);
//   });
// });
// But errors happen inside middleware function will be sent to the error handling middleware not handled by this
