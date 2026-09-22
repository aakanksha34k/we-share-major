// client/src/pages/RegisterPage.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import './RegisterPage.css';

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    college: '',
    major: '',
    graduationYear: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | INPUT CHANGE
  |--------------------------------------------------------------------------
  */

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /*
  |--------------------------------------------------------------------------
  | NORMAL REGISTER
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await api.post(
        '/auth/register',
        formData
      );

      /*
       * Email verification is disabled for now.
       * After registration, send the user directly
       * to the login page.
       */
      navigate('/login');
    } catch (err) {
      console.error(
        'Registration error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GOOGLE SIGN UP
  |--------------------------------------------------------------------------
  */

  const handleGoogleSuccess = async (
    credentialResponse
  ) => {
    setError('');
    setGoogleLoading(true);

    try {
      if (!credentialResponse?.credential) {
        throw new Error(
          'Google did not return a credential.'
        );
      }

      const response = await api.post(
        '/auth/google',
        {
          credential:
            credentialResponse.credential
        }
      );

      localStorage.setItem(
        'token',
        response.data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(
          response.data.user
        )
      );

      navigate('/hub');
    } catch (err) {
      console.error(
        'Google sign-up error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Google sign-up failed. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="register-page">

      {/* LEFT PANEL */}
      <div className="register-left">

        <div className="register-brand">

          <h1>
            🔗 We Share
          </h1>

          <h2>
            Empowering students through
            collaboration.
          </h2>

          <p>
            Join thousands of students trading
            lab equipment, textbooks, and
            research materials.
          </p>

        </div>

      </div>

      {/* RIGHT PANEL */}
      <div className="register-right">

        <div className="register-form-box">

          <h2>
            Create your account
          </h2>

          <p className="register-subtitle">
            Join the city-wide network of
            academic resource sharing.
          </p>

          {/* ERROR */}
          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          {/* REGISTER FORM */}
          <form onSubmit={handleSubmit}>

            {/* FULL NAME */}
            <div className="form-group">

              <label>
                Full Name
              </label>

              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />

            </div>

            {/* GMAIL */}
            <div className="form-group">

              <label>
                Gmail
              </label>

              <input
                type="email"
                name="email"
                placeholder="yourname@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

            </div>

            {/* COLLEGE */}
            <div className="form-group">

              <label>
                College / University
              </label>

              <input
                type="text"
                name="college"
                placeholder="Search your college..."
                value={formData.college}
                onChange={handleChange}
              />

            </div>

            {/* MAJOR + GRADUATION */}
            <div className="form-row">

              <div className="form-group">

                <label>
                  Major / Field of Study
                </label>

                <input
                  type="text"
                  name="major"
                  placeholder="e.g. Biology"
                  value={formData.major}
                  onChange={handleChange}
                />

              </div>

              <div className="form-group">

                <label>
                  Graduation Year
                </label>

                <select
                  name="graduationYear"
                  value={
                    formData.graduationYear
                  }
                  onChange={handleChange}
                >

                  <option value="">
                    Select year
                  </option>

                  <option value="2025">
                    2025
                  </option>

                  <option value="2026">
                    2026
                  </option>

                  <option value="2027">
                    2027
                  </option>

                  <option value="2028">
                    2028
                  </option>

                </select>

              </div>

            </div>

            {/* PASSWORD */}
            <div className="form-group">

              <label>
                Create Password
              </label>

              <div className="password-input-wrap">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>

              </div>

            </div>

            {/* REGISTER BUTTON */}
            <button
              type="submit"
              className="btn-register"
              disabled={
                loading ||
                googleLoading
              }
            >
              {loading
                ? 'Creating Account...'
                : 'Create Account →'}
            </button>

          </form>

          {/* GOOGLE SIGN UP */}
          <div className="google-signup">

            <div className="or-divider">
              <span>
                or
              </span>
            </div>

            {import.meta.env
              .VITE_GOOGLE_CLIENT_ID && (
              <GoogleLogin
                onSuccess={
                  handleGoogleSuccess
                }
                onError={() =>
                  setError(
                    'Google sign-up failed. Please try again.'
                  )
                }
                useOneTap={false}
              />
            )}

            {!import.meta.env
              .VITE_GOOGLE_CLIENT_ID && (
              <p>
                Google Sign-Up is currently
                unavailable.
              </p>
            )}

            {googleLoading && (
              <p>
                Signing up with Google...
              </p>
            )}

          </div>

          {/* LOGIN LINK */}
          <p className="login-link">

            Already have an account?{' '}

            <Link to="/login">
              Log In
            </Link>

          </p>

          {/* TERMS */}
          <p className="terms-text">

            By signing up, you agree to our
            Terms of Service and Privacy Policy.

          </p>

        </div>

      </div>

    </div>
  );
}

export default RegisterPage;