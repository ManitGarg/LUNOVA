# backend.app
import sys
import os
import types

_app_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_app_dir)
_repo_dir = os.path.dirname(_backend_dir)

for _d in [_backend_dir, _repo_dir]:
    if _d and _d not in sys.path:
        sys.path.insert(0, _d)

# Provide compatibility alias for 'backend' module when deployed with Root Directory as 'backend'
if "backend" not in sys.modules:
    _backend_pkg = types.ModuleType("backend")
    _backend_pkg.__path__ = [_backend_dir]
    sys.modules["backend"] = _backend_pkg
