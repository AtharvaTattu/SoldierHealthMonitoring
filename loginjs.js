document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://e360j7mwl2.execute-api.us-east-1.amazonaws.com/deploy/login', { // Replace with your API Gateway URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                Username: username,
                Password: password,
            }),
        });

        if (response.ok) {
            const data = await response.json();

            if (data.message === 'Login successful') {
                // alert('Login successful');
                window.location.href = 'dashboard.html'; // Redirect to the dashboard or home page
            } else {
                showError(data.message || 'Invalid USER');
            }
        } else {
            const error = await response.json();
            showError(error.error || 'An error occurred. Please try again.');
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Failed to connect to the server. Please try again later.');
    }
});

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}