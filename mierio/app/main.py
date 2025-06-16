from flask import Flask, render_template, session
import os
from datetime import datetime

# Import configuration from the root config.py
from config import UPLOAD_FOLDER, JSON_SUBFOLDER, SECRET_KEY

# Import blueprints
from app.routes import data_bp
from app.model_routes import model_bp

app = Flask(__name__)
app.secret_key = SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JSON_SUBFOLDER'] = JSON_SUBFOLDER # Pass JSON_SUBFOLDER to app config

# Register blueprints
app.register_blueprint(data_bp)
app.register_blueprint(model_bp)


@app.route('/')
def index():
    """
    メインページを表示します。
    """
    return render_template('index.html')