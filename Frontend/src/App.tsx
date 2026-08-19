import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RequestDetails from './pages/RequestDetails';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/request/:id" element={<RequestDetails />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/request/:id" element={<RequestDetails />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
