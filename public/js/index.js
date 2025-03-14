import '@babel/polyfill'; // make some of the newer javascript features work in older browswers as well
import { displayMap } from './leaflet';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { signup } from './signup';
import { bookTour } from './stripe';
import { showAlert } from './alerts';
import { addReview } from './review';
import { forgotPassword } from './forgotPassword';
import { resetPassword } from './resetPassword';

// DOM ELEMENTS
const leaflet = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const signupForm = document.querySelector('.form--signup');
const forgotPasswordForm = document.querySelector('.form--forgot-password');
const resetPasswordForm = document.querySelector('.form--reset-password');
const bookBtn = document.getElementById('book-tour');
const overlay = document.querySelector('.overlay');
const reviewAdd = document.querySelector('.reviews__add');

// DELEGATION
if (leaflet) {
  const locations = JSON.parse(leaflet.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm) {
  const photoInput = document.getElementById('photo');
  const photoPreview = document.getElementById('photoPreview');

  photoInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = function (e) {
        photoPreview.src = e.target.result;
      };

      reader.readAsDataURL(file);
    }
  });

  userDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    const btn = document.getElementById('save-settings');
    btn.textContent = 'Updating...';

    await updateSettings(form, 'data');

    btn.textContent = 'Save settings';
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password',
    );

    document.getElementById('save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const btn = document.getElementById('send-email');

    btn.textContent = 'Sending email...';

    await forgotPassword(email);

    btn.textContent = 'Send email';
  });
}

if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    const { token, email } = document.getElementById('save-password').dataset;

    const btn = document.getElementById('save-password');
    btn.textContent = 'Saving...';

    await resetPassword(password, passwordConfirm, token, email);

    btn.textContent = 'Save password';
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // document.querySelector('.btn--signup').textContent =
    //   'Creating your account...';

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    const btn = document.getElementById('sign-up');
    btn.textContent = 'Signing up...';
    await signup({ name, email, password, passwordConfirm });
    btn.textContent = 'Sign up';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    document.querySelector('.overlay').style.display = 'flex';
    document.querySelector('.cancel').addEventListener('click', () => {
      document.querySelector('.overlay').style.display = 'none';
    });
  });
}

if (overlay) {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) {
      this.style.display = 'none';
    }
  });

  const dateButtons = document.querySelectorAll('.date');
  dateButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      const btnDate = e.target.textContent;
      e.target.textContent = 'Processing...';
      const { tourId, startDate } = e.target.dataset;
      await bookTour(tourId, startDate);
      e.target.textContent = btnDate;
    });
  });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);

if (reviewAdd) {
  const stars = reviewAdd.querySelectorAll('.reviews__star');
  const reviewText = document.getElementById('reviews__input');
  const submitButton = document.getElementById('submit-review');
  const tourId = reviewAdd.querySelector('.tour-id').value;

  let selectedRating = 0;

  stars.forEach((star) => {
    star.addEventListener('mouseover', function () {
      const value = this.getAttribute('data-value');
      highlightStars(value);
    });

    star.addEventListener('mouseout', function () {
      highlightStars(selectedRating);
    });

    star.addEventListener('click', function () {
      selectedRating = this.getAttribute('data-value');
      highlightStars(selectedRating);
    });
  });

  function highlightStars(value) {
    stars.forEach((star) => {
      if (star.getAttribute('data-value') <= value)
        star.classList.replace(
          'reviews__star--inactive',
          'reviews__star--active',
        );
      else
        star.classList.replace(
          'reviews__star--active',
          'reviews__star--inactive',
        );
    });
  }

  submitButton.addEventListener('click', function () {
    const review = reviewText.value.trim();

    if (selectedRating === 0) {
      showAlert('error', 'Please select a rating before submitting.');
      return;
    }

    if (review === '') {
      showAlert('error', 'Please write a review before submitting.');
      return;
    }

    addReview(selectedRating, review, tourId);
  });
}
