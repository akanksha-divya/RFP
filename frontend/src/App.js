import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [description, setDescription] = useState("");
  const [nameOptions, setNameOptions] = useState([]);

  useEffect(() => {
    // Fetch names from backend API (use full URL for local dev)
    fetch('http://localhost:5000/api/names')
      .then(res => res.json())
      .then(data => setNameOptions(Array.isArray(data) ? data : []))
      .catch(err => {
        setNameOptions([]);
        console.error('Error fetching names:', err);
      });
  }, []);

  const handleSelectChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (opt) => opt.value);
    setSelectedOptions(values);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    try {
      // Send description to backend to generate RFP
      const response = await fetch('http://localhost:5000/api/generate-rfp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      console.log("RFP Generated:", data.rfpText);
      console.log("Selected vendors:", selectedOptions);
      alert("RFP generated successfully! Check console for details.");
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to generate RFP. Check console for details.');
    }
  };

  return (
    <div className="app-container">
      {/* HEADER: Logo + Company Name */}
      <header className="text-center mb-4">
        <img
          src="/logo.png"
          alt="Company Logo"
          className="logo"
        />
        <h1 className="fw-bold">My Company Name</h1>
      </header>

      {/* CARD */}
      <div className="card shadow-sm card-custom">
        <div className="card-body">
          <h2 className="h5 mb-4 text-center">Welcome to Our Home Page</h2>

          <form onSubmit={handleSubmit}>
            {/* MULTISELECT DROPDOWN */}
            <div className="mb-3">
              <label className="form-label">Select Options</label>
              <select
                className="form-select multiselect-dropdown"
                multiple
                value={selectedOptions}
                onChange={handleSelectChange}
                style={{ minHeight: 120, border: '2px solid #007bff', background: '#fff', fontSize: '1rem', padding: '8px' }}
              >
                {nameOptions.length === 0 ? (
                  <option disabled>
                    No options available
                  </option>
                ) : (
                  nameOptions.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))
                )}
              </select>
              <div className="form-text">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple options.
              </div>
            </div>

            {/* TEXT AREA */}
            <div className="mb-3">
              <label className="form-label">Enter Description</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Type here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="d-grid">
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
