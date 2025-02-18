import axios from 'axios';
import { showAlert } from './alerts';

export const resetPassword = async (password, passwordConfirm, token) => {
  try {
    const response = await axios({
      url: `/api/v1/users/resetPassword/${token}`,
      method: 'PATCH',
      data: { password, passwordConfirm },
    });

    showAlert('success', 'Password reset successfully');

    setTimeout(() => {
      location.assign('/');
    }, 1000);
  } catch (err) {
    console.log(err.response.data.message);
    showAlert('error', err.response.data.message);
  }
};
