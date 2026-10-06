// client/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import './RegisterPage.css';
import './AuthShared.css';

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '', email: '', college: '', major: '', graduationYear: '', password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', formData);
      // Email verification is disabled for now, so go straight to login.
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setGoogleLoading(true);

    try {
      if (!credentialResponse?.credential) {
        throw new Error('Google did not return a credential.');
      }
      const response = await api.post('/auth/google', {
        credential: credentialResponse.credential
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/hub');
    } catch (err) {
      console.error('Google sign-up error:', err);
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-left">
        <div className="register-brand">
          <h1><Link to="/" className="auth-home-link">🔗 We Share</Link></h1>
          <h2>Empowering students through collaboration.</h2>
          <p>Join thousands of students trading lab equipment, textbooks, and research materials.</p>
        </div>
      </div>

      <div className="register-right">
        <div className="register-form-box">
          <h2>Create your account</h2>
          <p className="register-subtitle">Join the city-wide network of academic resource sharing.</p>

          {error && <div className="register-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <input id="reg-name" type="text" name="fullName" placeholder="Enter your full name"
                value={formData.fullName} onChange={handleChange} autoComplete="name" required />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Gmail</label>
              <input id="reg-email" type="email" name="email" placeholder="yourname@gmail.com"
                value={formData.email} onChange={handleChange} autoComplete="email" required />
            </div>

            <div className="form-group">
              <label htmlFor="reg-college">College / University</label>
              <input id="reg-college" type="text" name="college" placeholder="Search your college..."
                value={formData.college} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-major">Major / Field of Study</label>
                <input id="reg-major" type="text" name="major" placeholder="e.g. Biology"
                  value={formData.major} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="reg-year">Graduation Year</label>
                <select id="reg-year" name="graduationYear" value={formData.graduationYear} onChange={handleChange}>
                  <option value="">Select year</option>
                  {[2025, 2026, 2027, 2028].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Create Password</label>
              <div className="password-input-wrap">
                <input id="reg-password" type={showPassword ? 'text' : 'password'} name="password"
                  placeholder="Minimum 8 characters" value={formData.password}
                  onChange={handleChange} autoComplete="new-password" required minLength={8} />
                <button type="button" className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-register" disabled={loading || googleLoading}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <div className="google-signup">
            <div className="or-divider"><span>or</span></div>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-up failed. Please try again.')}
                useOneTap={false}
              />
            ) : (
              <p>Google Sign-Up is currently unavailable.</p>
            )}

            {googleLoading && <p>Signing up with Google...</p>}
          </div>

          <p className="login-link">
            Already have an account? <Link to="/login">Log In</Link>
          </p>

          <p className="terms-text">
            By signing up, you agree to our <Link to="/terms">Terms of Service</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
