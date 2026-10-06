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
import InfoPage from './pages/InfoPage';

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

const protectedRoutes = [
  ['/hub', <HubSelection key="hub" />],
  ['/dashboard', <Dashboard key="dash" />],
  ['/digital-dashboard', <DigitalDashboard key="digital" />],
  ['/sell', <SellPage key="sell" />],
  ['/sell/:id', <SellPage key="sell-edit" />],
  ['/item/:id', <ItemDetailPage key="item" />],
  ['/lending-dashboard', <LendingDashboard key="lending" />],
  ['/borrow/:id', <BorrowWorkflowPage key="borrow" />],
  ['/handoff/:id', <BorrowWorkflowPage key="handoff" />],
  ['/messages', <MessagesPage key="messages" />],
  ['/messages/:userId', <MessagesPage key="messages-user" />],
  ['/profile', <ProfilePage key="profile" />]
];

const infoPages = ['help', 'safety', 'contact', 'faq', 'privacy', 'terms', 'cookies'];

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {infoPages.map((page) => (
        <Route key={page} path={`/${page}`} element={<InfoPage page={page} />} />
      ))}

      {protectedRoutes.map(([path, element]) => (
        <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
      ))}

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<InfoPage page="notfound" />} />
    </Routes>
  );
}

export default App;
