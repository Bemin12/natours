/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const addReview = async (rating, review, tour) => {
  const sendRequest = async () => {
    await axios({
      url: `/api/v1/tours/${tour}/reviews`,
      method: 'POST',
      data: {
        rating,
        review,
      },
    });

    showAlert('success', 'Review Added!');

    setTimeout(() => {
      location.reload();
    }, 1000);
  };

  try {
    await sendRequest();
  } catch (err) {
    if (
      err.response &&
      err.response.status === 401 &&
      err.response.data.message !== 'Please verify your email'
    ) {
      try {
        await axios.get('/api/v1/users/refresh');
        await sendRequest();
      } catch (refreshErr) {
        showAlert('error', 'Please login again');
      }
    } else {
      console.log(err);
      showAlert('error', err.response.data.message);
    }
  }
};
