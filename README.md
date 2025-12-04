_**RFP Generator & Vendor Selection System**_

**Overview **

A full-stack application that allows organizations to:
1. Create an RFP (Request For Proposal) automatically using AI (LLM)
2. Send the generated RFP PDF to selected vendors via email
3. Collect vendor responses automatically from email (IMAP)
4. Use AI to evaluate replies and select the best vendor
5. Display final decision and reply summary in a modern UI


**1. Project Setup**

a. Prerequisites
| Requirement              | Version / Description                      |
|--------------------------|--------------------------------------------|
| Node.js / npm            | Node v18+ recommended, npm v8+             |
| IMAP Email Account       | Gmail / Outlook / Custom IMAP              |
| SMTP Email Credentials   | App password recommended                   |
| Ollama Local LLM         | Installed and running                      |
| OS Compatibility         | Windows / macOS / Linux                    |


b. Install Steps

Backend setup
- `cd backend`
- `npm install`
- `node api.js`


Frontend setup
- `cd frontend`
- `npm install`
- `npm start`

c. Configure Email Sending/Receiving

Create .env inside backend/:

IMAP_HOST=imap.gmail.com

IMAP_PORT=993

IMAP_USER=your_email@gmail.com

IMAP_PASS=email_app_password

IMAP_TLS=true

SMTP_HOST=smtp.gmail.com

SMTP_PORT=465

SMTP_USER=your_email@gmail.com

SMTP_PASS=email_app_password



d. Run Everything Locally

Start Ollama server

- ollama serve
  
- Pull an LLM
  
- ollama pull gemma3:1b
  

Start backend

- node main.js
  

Start frontend

- npm start

Open browser:

- http://localhost:3000/
  


**2. Tech Stack**

a. Technologies Used

| Layer            | Tools / Libraries                                       |
|------------------|---------------------------------------------------------|
| Frontend         | React, Bootstrap 5, Custom CSS                          |
| Backend          | Node.js, Express                                        |
| AI LLM           | Ollama (gemma3:1b, supports Llama3, Mistral models)     |
| PDF              | PDFKit                                                  |
| Email Sending    | Nodemailer (SMTP)                                       |
| Email Reading    | IMAP-simple, MailParser                                 |
| Data Store       | JSON file (future: Database implementation)             |



**3. API Documentation**

a. Endpoints

| Method | Endpoint             | Description                                           |
|--------|----------------------|-------------------------------------------------------|
| POST   | `/api/generate-rfp`  | Generates RFP text, creates PDF, sends email to vendors |
| POST   | `/api/process-replies` | Reads email inbox replies & performs vendor comparison using AI |
| GET    | `/api/vendors`       | Fetch available vendor names                         |



**4. Decisions & Assumptions**

a. Key System Design Decisions

- AI comparison uses index-based enforcement to prevent hallucinated vendor names
- Emails matched using `sendId` contained in subject or body
- Fallback vendor selection uses reply count heuristic
- PDF output standardized for consistency when AI fails


**b. Assumptions**

- Vendors reply with the same subject (or include `sendId` in body)
- Simple IMAP inbox structure (`INBOX` only)
- No attachments handling yet (can be enhanced)
- JSON data store will be replaced later with a database



**5. AI Tools Usage**
   
a. AI tools used

| Tool               | Usage                                              |
|--------------------|----------------------------------------------------|
| ChatGPT (primary)  | Prompt design, debugging                           |
| Ollama Local LLM   | Content generation and vendor decision reasoning   |


b. What AI helped with

- Designing vendor evaluation prompt
- Improving JSON return structure & validation
- Faster frontend layout generation (React + Bootstrap)
- Debugging IMAP parsing & fallback logic


c. Learning Outcomes

- AI can significantly reduce boilerplate development time
- Prompt engineering is critical for reliable structured output
- Validation layers still required to avoid hallucinated responses
- IMAP email text extraction varies widely across providers

