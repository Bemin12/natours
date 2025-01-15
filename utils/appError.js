class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // new Error('message')
    // remember also, by calling the parent constructor, we already set the message property to our incoming message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // The class used to create operational errors

    // capture the stack trace
    // this way, when a new object is created, and a constructor function is called, then that function call is not gonna appear in the stack trace, and will not pollute it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
