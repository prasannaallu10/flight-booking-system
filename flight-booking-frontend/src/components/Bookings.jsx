import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config"; // ✅ added import for central backend URL

const Bookings = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    if (!user || !user.id) {
      setError("User not logged in");
      setLoading(false);
      return;
    }
    try {
      // ✅ use central BACKEND_URL instead of localhost
      const res = await axios.get(`${BACKEND_URL}/bookings/${user.id}`);
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Error fetching bookings. Check server / LAN IP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]); // refetch if user changes

  const openTicket = (pnr) => {
    // ✅ use central BACKEND_URL
    const ticketUrl = `${BACKEND_URL}/tickets/Ticket_${pnr}.pdf`;
    window.open(ticketUrl, "_blank");
  };

  if (loading) return <p>Loading bookings...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Your Bookings</h2>

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>PNR</th>
            <th>Passenger Name</th>
            <th>Airline</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Amount Paid</th>
            <th>Booking Time</th>
            <th>Ticket</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length > 0 ? (
            bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.pnr}</td>
                <td>{b.passenger_name}</td>
                <td>{b.airline}</td>
                <td>{b.departure_city}</td>
                <td>{b.arrival_city}</td>
                <td>₹{b.amount_paid}</td>
                <td>{new Date(b.booking_time).toLocaleString()}</td>
                <td>
                  <button onClick={() => openTicket(b.pnr)}>View Ticket</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" style={{ textAlign: "center" }}>
                No bookings found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Bookings;
