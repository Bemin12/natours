import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51QgmydG7jrOX7nxh8iqjIOpG04rqdF2dQ79Bm1c3bJINCEXMK9Eka2a72HiC9goG6R3tCEeBtzIjDLhCCoZnp8rG00cSOWheaX',
); // the object that we get from the script that we included in tour.pug | Stripe(public key)

export const bookTour = async (tourId, startDate, button, textContent) => {
  try {
    console.log(startDate);
    // 1) Get checkout session from API
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}/${new Date(startDate).toISOString()}`,
    );
    // console.log(session);
    button.textContent = textContent;

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    // refreshing token without reloading the page
    if (err.response && err.response.status === 401) {
      // Token expired, try to refresh the token
      try {
        await axios.get('/api/v1/users/refresh');
        // Retry the original request
        const session = await axios(
          `/api/v1/bookings/checkout-session/${tourId}/${new Date(startDate).toISOString()}`,
        );
        button.textContent = textContent;

        await stripe.redirectToCheckout({
          sessionId: session.data.session.id,
        });
      } catch (refreshErr) {
        button.textContent = textContent;
        console.log(refreshErr);
        // showAlert('error', refreshErr.response.data.message);
        showAlert('error', 'Please login again');
      }
    } else {
      button.textContent = textContent;
      console.log(err);
      showAlert('error', err.response.data.message);
    }
  }
};
