/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const addReview = async (rating, review, tour) => {
  try {
    await axios({
      url: `/api/v1/tours/${tour}/reviews`,
      method: 'POST',
      data: {
        rating,
        review,
      },
    });

    showAlert('success', 'Review Added!');
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
