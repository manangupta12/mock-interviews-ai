import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InterviewProvider } from './contexts/InterviewContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Interview from './pages/Interview';
import InterviewStats from './pages/InterviewStats';
import PastInterviews from './pages/PastInterviews';
import './App.css';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/interview"
              element={
                <PrivateRoute>
                  <Interview />
                </PrivateRoute>
              }
            />
            <Route
              path="/interview-stats"
              element={
                <PrivateRoute>
                  <InterviewStats />
                </PrivateRoute>
              }
            />
            <Route
              path="/past-interviews"
              element={
                <PrivateRoute>
                  <PastInterviews />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/home" />} />
          </Routes>
        </Router>
      </InterviewProvider>
    </AuthProvider>
  );
}

export default App;

