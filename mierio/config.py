import os

# Base directory for user data (relative to the 'mierio' directory)
USER_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'user_data')

# Upload folder for CSV files
UPLOAD_FOLDER = os.path.join(USER_DATA_DIR, 'uploads')

# Settings folder for JSON configuration files
SETTINGS_FOLDER = os.path.join(USER_DATA_DIR, 'settings')
JSON_SUBFOLDER = os.path.join(SETTINGS_FOLDER, 'json')

# Secret key for Flask sessions (IMPORTANT: Change this to a strong, random value in production)
SECRET_KEY = 'super_secret_key_for_mierio_app'

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(JSON_SUBFOLDER, exist_ok=True)