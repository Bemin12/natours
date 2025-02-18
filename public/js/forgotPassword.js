import axios from 'axios';
import { showAlert } from './alerts';

export const forgotPassword = async (email) => {
  try {
    const response = await axios({
      url: '/api/v1/users/forgotPassword',
      method: 'POST',
      data: { email },
    });

    showAlert(
      'success',
      'Check your email</br>If an account with that email exists, a password reset link has been sent. Please check your inbox and follow the instructions to reset your password.',
      14,
    );
  } catch (err) {
    console.log(err.response.data.message);
    showAlert('error', err.response.data.message);
  }
};
