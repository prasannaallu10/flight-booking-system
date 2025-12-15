import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // 🔹 Added for navigation
import "./Home.css"; 

const Home = () => {
  const [flights, setFlights] = useState([]);
  const [cities, setCities] = useState([]);

  const [tempSearch, setTempSearch] = useState({
    source: "",
    destination: "",
  });

  const [appliedSearch, setAppliedSearch] = useState({
    source: "",
    destination: "",
  });

  // 🔥 surge timer state
  const [now, setNow] = useState(Date.now());

  // 🔹 preserve ongoing surge timers
  const surgeMapRef = useRef({});

  const navigate = useNavigate(); // 🔹 Added

  // ⏱ update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        // 🔹 CHANGE HERE: use your laptop LAN IP for mobile access
        // 🔹 For local browser use: localhost
        const res = await axios.get("http://localhost:5000/flights");
        // 🔹 For mobile, uncomment and use your PC LAN IP:
        // const res = await axios.get("http://192.168.13.77:5000/flights");

        // 🔥 ADD SURGE (frontend simulation only) & preserve timers
        const flightsWithSurge = res.data.map((flight) => {
          // reuse previous timer if exists
          let surgeEndsAt = surgeMapRef.current[flight.flight_id];

          const isSurge = surgeEndsAt
            ? true
            : Math.random() < 0.3; // 30% chance new surge

          if (isSurge && !surgeEndsAt) {
            const surgeDuration = 2 * 60 * 1000; // 2 mins
            surgeEndsAt = Date.now() + surgeDuration;
            surgeMapRef.current[flight.flight_id] = surgeEndsAt;
          }

          // remove timer if expired
          if (surgeEndsAt && surgeEndsAt < Date.now()) {
            surgeMapRef.current[flight.flight_id] = null;
            surgeEndsAt = null;
          }

          return {
            ...flight,
            isSurge: !!surgeEndsAt,
            surgeEndsAt,
          };
        });

        setFlights(flightsWithSurge);

        // 🔹 city autofill
        const citySet = new Set();
        res.data.forEach((f) => {
          citySet.add(f.departure_city);
          citySet.add(f.arrival_city);
        });
        setCities([...citySet]);
      } catch (err) {
        console.error("Error fetching flights:", err);
      }
    };

    fetchFlights();

    const interval = setInterval(fetchFlights, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredFlights = flights.filter(
    (f) =>
      f.departure_city
        .toLowerCase()
        .includes(appliedSearch.source.toLowerCase()) &&
      f.arrival_city
        .toLowerCase()
        .includes(appliedSearch.destination.toLowerCase())
  );

  const handleSearch = () => {
    setAppliedSearch(tempSearch);
  };

  // ⏳ timer formatter
  const formatTime = (ms) => {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 🔹 FIXED: handle booking using navigation to Booking.jsx
  const handleBook = (flight) => {
    navigate(`/booking/${flight.flight_id}`); // ✅ Navigate to Booking page
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1
        style={{
          textAlign: "center",
          fontSize: "36px",
          marginBottom: "10px",
          color: "#222",
        }}
      >
        Your next adventure is just a click away
      </h1>

      <p style={{ textAlign: "center", marginBottom: "40px", color: "#666" }}>
        Search, compare, and book flights easily
      </p>

      {/* 🔍 Search Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          list="cityList"
          placeholder="Departure City"
          value={tempSearch.source}
          onChange={(e) =>
            setTempSearch({ ...tempSearch, source: e.target.value })
          }
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="text"
          list="cityList"
          placeholder="Arrival City"
          value={tempSearch.destination}
          onChange={(e) =>
            setTempSearch({ ...tempSearch, destination: e.target.value })
          }
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={handleSearch}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "5px",
            backgroundColor: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

      {/* 🔽 Autofill */}
      <datalist id="cityList">
        {cities.map((city, index) => (
          <option key={index} value={city} />
        ))}
      </datalist>

      {/* ✈️ Flights Table */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}
      >
        <thead style={{ backgroundColor: "#f4f6f8" }}>
          <tr>
            <th style={thStyle}>Flight ID</th>
            <th style={thStyle}>Airline</th>
            <th style={thStyle}>From</th>
            <th style={thStyle}>To</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredFlights.length > 0 ? (
            filteredFlights.map((flight, index) => (
              <tr
                key={flight.flight_id}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                }}
              >
                <td style={tdStyle}>{flight.flight_id}</td>
                <td style={tdStyle}>{flight.airline}</td>
                <td style={tdStyle}>{flight.departure_city}</td>
                <td style={tdStyle}>{flight.arrival_city}</td>
                <td style={tdStyle}>
                  {flight.departure_time} - {flight.arrival_time}
                </td>

                <td style={tdStyle}>
                  ₹
                  {flight.isSurge && flight.surgeEndsAt > now
                    ? Math.round(flight.current_price * 1.3)
                    : flight.current_price}

                  {flight.isSurge && flight.surgeEndsAt > now && (
                    <div style={{ fontSize: "12px", color: "red" }}>
                      🔥 Surge · Ends in {formatTime(flight.surgeEndsAt - now)}
                    </div>
                  )}
                </td>

                <td style={tdStyle}>
                  <button
                    onClick={() => handleBook(flight)} // ✅ Fixed navigation
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      borderRadius: "5px",
                      backgroundColor: "#1a73e8",
                      color: "#fff",
                      cursor: "pointer",
                      display: "inline-block",
                      textDecoration: "none",
                      textAlign: "center",
                    }}
                  >
                    Book
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                No flights found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "600",
  borderBottom: "2px solid #ddd",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};

export default Home;
