"""
Utility functions for OmniNotes AI
"""

import os
import shutil
from datetime import datetime, timedelta


def save_upload(file_obj, upload_dir: str, filename: str) -> str:
    """Save uploaded file to disk"""
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file_obj, buffer)
    return file_path


def cleanup_files(directory: str, max_age_hours: int = 24):
    """Remove files older than specified hours"""
    if not os.path.exists(directory):
        return

    cutoff = datetime.now() - timedelta(hours=max_age_hours)

    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff:
                    os.remove(file_path)
        except Exception as e:
            print(f"Error cleaning up {file_path}: {e}")


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def validate_image_file(filename: str) -> bool:
    """Check if file is a valid image type"""
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.pdf'}
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed_extensions


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove path components
    filename = os.path.basename(filename)
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    # Remove potentially dangerous characters
    filename = ''.join(c for c in filename if c.isalnum() or c in '._-')
    return filename
