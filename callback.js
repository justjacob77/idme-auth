const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const authCode = urlParams.get('code');

if (authCode) {
  // Display the authorization code
  document.body.innerHTML = `<h1>Authorization Code:</h1><p>${authCode}</p>`;

  // Optionally: send this code to your server for token exchange
} else {
  document.body.innerHTML = `<h1>Error: No Authorization Code Found</h1>`;
}
