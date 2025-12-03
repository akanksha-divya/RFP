import React, { useState } from "react";
import "./App.css";

function App() {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [description, setDescription] = useState("");

  const handleSelectChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (opt) => opt.value);
    setSelectedOptions(values);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Selected options:", selectedOptions);
    console.log("Description:", description);
    alert("Form submitted! Check console for values.");
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
                className="form-select"
                multiple
                value={selectedOptions}
                onChange={handleSelectChange}
              >
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
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
