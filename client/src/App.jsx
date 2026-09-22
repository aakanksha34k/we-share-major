// client/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import StatsBar from './components/StatsBar';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SellPage from './pages/SellPage';
import ItemDetailPage from './pages/ItemDetailPage';
import LendingDashboard from './pages/LendingDashboard';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import HubSelection from './pages/HubSelection';
import DigitalDashboard from './pages/DigitalDashboard';
import VerifyEmailPage from './pages/VerifyEmailPage';
import BorrowWorkflowPage from './pages/BorrowWorkflowPage';

function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <Footer />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/hub" element={
        <ProtectedRoute>
          <HubSelection />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/digital-dashboard" element={
        <ProtectedRoute>
          <DigitalDashboard />
        </ProtectedRoute>
      } />
      <Route path="/sell" element={
        <ProtectedRoute>
          <SellPage />
        </ProtectedRoute>
      } />
      <Route path="/sell/:id" element={
        <ProtectedRoute>
          <SellPage />
        </ProtectedRoute>
      } />
      <Route path="/item/:id" element={
        <ProtectedRoute>
          <ItemDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/lending-dashboard" element={
        <ProtectedRoute>
          <LendingDashboard />
        </ProtectedRoute>
      } />
      <Route path="/borrow/:id" element={
        <ProtectedRoute>
          <BorrowWorkflowPage />
        </ProtectedRoute>
      } />
      <Route path="/handoff/:id" element={
        <ProtectedRoute>
          <BorrowWorkflowPage />
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      } />
      <Route path="/messages/:userId" element={
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
    
  );
}

export default App;