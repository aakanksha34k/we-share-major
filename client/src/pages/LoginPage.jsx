// client/src/pages/LoginPage.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  | FINISH LOGIN
  |--------------------------------------------------------------------------
  */

  const finishLogin = (response) => {
    localStorage.setItem(
      'token',
      response.data.token
    );

    localStorage.setItem(
      'user',
      JSON.stringify(response.data.user)
    );

    navigate('/hub');
  };

  /*
  |--------------------------------------------------------------------------
  | GOOGLE LOGIN
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

      finishLogin(response);
    } catch (err) {
      console.error(
        'Google login error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Google login failed. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NORMAL LOGIN
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await api.post(
        '/auth/login',
        formData
      );

      finishLogin(response);
    } catch (err) {
      console.error(
        'Login error:',
        err
      );

      setError(
        err.response?.data?.message ||
        'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="login-page">

      {/* LEFT PANEL */}
      <div className="login-left">
        <div className="login-brand">

          <h1>🔗 We Share</h1>

          <h2>
            By students, for students.
          </h2>

          <p>
            Connect with peers across the city.
            Trade books, lab gear, and notes
            without the middleman.
          </p>

          <div className="login-stats">
            Join 5,000+ students in the network
          </div>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="login-right">

        <div className="login-form-box">

          <p className="login-tag">
            — STUDENT-ONLY ACCESS
          </p>

          <h2>
            Student Login
          </h2>

          <p className="login-subtitle">
            Log in to access the peer resource
            network.
          </p>

          {/* ERROR */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* NORMAL LOGIN FORM */}
          <form onSubmit={handleSubmit}>

            {/* EMAIL */}
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

            {/* PASSWORD */}
            <div className="form-group">

              <div className="password-label">

                <label>
                  Password
                </label>

                <a
                  href="#"
                  className="forgot-link"
                  onClick={(e) =>
                    e.preventDefault()
                  }
                >
                  Forgot password?
                </a>

              </div>

              <div className="password-input-wrap">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
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

            {/* KEEP LOGGED IN */}
            <div className="form-group keep-logged">

              <input
                type="checkbox"
                id="keepLogged"
              />

              <label htmlFor="keepLogged">
                Keep me logged in
              </label>

            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="btn-login-submit"
              disabled={
                loading ||
                googleLoading
              }
            >
              {loading
                ? 'Logging in...'
                : 'Log In to We Share →'}
            </button>

          </form>

          {/* GOOGLE LOGIN */}
          <div
            style={{
              margin: '18px 0',
              textAlign: 'center'
            }}
          >

            <div
              style={{
                marginBottom: 10
              }}
            >
              or
            </div>

            {import.meta.env
              .VITE_GOOGLE_CLIENT_ID && (
              <GoogleLogin
                onSuccess={
                  handleGoogleSuccess
                }
                onError={() =>
                  setError(
                    'Google login failed. Please try again.'
                  )
                }
                useOneTap={false}
              />
            )}

            {!import.meta.env
              .VITE_GOOGLE_CLIENT_ID && (
              <p>
                Google Sign-In is currently
                unavailable.
              </p>
            )}

            {googleLoading && (
              <p>
                Signing in with Google...
              </p>
            )}

          </div>

          {/* REGISTER */}
          <div className="register-prompt">

            <p>
              Not part of the peer network yet?
            </p>

            <Link to="/register">
              <button
                type="button"
                className="btn-join"
              >
                Join the Student Community
              </button>
            </Link>

          </div>

          {/* FOOTER */}
          <div className="login-footer-links">

            <a
              href="#"
              onClick={(e) =>
                e.preventDefault()
              }
            >
              Community Guidelines
            </a>

            <a
              href="#"
              onClick={(e) =>
                e.preventDefault()
              }
            >
              Privacy Policy
            </a>

            <a
              href="#"
              onClick={(e) =>
                e.preventDefault()
              }
            >
              Student Support
            </a>

          </div>

        </div>

      </div>

    </div>
  );
}

export default LoginPage;