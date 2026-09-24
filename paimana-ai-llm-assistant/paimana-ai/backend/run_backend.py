"""
PAIMANA-AI backend launcher.

Loads the backend .env (so GEMINI_API_KEY is available to the Gemini client)
before importing the application, then serves on http://127.0.0.1:8000.
"""

import sys
import os
import subprocess
import shutil
from pathlib import Path

# Ensure compatible Python version (3.10+)
if sys.version_info < (3, 10):
    backend_dir = Path(__file__).resolve().parent
    venv_py_win = backend_dir / ".venv" / "Scripts" / "python.exe"
    venv_py_unix = backend_dir / ".venv" / "bin" / "python"
    target_py = None

    if venv_py_win.exists():
        target_py = str(venv_py_win)
    elif venv_py_unix.exists():
        target_py = str(venv_py_unix)
    elif shutil.which("py"):
        target_py = "py"

    if target_py == "py":
        print(f"Current Python ({sys.version.split()[0]}) is < 3.10. Delegating to Windows 'py -3.12'...")
        cmd = ["py", "-3.12", str(Path(__file__).resolve())] + sys.argv[1:]
        sys.exit(subprocess.call(cmd))
    elif target_py:
        print(f"Current Python ({sys.version.split()[0]}) is < 3.10. Delegating to virtual environment at: {target_py}...")
        cmd = [target_py, str(Path(__file__).resolve())] + sys.argv[1:]
        sys.exit(subprocess.call(cmd))
    else:
        print(f"ERROR: PAIMANA-AI requires Python 3.10+. Current version is {sys.version.split()[0]}.")
        print("Please activate the virtual environment or run with Python 3.10+ (e.g. .venv\\Scripts\\python run_backend.py).")
        sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

import uvicorn

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
