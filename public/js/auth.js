/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

// Your Trello Power-Up App Key (Can be overridden in settings or config)
const TRELLO_APP_KEY = 'YOUR_TRELLO_API_KEY';

const authUnauthDiv = document.getElementById('auth-unauthorized');
const authAuthDiv = document.getElementById('auth-authorized');
const btnAuthorize = document.getElementById('btn-authorize');
const btnDeauthorize = document.getElementById('btn-deauthorize');

t.render(function () {
  return t.get('member', 'private', 'token')
    .then(function (token) {
      if (token) {
        authUnauthDiv.style.display = 'none';
        authAuthDiv.style.display = 'flex';
      } else {
        authUnauthDiv.style.display = 'flex';
        authAuthDiv.style.display = 'none';
      }
    })
    .then(function () {
      return t.sizeTo('.settings-container');
    });
});

btnAuthorize.addEventListener('click', function () {
  // Construct Trello OAuth 1.0 token URL
  const authUrl = `https://trello.com/1/authorize?expiration=never&name=Gallery+Viewer&scope=read&response_type=token&key=${TRELLO_APP_KEY}&return_url=${encodeURIComponent(window.location.origin + '/views/auth-success.html')}`;

  return t.authorize(authUrl, {
    height: 680,
    width: 580,
    validToken: function (token) {
      return typeof token === 'string' && token.length > 0;
    }
  })
  .then(function (token) {
    return t.set('member', 'private', 'token', token);
  })
  .then(function () {
    return t.closePopup();
  })
  .catch(TrelloPowerUp.restApiError.AuthDeniedError, function () {
    // User cancelled authorization
  });
});

btnDeauthorize.addEventListener('click', function () {
  return t.set('member', 'private', 'token', null)
    .then(function () {
      authUnauthDiv.style.display = 'flex';
      authAuthDiv.style.display = 'none';
    });
});
