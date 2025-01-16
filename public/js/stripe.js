import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51QgmydG7jrOX7nxh8iqjIOpG04rqdF2dQ79Bm1c3bJINCEXMK9Eka2a72HiC9goG6R3tCEeBtzIjDLhCCoZnp8rG00cSOWheaX',
); // the object that we get from the script that we included in tour.pug | Stripe(public key)

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
