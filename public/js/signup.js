import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (data) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data,
    });

    if (res.data.status === 'success')
      showAlert(
        'success',
        // 'Account created successfully! Please verify your email.',
        'Please check your email to continue.',
        15,
      );
    // setTimeout(() => {
    //   location.assign('/');
    // }, 1000);
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
