import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [selectedVendorNames, setSelectedVendorNames] = useState([]);
  const [description, setDescription] = useState("");
  const [vendorNames, setVendorNames] = useState([]); // list of vendor names (strings)
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    // Fetch vendor names from backend API
    loadVendors();
  }, []);

  // Load vendor names from backend
  async function loadVendors() {
    setVendorsLoading(true);
    setVendorsError(null);
    try {
      const res = await fetch('http://localhost:5000/api/vendors');
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }
      const data = await res.json();
      setVendorNames(Array.isArray(data) ? data : []);
      console.log('Loaded vendor names:', Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setVendorNames([]);
      setVendorsError(String(err.message || err));
    } finally {
      setVendorsLoading(false);
    }
  }

  const handleSelectChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (opt) => opt.value);
    setSelectedVendorNames(values);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (selectedVendorNames.length === 0) {
      alert('Please select at least one vendor');
      return;
    }

    setSubmitLoading(true);
    try {
      // Send description and selected vendor names to backend
      const response = await fetch('http://localhost:5000/api/generate-rfp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          description, 
          vendorNames: selectedVendorNames 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      console.log("RFP Generated:", data.rfpText);
      console.log("Selected vendors:", selectedVendorNames);
      console.log('Email result:', data.emailResult);
      
      // Show PDF if available
      if (data.pdfUrl) {
        const open = window.open(data.pdfUrl, '_blank');
        if (!open) {
          alert(`RFP generated successfully! Download: ${data.pdfUrl}`);
        }
      } else {
        alert("RFP generated successfully! Check console for details.");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to generate RFP. Check console for details.');
    } finally {
      setSubmitLoading(false);
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
            {/* VENDOR NAMES DROPDOWN */}
            <div className="mb-3">
              <label className="form-label">Select Vendors</label>
              <select
                className="form-select multiselect-dropdown"
                multiple
                value={selectedVendorNames}
                onChange={handleSelectChange}
                disabled={vendorsLoading}
                style={{ minHeight: 120, border: '2px solid #007bff', background: '#fff', fontSize: '1rem', padding: '8px' }}
              >
                {vendorsLoading ? (
                  <option disabled>Loading vendors...</option>
                ) : vendorsError ? (
                  <option disabled>Error loading vendors</option>
                ) : vendorNames.length === 0 ? (
                  <option disabled>No vendors available</option>
                ) : (
                  vendorNames.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))
                )}
              </select>
              <div className="form-text">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple vendors.
              </div>
            </div>

            {vendorsError && (
              <div className="alert alert-danger mt-2" role="alert">
                Failed to load vendors: {vendorsError}
                <div>
                  <button type="button" className="btn btn-sm btn-link" onClick={() => loadVendors()}>Retry</button>
                </div>
              </div>
            )}

            {/* TEXT AREA */}
            <div className="mb-3">
              <label className="form-label">Enter Description</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Type your RFP description here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Display selected vendors */}
            {selectedVendorNames.length > 0 && (
              <div className="mb-3">
                <label className="form-label">Selected Vendors</label>
                <div className="form-control" style={{ minHeight: 48, background: '#f9f9f9' }}>
                  {selectedVendorNames.map((name, idx) => (
                    <div key={idx}><strong>•</strong> {name}</div>
                  ))}
                </div>
                <div className="form-text">RFP will be sent to selected vendors' emails.</div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="d-grid">
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? 'Generating RFP...' : 'Generate & Send RFP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
