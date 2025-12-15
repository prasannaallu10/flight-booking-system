import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config";  // ✅ import central backend URL

const Booking = ({ user }) => {
  const { flightId } = useParams();
  const navigate = useNavigate();

  const [flight, setFlight] = useState(null);
  const [passengerName, setPassengerName] = useState("");
  const [dob, setDob] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      navigate(`/login`, { state: { from: `/booking/${flightId}` } });
    }
  }, [user, flightId, navigate]);

  // Fetch flight and wallet info
  useEffect(() => {
    const fetchFlightAndWallet = async () => {
      try {
        const flightsRes = await axios.get(`${BACKEND_URL}/flights`);

        const selectedFlight = flightsRes.data.find(
          (f) => String(f.flight_id) === String(flightId)
        );

        if (!selectedFlight) {
          alert("Flight not found!");
          return;
        }

        const walletRes = await axios.get(
          `${BACKEND_URL}/wallet?user_id=${user.id}`
        );

        const walletAmount = Number(walletRes.data.balance);
        const flightPrice = Number(selectedFlight.current_price);

        setWalletBalance(walletAmount);
        setFlight({ ...selectedFlight, current_price: flightPrice });
      } catch (err) {
        console.error(err);
        alert("Error fetching flight or wallet info");
      }
    };

    if (user) fetchFlightAndWallet();
  }, [flightId, user]);

  if (!flight) {
    return <p style={{ textAlign: "center" }}>Loading flight details...</p>;
  }

  const canBook = walletBalance >= flight.current_price;

  const handleConfirmBooking = async () => {
    if (!passengerName || !dob) {
      alert("Please fill all required fields");
      return;
    }

    if (!canBook) {
      alert("Insufficient wallet balance!");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/book`, {
        passenger_name: passengerName,
        flight_id: flight.flight_id,
        dob,
        user_id: user.id,
      });

      alert(
        `✅ Booking Successful!\n\nPNR: ${res.data.pnr}\nAmount Paid: ₹${res.data.amount_paid}\nRemaining Wallet: ₹${res.data.remaining_balance}`
      );

      setWalletBalance((prev) => prev - flight.current_price);
      navigate("/bookings");
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        Confirm Your Booking
      </h2>

      <div style={cardStyle}>
        <p><b>Route:</b> {flight.departure_city} → {flight.arrival_city}</p>
        <p><b>Flight Time:</b> {flight.departure_time} - {flight.arrival_time}</p>
        <p><b>Amount:</b> ₹{flight.current_price}</p>
      </div>

      <div style={walletStyle}>
        <p><b>Wallet Balance:</b> ₹{walletBalance}</p>
        <p><b>Amount to Deduct:</b> ₹{flight.current_price}</p>
        <p>
          <b>Remaining Balance:</b>{" "}
          {canBook ? `₹${walletBalance - flight.current_price}` : "Insufficient Balance"}
        </p>
      </div>

      <input
        type="text"
        placeholder="Passenger Name"
        value={passengerName}
        onChange={(e) => setPassengerName(e.target.value)}
        style={inputStyle}
      />

      <input
        type="text"
        placeholder="dd-mm-yyyy"
        value={dob}
        onFocus={(e) => (e.target.type = "date")}
        onBlur={(e) => (e.target.type = dob ? "date" : "text")}
        onChange={(e) => setDob(e.target.value)}
        style={inputStyle}
      />

      <input
        type="email"
        value={user?.email || ""}
        readOnly
        style={{ ...inputStyle, backgroundColor: "#f0f0f0" }}
      />

      <button
        onClick={handleConfirmBooking}
        disabled={!canBook || loading}
        style={{
          ...buttonStyle,
          backgroundColor: !canBook ? "#ccc" : "#1a73e8",
          cursor: !canBook ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Booking..." : "Confirm Booking"}
      </button>
    </div>
  );
};

const cardStyle = {
  padding: "20px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  marginBottom: "20px",
  backgroundColor: "#fafafa",
};

const walletStyle = {
  padding: "15px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  marginBottom: "20px",
  backgroundColor: "#f1f8ff",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  borderRadius: "5px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
};

export default Booking;
