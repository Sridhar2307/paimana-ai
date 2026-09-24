# PAIMANA-AI: Predictive Infrastructure Monitoring & Early Warning System

**Smart India Hackathon 2026 — Problem Statement SIH26103**

---

## 1. Project Overview

**PAIMANA-AI** is a predictive project intelligence and early-warning monitoring system for large-scale infrastructure projects across Indian Central Ministries (Ministry of Railways, MoRTH, MoPNG, MoP, etc.). 

Conventional monitoring reports cost overruns and schedule delays *post-facto* (after delays have already accumulated). PAIMANA-AI:
- Ingests project data (either the calibrated 500-project 24-month longitudinal panel demo dataset or real MoSPI IPMD / PAIMANA CSV/XLSX extracts).
- Computes component-wise transparent composite risk scores (cost, schedule, progress, milestone).
- Benchmarks a **conventional statistical baseline against machine learning models (XGBoost / Random Forest + SHAP local explainability)** under strict leakage controls.
- Detects early warning trends (progress gap widening, burn-rate divergence, physical progress stalls).
- Provides an AI Monitoring Assistant (powered by Google Gemini with offline rule-based fallback).
- Integrates optional cloud PostgreSQL / Supabase sync alongside standalone zero-dependency local operation.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: FastAPI, Python 3.10+ (tested with Python 3.12), Pydantic v2, Uvicorn
- **Machine Learning**: Scikit-Learn (Logistic Regression, Linear Regression, Random Forest), XGBoost, SHAP
- **LLM / AI Assistant**: Google Gemini 2.5 Flash via `google-genai` SDK with transparent local fallback
- **Data Storage & Database**: 
  - **Primary**: Local file-based high-performance JSON store (`backend/app/data/projects_demo.json` & `imported_dataset.json`)
  - **Cloud / Production**: Supabase PostgreSQL (`supabase_schema.sql` with RLS policies and indexes)

---

## 3. Requirements

- **Node.js**: v18.0.0 or later (v20+ / v22+ / v24+ recommended)
- **Python**: Python 3.10+ (Python 3.12 recommended; included virtual environment configured in `backend/.venv`)
- **Operating System**: Windows, macOS, or Linux

---

## 4. Quickstart: Running on Your Laptop

The project is pre-configured so you can run the entire prototype with a single command.

### Option A: Single Command Dev Launcher (Recommended)

From the root project directory:

```bash
npm run dev
```

Or on Windows PowerShell:

```powershell
.\run_dev.ps1
```

This single command automatically:
1. Detects Python 3.10+ (using the bundled `.venv` in `backend` or Windows `py -3.12`).
2. Starts the FastAPI backend on **http://127.0.0.1:8000** (API docs at `http://127.0.0.1:8000/docs`).
3. Starts the Vite frontend on **http://localhost:5173**.
4. Opens unified streaming logs with colored prefixes (`[BACKEND]` and `[FRONTEND]`).

---

### Option B: Running Frontend and Backend Separately

#### 1. Backend

```bash
# Navigate to the backend directory
cd paimana-ai-llm-assistant/paimana-ai/backend

# Activate the virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# Linux/macOS:
source .venv/bin/activate

# (Optional) If setting up a new environment:
# pip install -r requirements.txt

# Start the backend server
python run_backend.py
```
Backend will start on `http://127.0.0.1:8000`.

#### 2. Frontend

```bash
# Navigate to the frontend directory
cd paimana-ai-llm-assistant/paimana-ai/frontend

# Install dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 5. Prototype Credentials

When opening `http://localhost:5173`:
- Click **"Quick Demo Sign-In"** OR
- Username: `admin`
- Password: `admin123`

---

## 6. Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=8000
HOST=0.0.0.0
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000

# (Optional) Google Gemini API key:
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash

# (Optional) Supabase PostgreSQL Cloud Sync:
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

> **Note**: If `GEMINI_API_KEY` is not provided, the assistant automatically and cleanly operates in local rule-based fallback mode. No crash or error occurs.

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_BASE=http://127.0.0.1:8000

# (Optional) Supabase Cloud:
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 7. Database Setup & Standalone Operation

1. **Local Standalone Mode (Zero external dependencies)**:
   - The application does NOT require an external database server to run locally.
   - It runs off the calibrated 500-project dataset stored at `backend/app/data/projects_demo.json` with dynamic persistence to `datasource_state.json`.
   - Real MoSPI Flash Reports or PAIMANA CSV/XLSX extracts can be uploaded directly in the UI under **Settings → Real PAIMANA Data Import**.

2. **Supabase PostgreSQL Cloud Mode (Optional)**:
   - If connecting to Supabase:
     1. Create a Supabase project at [supabase.com](https://supabase.com).
     2. Open SQL Editor in Supabase and execute the DDL script: `backend/supabase_schema.sql`.
     3. Add your Supabase URL and keys to `backend/.env` and `frontend/.env`.
     4. Seed demo data using:
        ```bash
        npm run seed:db
        ```
     5. Test database connectivity using:
        ```bash
        npm run test:db
        ```

---

## 8. Testing

### Run Backend Integration & Model Evaluation Suites:

```bash
cd paimana-ai-llm-assistant/paimana-ai/backend
.\.venv\Scripts\python.exe tests_integration.py
.\.venv\Scripts\python.exe tests_upgrade.py
```
All **182/182 automated tests** pass cleanly.

### Production Build:

```bash
npm run build
```
Builds the optimized production client bundle in `frontend/dist/`.

---

## 9. Troubleshooting

- **"Could not reach PAIMANA-AI backend at http://127.0.0.1:8000"**:
  Make sure the backend is running (`npm run dev` or `python run_backend.py`). On Windows, verify that Python 3.10+ is used (the included `.venv\Scripts\python.exe` ensures Python 3.12 compatibility).
- **"Port 8000 already in use"**:
  Kill any lingering process using port 8000:
  `Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force`
- **Supabase Cloud Unreachable / Network Timeout**:
  PAIMANA-AI includes automatic timeout protection and fallback logic. The application runs 100% offline using its local engine without needing cloud access.
