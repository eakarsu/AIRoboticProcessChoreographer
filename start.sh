#!/bin/bash

# AI Robotic Process Choreographer - Start Script
# =================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   🤖 AI Robotic Process Choreographer               ║"
echo "║   Multi-Robot Warehouse Coordination System          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Clean used ports ───
echo -e "${YELLOW}[1/6] Cleaning used ports...${NC}"
for PORT in 3000 4000; do
  PID=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo -e "  Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    sleep 1
  fi
done
echo -e "${GREEN}  ✓ Ports 3000 and 4000 are free${NC}"

# ─── Check prerequisites ───
echo -e "${YELLOW}[2/6] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}  ✗ Node.js not found. Please install Node.js 18+${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "${RED}  ✗ PostgreSQL not found. Please install PostgreSQL${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ PostgreSQL found${NC}"

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}  ⚠ PostgreSQL is not running. Attempting to start...${NC}"
  if command -v brew &> /dev/null; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  fi
  sleep 2
  if ! pg_isready -q 2>/dev/null; then
    echo -e "${RED}  ✗ Could not start PostgreSQL. Please start it manually.${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}  ✓ PostgreSQL is running${NC}"

# ─── Load .env ───
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
DB_NAME="${DB_NAME:-robot_choreographer}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# ─── Create database ───
echo -e "${YELLOW}[3/6] Setting up database...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
  echo -e "${GREEN}  ✓ Database '$DB_NAME' created${NC}"
else
  echo -e "${GREEN}  ✓ Database '$DB_NAME' already exists${NC}"
fi

# ─── Install dependencies ───
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"
echo -e "  Installing backend dependencies..."
cd "$PROJECT_DIR/backend" && npm install --silent 2>/dev/null
echo -e "  Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend" && npm install --silent 2>/dev/null
cd "$PROJECT_DIR"
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# ─── Seed database ───
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
cd "$PROJECT_DIR/backend" && node seed.js
cd "$PROJECT_DIR"
echo -e "${GREEN}  ✓ Database seeded${NC}"

# ─── Start application with hot reload ───
echo -e "${YELLOW}[6/6] Starting application with hot reload...${NC}"

# Install nodemon globally if not present (for hot reload)
if ! command -v npx &> /dev/null; then
  npm install -g npx
fi

# Start backend with nodemon for hot reload
echo -e "${BLUE}  Starting backend on port 4000...${NC}"
cd "$PROJECT_DIR/backend"
npx --yes nodemon --watch . --ext js,json server.js &
BACKEND_PID=$!
cd "$PROJECT_DIR"

# Start frontend with Vite (has built-in HMR)
echo -e "${BLUE}  Starting frontend on port 3000...${NC}"
cd "$PROJECT_DIR/frontend"
npx vite --port 3000 &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

# Wait for services to be ready
sleep 3

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🚀 Application is running!                        ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   Frontend:  http://localhost:3000                   ║${NC}"
echo -e "${GREEN}║   Backend:   http://localhost:4000                   ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   Login:     admin@robotchoreographer.com            ║${NC}"
echo -e "${GREEN}║   Password:  admin123                                ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   Hot reload enabled for both frontend & backend    ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  # Clean ports again
  for PORT in 3000 4000; do
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill -9 $PID 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}✓ All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
