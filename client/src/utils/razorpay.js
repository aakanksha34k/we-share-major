// Loads Razorpay Checkout on demand (so it never has to be hard-coded in index.html).
export const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Could not load Razorpay. Check your internet connection and try again.'));
    document.body.appendChild(script);
  });
