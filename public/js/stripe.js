import axios from 'axios';
import { showAlert } from './alerts';
// const stripe = Stripe(
//   'pk_test_51QgmydG7jrOX7nxh8iqjIOpG04rqdF2dQ79Bm1c3bJINCEXMK9Eka2a72HiC9goG6R3tCEeBtzIjDLhCCoZnp8rG00cSOWheaX',
// ); // the object that we get from the script that we included in tour.pug | Stripe(public key)

export const bookTour = async (tourId, dateId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}/${dateId}`,
    );

    // 2) Redirect to checkout page
    window.location.assign(session.data.session.url);
  } catch (err) {
    // refreshing token without reloading the page
    if (err.response && err.response.data.message === 'jwt expired') {
      try {
        await axios.get('/api/v1/users/refresh');
        // Retry the original request
        const session = await axios(
          `/api/v1/bookings/checkout-session/${tourId}/${dateId}`,
        );

        window.location.assign(session.data.session.url);
      } catch (refreshErr) {
        showAlert('error', 'Please login again');
      }
    } else {
      showAlert('error', err.response?.data?.message || 'Something went wrong');
    }
  }
};
