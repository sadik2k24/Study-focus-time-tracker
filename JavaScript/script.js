function switchForm(formName) {
  var track = document.getElementById('auth-track');
  var subtitleText = document.getElementById('auth-subtitle');

  if (!track || !subtitleText) return;

  var isSignup = formName === 'signup';
  track.classList.toggle('is-signup', isSignup);
  subtitleText.textContent = isSignup
    ? 'Create an account to get started.'
    : 'Welcome back! Please enter your details.';
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-auth-switch]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchForm(btn.getAttribute('data-auth-switch'));
    });
  });

  document.querySelectorAll('.auth-card form, .card-container form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
    });
  });
});
