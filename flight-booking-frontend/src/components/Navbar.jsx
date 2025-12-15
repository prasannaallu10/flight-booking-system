import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav
      style={{
        height: "60px",
        backgroundColor: "#1E90FF",
        position: "relative",
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
      }}
    >
      {/* CENTER TITLE */}
      <h2
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          margin: 0,
          color: "white",
        }}
      >
        Flight Booking
      </h2>

      {/* RIGHT LINKS */}
      <div style={{ marginLeft: "auto" }}>
        <Link to="/" style={linkStyle}>
          Home
        </Link>
        <Link to="/bookings" style={linkStyle}>
          View Bookings
        </Link>
      </div>
    </nav>
  );
};

const linkStyle = {
  color: "white",
  marginLeft: "20px",
  textDecoration: "none",
  fontSize: "16px",
};

export default Navbar;
