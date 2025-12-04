import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [selectedVendorNames, setSelectedVendorNames] = useState([]);
  const [description, setDescription] = useState("");
  const [vendorNames, setVendorNames] = useState([]); // list of vendor names (strings)
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastSendId, setLastSendId] = useState(null);
  const [processLoading, setProcessLoading] = useState(false);
  const [bestDecision, setBestDecision] = useState(null);
  const [vendorReplies, setVendorReplies] = useState([]);

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
      // Save sendId for later reply collection
      if (data.emailResult && data.emailResult.sendId) {
        setLastSendId(data.emailResult.sendId);
      }

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
  <header className="app-header text-center mb-4">
        
        <h1 className="fw-bold">My Company Name</h1>
      </header>

      {/* CARD */}
      <div className="card shadow-sm card-custom">
        <div className="card-body">
          <h2 className="h5 mb-4 text-center">Welcome to Our Home Page</h2>

          <form onSubmit={handleSubmit}>
            {/* VENDOR SELECTION + SELECTED (side-by-side on wide screens) */}
            <div className="vendor-row">
              <div className="vendor-column">
                <label className="form-label">Select Vendors</label>
                <select
                  className="form-select multiselect-dropdown"
                  multiple
                  value={selectedVendorNames}
                  onChange={handleSelectChange}
                  disabled={vendorsLoading}
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
                <div className="form-text">Hold Ctrl (Windows) or Cmd (Mac) to select multiple vendors.</div>

                {vendorsError && (
                  <div className="alert alert-danger mt-2" role="alert">
                    Failed to load vendors: {vendorsError}
                    <div>
                      <button type="button" className="btn btn-sm btn-link" onClick={() => loadVendors()}>Retry</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="vendor-column selected-vendors-panel">
                <label className="form-label">Selected Vendors</label>
                <div className="selected-vendors-display">
                  {selectedVendorNames.length === 0 ? (
                    <div className="empty-state">No vendors selected</div>
                  ) : (
                    selectedVendorNames.map((name, idx) => (
                      <div className="vendor-badge" key={idx}>{name}</div>
                    ))
                  )}
                </div>
                <div className="form-text">RFP will be sent to selected vendors' emails.</div>
              </div>
            </div>

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
            {/* SUBMIT BUTTON */}
            <div className="d-grid mb-3">
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? 'Generating RFP...' : 'Generate & Send RFP'}
              </button>
            </div>

            {/* Send info and reply processing */}
            {lastSendId && (
              <div className="mb-3">
                <div className="mt-2 d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={processLoading}
                    onClick={async () => {
                      setProcessLoading(true);
                      setBestDecision(null);
                      setVendorReplies([]);
                      try {
                        const resp = await fetch('http://localhost:5000/api/process-replies', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sendId: lastSendId }),
                        });
                        const json = await resp.json();
                        if (!resp.ok) throw new Error(json.error || 'Failed');
                        setBestDecision(json.decision);
                        setVendorReplies(json.vendorReplies || []);
                      } catch (e) {
                        alert('Failed to collect replies: ' + (e.message || e));
                        console.error(e);
                      } finally {
                        setProcessLoading(false);
                      }
                    }}
                  >{processLoading ? 'Processing...' : 'Collect Replies & Select Best'}</button>
                </div>

                {bestDecision && (
                  <div className="mt-3 card p-3">
                    <h4 className="h6">Vendor Selected </h4>
                    <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(bestDecision, null, 2)}</pre>
                  </div>
                )}

                {/* {vendorReplies.length > 0 && (
                  <div className="mt-3 card p-3">
                    <h4 className="h6">Collected Replies</h4>
                    {vendorReplies.map((r, i) => (
                      <div key={i} className="mb-2">
                        <div><strong>From:</strong> {r.from}</div>
                        <div><strong>Vendors:</strong> {(r.vendors || []).join(', ')}</div>
                        <div style={{whiteSpace:'pre-wrap'}}>{r.text}</div>
                        <hr />
                      </div>
                    ))}
                  </div>
                )} */}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
