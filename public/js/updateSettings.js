import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  const sendRequest = async () => {
    const url =
      type === 'password' ? '/api/v1/users/me/password/' : '/api/v1/users/me';

    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success')
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
  };

  try {
    await sendRequest();
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (err) {
    // refreshing token without reloading the page
    if (
      err.response &&
      err.response.status === 401 &&
      err.response.data.message !== 'Please verify your email' &&
      err.response.data.message !== 'Password is incorrect'
    ) {
      // Token expired, try to refresh the token
      try {
        await axios.get('/api/v1/users/refresh');
        await sendRequest();
        setTimeout(() => {
          location.reload();
        }, 1000);
      } catch (refreshErr) {
        showAlert('error', 'Please login again');
      }
    } else {
      console.log(err);
      showAlert('error', err.response.data.message);
    }
  }
};
