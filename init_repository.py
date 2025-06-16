import os

def create_folder_structure():
    base_dir = "mierio"
    os.makedirs(base_dir, exist_ok=True)

    # app folder
    app_dir = os.path.join(base_dir, "app")
    os.makedirs(app_dir, exist_ok=True)
    
    # app files
    app_files = [
        "__init__.py",
        "main.py",
        "routes.py",
        "model_routes.py",
        "data_utils.py",
        "plot_utils.py",
        "config.py"
    ]
    for file in app_files:
        with open(os.path.join(app_dir, file), "w") as f:
            pass

    # templates folder
    templates_dir = os.path.join(app_dir, "templates")
    os.makedirs(templates_dir, exist_ok=True)
    with open(os.path.join(templates_dir, "index.html"), "w") as f:
        pass

    # static folder and subfolders
    static_dir = os.path.join(app_dir, "static")
    css_dir = os.path.join(static_dir, "css")
    js_dir = os.path.join(static_dir, "js")
    images_dir = os.path.join(static_dir, "images")
    os.makedirs(css_dir, exist_ok=True)
    os.makedirs(js_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    # static files
    with open(os.path.join(css_dir, "style.css"), "w") as f:
        pass
    
    js_files = [
        "script.js",
        "api_service.js",
        "ui_handlers.js",
        "view_tab.js",
        "model_tab.js"
    ]
    for file in js_files:
        with open(os.path.join(js_dir, file), "w") as f:
            pass

    # user_data folder
    user_data_dir = os.path.join(base_dir, "user_data")
    uploads_dir = os.path.join(user_data_dir, "uploads")
    settings_dir = os.path.join(user_data_dir, "settings")
    json_dir = os.path.join(settings_dir, "json")
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(json_dir, exist_ok=True)

    # upload files
    upload_files = ["Feature.csv", "Target.csv"]
    for file in upload_files:
        with open(os.path.join(uploads_dir, file), "w") as f:
            pass

    # json files
    json_files = [
        "FITTING_20250612235421.json",
        "FITTING_20250613001045.json",
        "FUNCTION_20250613001715.json",
        "FUNCTION_20250613001905.json",
        "MODEL_20250614222548.json"
    ]
    for file in json_files:
        with open(os.path.join(json_dir, file), "w") as f:
            pass

    # root files
    root_files = ["run.py", "config.py", "requirements.txt"]
    for file in root_files:
        with open(os.path.join(base_dir, file), "w") as f:
            pass

if __name__ == "__main__":
    create_folder_structure()