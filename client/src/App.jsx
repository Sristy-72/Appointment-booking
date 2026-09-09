import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "/api";
const statuses = ["Pending", "Confirmed", "Completed", "Cancelled"];

const today = new Date().toISOString().slice(0, 10);

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function providerName(appointment) {
  return appointment.providerId?.name || "Provider unavailable";
}

function StatusBadge({ status }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>{status}</span>
  );
}

async function request(path, options) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Request failed.");
  return payload;
}

export default function App() {
  const [view, setView] = useState("book");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState({ name: "", email: "", reason: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [adminFilters, setAdminFilters] = useState({
    date: "",
    status: "",
    provider: "",
  });
  const [adminAppointments, setAdminAppointments] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    request("/providers")
      .then((data) => setProviders(data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedProvider || !date) {
      setSlots([]);
      return;
    }
    setSelectedSlot("");
    request(`/providers/${selectedProvider._id}/slots?date=${date}`)
      .then((data) => setSlots(data.availableSlots))
      .catch((err) => setError(err.message));
  }, [selectedProvider, date]);

  const selectedProviderDetails = useMemo(
    () => providers.find((provider) => provider._id === selectedProvider?._id),
    [providers, selectedProvider],
  );

  function chooseProvider(provider) {
    setSelectedProvider(provider);
    setNotice("");
    setError("");
  }

  async function submitBooking(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selectedProvider || !selectedSlot) {
      setError("Choose a provider and an available time slot.");
      return;
    }
    setBooking(true);
    try {
      const appointment = await request("/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          providerId: selectedProvider._id,
          date,
          time: selectedSlot,
        }),
      });
      setNotice(
        `Appointment ${appointment.appointmentId} is booked and pending confirmation.`,
      );
      setLookupEmail(form.email);
      setForm({ name: "", email: "", reason: "" });
      setSelectedSlot("");
      const slotData = await request(
        `/providers/${selectedProvider._id}/slots?date=${date}`,
      );
      setSlots(slotData.availableSlots);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  async function loadMyAppointments(event) {
    event?.preventDefault();
    if (!lookupEmail) return;
    setLoadingAppointments(true);
    setError("");
    try {
      setMyAppointments(
        await request(`/appointments?email=${encodeURIComponent(lookupEmail)}`),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAppointments(false);
    }
  }

  async function cancelAppointment(appointmentId) {
    setError("");
    try {
      await request(`/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
      });
      setNotice("Your appointment has been cancelled.");
      await loadMyAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAdminAppointments(filters = adminFilters) {
    setLoadingAdmin(true);
    setError("");
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    );
    try {
      setAdminAppointments(
        await request(`/admin/appointments?${query.toString()}`),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAdmin(false);
    }
  }

  useEffect(() => {
    if (view === "admin") loadAdminAppointments();
  }, [view]);

  async function changeStatus(appointmentId, status) {
    setError("");
    try {
      await request(`/admin/appointments/${appointmentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadAdminAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span>CarePoint</span>
        </div>
        <nav aria-label="Primary navigation">
          <button
            className={view === "book" ? "nav-active" : ""}
            onClick={() => setView("book")}
          >
            Book
          </button>
          <button
            className={view === "appointments" ? "nav-active" : ""}
            onClick={() => setView("appointments")}
          >
            My appointments
          </button>
          <button
            className={view === "admin" ? "nav-active" : ""}
            onClick={() => setView("admin")}
          >
            Admin
          </button>
        </nav>
      </header>

      {(notice || error) && (
        <div
          className={`message ${error ? "message-error" : "message-success"}`}
        >
          {error || notice}
        </div>
      )}

      {view === "book" && (
        <section className="booking-layout">
          <div className="section-heading">
            <p className="eyebrow">Find the right care</p>
            <h1>Book an appointment</h1>
            <p>Choose a provider, then reserve a time that works for you.</p>
          </div>
          <div className="provider-grid">
            {providers.map((provider) => (
              <button
                key={provider._id}
                className={`provider-card ${selectedProvider?._id === provider._id ? "provider-selected" : ""}`}
                onClick={() => chooseProvider(provider)}
              >
                <span className="provider-avatar">
                  {provider.name
                    .replace("Dr. ", "")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span className="provider-info">
                  <strong>{provider.name}</strong>
                  <small>{provider.specialization}</small>
                  <small>{provider.experience} years experience</small>
                </span>
              </button>
            ))}
          </div>

          <div className="booking-workspace">
            <section className="slot-panel" aria-label="Available time slots">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Availability</p>
                  <h2>
                    {selectedProviderDetails
                      ? selectedProviderDetails.name
                      : "Select a provider"}
                  </h2>
                </div>
              </div>
              <label className="field-label">
                Appointment date
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              {selectedProvider ? (
                <div className="slot-grid">
                  {slots.length ? (
                    slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={selectedSlot === slot ? "slot-selected" : ""}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {formatTime(slot)}
                      </button>
                    ))
                  ) : (
                    <p className="empty">
                      No times are available on this date.
                    </p>
                  )}
                </div>
              ) : (
                <p className="empty">Provider availability will appear here.</p>
              )}
            </section>

            <form className="booking-form" onSubmit={submitBooking}>
              <p className="eyebrow">Your details</p>
              <h2>Confirm your visit</h2>
              <label>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Your full name"
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Reason for appointment
                <textarea
                  required
                  rows="4"
                  value={form.reason}
                  onChange={(event) =>
                    setForm({ ...form, reason: event.target.value })
                  }
                  placeholder="Tell us briefly how we can help"
                />
              </label>
              <div className="appointment-summary">
                <span>{selectedProvider?.name || "No provider selected"}</span>
                <span>
                  {selectedSlot
                    ? `${formatDate(date)} at ${formatTime(selectedSlot)}`
                    : "No time selected"}
                </span>
              </div>
              <button className="primary-action" disabled={booking}>
                {booking ? "Booking..." : "Book appointment"}
              </button>
            </form>
          </div>
        </section>
      )}

      {view === "appointments" && (
        <section className="content-view">
          <div className="section-heading">
            <p className="eyebrow">Patient portal</p>
            <h1>Your appointments</h1>
            <p>
              Use the email address from your booking to see and manage visits.
            </p>
          </div>
          <form className="lookup" onSubmit={loadMyAppointments}>
            <input
              type="email"
              required
              value={lookupEmail}
              onChange={(event) => setLookupEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <button className="primary-action" disabled={loadingAppointments}>
              {loadingAppointments ? "Loading..." : "Find appointments"}
            </button>
          </form>
          <AppointmentList
            appointments={myAppointments}
            onCancel={cancelAppointment}
          />
        </section>
      )}

      {view === "admin" && (
        <section className="content-view">
          <div className="section-heading">
            <p className="eyebrow">Operations</p>
            <h1>Appointment management</h1>
            <p>Review the schedule and keep every appointment up to date.</p>
          </div>
          <form
            className="filters"
            onSubmit={(event) => {
              event.preventDefault();
              loadAdminAppointments();
            }}
          >
            <label>
              Date
              <input
                type="date"
                value={adminFilters.date}
                onChange={(event) =>
                  setAdminFilters({ ...adminFilters, date: event.target.value })
                }
              />
            </label>
            <label>
              Status
              <select
                value={adminFilters.status}
                onChange={(event) =>
                  setAdminFilters({
                    ...adminFilters,
                    status: event.target.value,
                  })
                }
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Provider
              <select
                value={adminFilters.provider}
                onChange={(event) =>
                  setAdminFilters({
                    ...adminFilters,
                    provider: event.target.value,
                  })
                }
              >
                <option value="">All providers</option>
                {providers.map((provider) => (
                  <option key={provider._id} value={provider._id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-action" disabled={loadingAdmin}>
              {loadingAdmin ? "Loading..." : "Apply filters"}
            </button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Appointment</th>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Date & time</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {adminAppointments.length ? (
                  adminAppointments.map((appointment) => (
                    <tr key={appointment._id}>
                      <td>
                        <strong>{appointment.appointmentId}</strong>
                      </td>
                      <td>
                        {appointment.name}
                        <small>{appointment.email}</small>
                      </td>
                      <td>
                        {providerName(appointment)}
                        <small>{appointment.providerId?.specialization}</small>
                      </td>
                      <td>
                        {formatDate(appointment.date)}
                        <small>{formatTime(appointment.time)}</small>
                      </td>
                      <td className="reason-cell">{appointment.reason}</td>
                      <td>
                        <StatusBadge status={appointment.status} />
                        <select
                          aria-label={`Update status for ${appointment.appointmentId}`}
                          value={appointment.status}
                          onChange={(event) =>
                            changeStatus(
                              appointment.appointmentId,
                              event.target.value,
                            )
                          }
                        >
                          {statuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty">
                      No appointments match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function AppointmentList({ appointments, onCancel }) {
  if (!appointments.length)
    return <p className="empty list-empty">No appointments to show yet.</p>;
  return (
    <div className="appointment-list">
      {appointments.map((appointment) => (
        <article className="appointment-card" key={appointment._id}>
          <div>
            <p className="appointment-id">{appointment.appointmentId}</p>
            <h2>{providerName(appointment)}</h2>
            <p>{appointment.providerId?.specialization}</p>
          </div>
          <div className="appointment-meta">
            <span>{formatDate(appointment.date)}</span>
            <span>{formatTime(appointment.time)}</span>
          </div>
          <div className="appointment-actions">
            <StatusBadge status={appointment.status} />
            {!["Cancelled", "Completed"].includes(appointment.status) && (
              <button
                className="text-action"
                onClick={() => onCancel(appointment.appointmentId)}
              >
                Cancel
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
