import sys
import os

_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_current_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from backend.app.main import app
except ImportError:
    from app.main import app

handler = app
