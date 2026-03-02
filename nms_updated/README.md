# Numerical Methods Solver

A production-grade web application for Newton-Raphson, Lagrange Interpolation, and Runge-Kutta 4th Order methods with cinematic dark UI, animated graphs, and themed PDF export.

---

## Quick Start (Local)

```bash
cd numerical_solver
pip install -r requirements.txt
python run.py
# Open http://localhost:5000
```

---

## Docker Deployment

### Build and run:
```bash
docker build -t numerical-solver .
docker run -p 5000:5000 numerical-solver
# Open http://localhost:5000
```

### With docker-compose (optional):
```bash
docker-compose up --build
```

---

## Vercel Deployment (Step-by-Step)

### Step 1 — Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2 — Login to Vercel
```bash
vercel login
# Follow the browser prompt to authenticate
```

### Step 3 — Push code to GitHub first (recommended)
1. Create a new repo at https://github.com/new
2. Run:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/numerical-solver.git
git push -u origin main
```

### Step 4 — Deploy via Vercel Dashboard (easiest)
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repo
4. Framework Preset: **Other**
5. Root Directory: leave as `/`
6. Click **Deploy**
7. Your app will be live at `https://your-project.vercel.app`

### Step 5 — Deploy via CLI (alternative)
```bash
# Inside the project folder:
vercel
# Answer prompts:
#   Set up and deploy? Y
#   Which scope? (your account)
#   Link to existing project? N
#   Project name: numerical-solver
#   Root directory: ./
#   Override settings? N
```

### Step 6 — Production deploy
```bash
vercel --prod
```

---

## Environment Variables (optional)
Set in Vercel Dashboard → Project → Settings → Environment Variables:
```
SECRET_KEY=your-random-secret-key-here
```

---

## Project Structure
```
numerical_solver/
├── run.py              ← Entry point
├── requirements.txt    ← Python dependencies
├── vercel.json         ← Vercel routing config
├── Dockerfile          ← Docker build
├── .dockerignore
├── .gitignore
└── app/
    ├── __init__.py     ← App factory
    ├── config.py
    ├── pdf_generator.py
    ├── routes/
    │   ├── api.py      ← /api/* endpoints
    │   └── main.py
    ├── services/
    │   ├── newton_raphson.py
    │   ├── lagrange.py
    │   └── runge_kutta.py
    ├── utils/
    │   └── math_utils.py
    ├── templates/
    │   └── index.html
    └── static/
        ├── css/        ← 5 CSS files
        └── js/         ← 7 JS files
```
