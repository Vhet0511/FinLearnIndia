import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import UserProfile from './pages/user/UserProfile.jsx';
import Lessons from './pages/user/Lessons.jsx';
import PortfolioAnalysis from './pages/user/PortfolioAnalysis.jsx';
import AdminProfile from './pages/admin/AdminProfile.jsx';
import CreateLesson from './pages/admin/CreateLesson.jsx';
import DraftLessons from './pages/admin/DraftLessons.jsx';
import UploadedLessons from './pages/admin/UploadedLessons.jsx';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/user"
        element={
          <ProtectedRoute role="user">
            <DashboardLayout role="user" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="lessons" element={<Lessons />} />
        <Route path="portfolio" element={<PortfolioAnalysis />} />
        <Route path="*" element={<Navigate to="/user/profile" replace />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="create-lesson" element={<CreateLesson />} />
        <Route path="draft-lessons" element={<DraftLessons />} />
        <Route path="uploaded-lessons" element={<UploadedLessons />} />
        <Route path="*" element={<Navigate to="/admin/profile" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}