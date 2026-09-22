// client/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  // Update form fields as user types
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post(
        '/auth/register',
        formData
      );

      navigate(`/login?verified=false&email=${encodeURIComponent(response.data.email)}`);

    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      {/* Left Panel */}
      <div className="register-left">
        <div className="register-brand">
          <h1>🔗 We Share</h1>
          <h2>Empowering students through collaboration.</h2>
          <p>Join thousands of students trading lab equipment, textbooks, and research materials.</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="register-right">
        <div className="register-form-box">
          <h2>Create your account</h2>
          <p className="register-subtitle">Join the city-wide network of academic resource sharing.</p>

          {/* Error message */}
          {error && <div className="register-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Gmail</label>
              <input
                type="email"
                name="email"
                placeholder="yourname@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>College / University</label>
              <input
                type="text"
                name="college"
                placeholder="Search your college..."
                value={formData.college}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Major / Field of Study</label>
                <input
                  type="text"
                  name="major"
                  placeholder="e.g. Biology"
                  value={formData.major}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Graduation Year</label>
                <select
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleChange}
                >
                  <option value="">Select year</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Create Password</label>
              <input
                type="password"
                name="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn-register"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <p className="login-link">
            Already have an account? <Link to="/login">Log In</Link>
          </p>

          <p className="terms-text">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;