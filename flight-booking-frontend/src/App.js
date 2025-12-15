import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Booking from "./components/Booking";
import Bookings from "./components/Bookings";
import Login from "./components/Login";
import Register from "./components/Register";

// Protected Route component
const ProtectedRoute = ({ user, children }) => {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null); // store logged-in user

  return (
    <Router>
      <Navbar user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/booking/:flightId"
          element={
            <ProtectedRoute user={user}>
              <Booking user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute user={user}>
              <Bookings user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={<Login onLogin={(user) => setUser(user)} />}
        />
        <Route
          path="/register"
          element={<Register onRegister={(user) => setUser(user)} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
