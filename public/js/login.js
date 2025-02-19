import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login', // relative URL (The API and the website are hosted on the same server (using the same URL))
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');
      setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/logout',
    });

    if (res.data.status === 'success') {
      if (location.pathname === '/me' || location.pathname === '/my-tours')
        return location.assign('/');
      location.reload(true); // true force a reload from the server not from the browser cache
    }
  } catch (error) {
    showAlert('error', 'Error logging out! Try again.');
    console.log(error);
  }
};
