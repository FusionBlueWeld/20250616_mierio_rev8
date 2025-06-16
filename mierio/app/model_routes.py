# mierio/app/model_routes.py
import os
import json
import re # 正規表現を扱うためにインポート
from datetime import datetime
from flask import Blueprint, request, jsonify, session, current_app
import pandas as pd
from app.model_evaluator import calculate_targets # 新しくインポート

model_bp = Blueprint('model_bp', __name__)

@model_bp.route('/save_model_config', methods=['POST'])
def save_model_config():
    """
    MODELタブの設定（関数定義とフィッティング設定）をJSONファイルとして保存します。
    Model Nameの情報も保存します。
    fitting_configはTargetをキーとし、Featureごとの関数割り当てを値とします。
    """
    data = request.get_json()
    model_name = data.get('modelName', '') # Model Nameを取得
    fitting_config_from_frontend = data.get('fittingConfig') # フロントエンドから来る元の形式
    fitting_method = data.get('fittingMethod')
    functions = data.get('functions')

    if not fitting_config_from_frontend or not functions:
        return jsonify({'error': 'No model configuration data received.'}), 400

    feature_filepath = session.get('feature_filepath')
    target_filepath = session.get('target_filepath')

    if not feature_filepath or not target_filepath:
        return jsonify({'error': 'Feature or Target CSV files not loaded. Cannot save configuration.'}), 400

    # fitting_configの構造を逆転させる
    # 新しい構造: { "TargetA": { "Feature1": "FuncName1", "Feature2": "FuncName2" }, ... }
    fitting_config_inverted = {}
    for feature_name, target_func_map in fitting_config_from_frontend.items():
        for target_name, func_name in target_func_map.items():
            if target_name.lower() == 'main_id' or feature_name.lower() == 'main_id':
                continue # main_id はスキップ
            if target_name not in fitting_config_inverted:
                fitting_config_inverted[target_name] = {}
            fitting_config_inverted[target_name][feature_name] = func_name

    save_data = {
        'timestamp': datetime.now().isoformat(),
        'model_name': model_name, # Model Nameを追加
        'feature_csv_path': os.path.abspath(feature_filepath),
        'target_csv_path': os.path.abspath(target_filepath),
        'fitting_method': fitting_method,
        'fitting_config': fitting_config_inverted, # 構造を逆転させたものを保存
        'functions': functions,
    }

    timestamp_str = datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f"LAW_MODEL_{timestamp_str}.json" # ファイル名を変更
    filepath = os.path.join(current_app.config['JSON_SUBFOLDER'], filename)

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=4)
        return jsonify({'message': f'Model configuration saved successfully: {filename}', 'filepath': filepath}), 200
    except Exception as e:
        current_app.logger.error(f"Error saving model config: {e}", exc_info=True)
        return jsonify({'error': f'Failed to save model configuration: {str(e)}'}), 500

@model_bp.route('/load_model_config', methods=['POST'])
def load_model_config():
    """
    MODELタブのJSON設定ファイルをロードし、その内容を返します。
    現在ロードされているCSVファイルのパスとの一致を検証します。
    fitting_configの構造をフロントエンドの期待する形式に戻して返します。
    また、結合関数を生成し、numexprによる計算デモをコマンドプロンプトに出力します。
    """
    # ヘルパー関数: パラメータ文字列（例: "A=1.0, B=2.0"）を辞書に変換
    def parse_params(params_str):
        params = {}
        if not params_str:
            return params
        for part in params_str.split(','):
            if '=' in part:
                key_value = part.split('=', 1)
                params[key_value[0].strip()] = key_value[1].strip()
        return params

    data = request.get_json()
    json_filename = data.get('filename')

    if not json_filename:
        return jsonify({'error': 'No JSON file name provided.'}), 400

    json_filepath = os.path.join(current_app.config['JSON_SUBFOLDER'], json_filename)

    if not os.path.exists(json_filepath):
        return jsonify({'error': f'JSON file not found: {json_filepath}'}), 404
    
    current_feature_filepath = session.get('feature_filepath')
    current_target_filepath = session.get('target_filepath')

    if not current_feature_filepath or not current_target_filepath:
        return jsonify({'error': 'Feature or Target CSV files are not currently loaded. Please load them first.'}), 400

    try:
        with open(json_filepath, 'r', encoding='utf-8') as f:
            loaded_data = json.load(f)
        
        loaded_feature_csv_path = loaded_data.get('feature_csv_path')
        loaded_target_csv_path = loaded_data.get('target_csv_path')

        if not (os.path.normpath(loaded_feature_csv_path) == os.path.normpath(current_feature_filepath) and \
                os.path.normpath(loaded_target_csv_path) == os.path.normpath(current_target_filepath)):
            return jsonify({'error': 'The configuration file was saved with different CSV files. Please load the matching CSVs first.'}), 400
        
        functions_list = loaded_data.get('functions', [])
        functions_map = {func['name']: func for func in functions_list}

        fitting_config_from_file = loaded_data.get('fitting_config', {})
        fitting_config_for_frontend = {}

        feature_headers_session = session.get('feature_headers', [])
        target_headers_session = session.get('target_headers', [])

        for f_header in feature_headers_session:
            if f_header.lower() == 'main_id': continue
            fitting_config_for_frontend[f_header] = {}
            for t_header in target_headers_session:
                if t_header.lower() == 'main_id': continue
                if t_header in fitting_config_from_file and f_header in fitting_config_from_file[t_header]:
                    fitting_config_for_frontend[f_header][t_header] = fitting_config_from_file[t_header][f_header]
                else:
                    fitting_config_for_frontend[f_header][t_header] = ""

        # 結合関数の生成とコマンドプロンプトへの出力 (ログ表示)
        fitting_method = loaded_data.get('fitting_method', '線形結合')
        operator = ' * ' if fitting_method == '乗積' else ' + '

        current_app.logger.info("\n--- Generated Combined Functions ---")
        for target, feature_map in fitting_config_from_file.items():
            if target.lower() == 'main_id': continue
            
            symbolic_parts, substituted_parts = [], []
            sorted_features = sorted(feature_map.items())

            for feature, func_name in sorted_features:
                if feature.lower() == 'main_id': continue
                symbolic_parts.append(f'"{func_name}"("{feature}")')
                
                func_definition = functions_map.get(func_name)
                if func_definition:
                    equation, params_str = func_definition.get('equation', 'x'), func_definition.get('parameters', '')
                    params_dict = parse_params(params_str)
                    sub_eq = f"({equation})"
                    sorted_keys = sorted(params_dict.keys(), key=len, reverse=True)
                    for param_name in sorted_keys:
                        sub_eq = re.sub(r'\b' + re.escape(param_name) + r'\b', str(params_dict[param_name]), sub_eq)
                    sub_eq = re.sub(r'\bx\b', feature, sub_eq)
                    substituted_parts.append(sub_eq)
                else:
                    substituted_parts.append(feature)

            if symbolic_parts:
                symbolic_str = f'"{target}" = ' + operator.join(symbolic_parts)
                substituted_str = f'"{target}" [Equation] = ' + operator.join(substituted_parts)
                current_app.logger.info(symbolic_str)
                current_app.logger.info(f"    └─ Substituted: {substituted_str}")
        current_app.logger.info("------------------------------------\n")

        # --- numexprを使った計算デモを追加 ---
        try:
            df_feature = pd.read_csv(current_feature_filepath)
            if not df_feature.empty:
                first_row_values = df_feature.iloc[0].to_dict()
                
                feature_values_for_calc = {
                    k: v for k, v in first_row_values.items() 
                    if k in feature_headers_session
                }
                
                calculated_results = calculate_targets(loaded_data, feature_values_for_calc)

                current_app.logger.info("\n--- Calculation Demo with numexpr (using first row of features) ---")
                current_app.logger.info(f"Input Features: {feature_values_for_calc}")
                current_app.logger.info(f"Calculated Targets: {calculated_results}")
                
                df_target = pd.read_csv(current_target_filepath)
                if not df_target.empty and 'main_id' in df_target.columns and 'main_id' in first_row_values:
                    main_id = first_row_values['main_id']
                    actual_targets = df_target[df_target['main_id'] == main_id]
                    if not actual_targets.empty:
                         current_app.logger.info(f"Actual Targets: {actual_targets.iloc[0].to_dict()}")

                current_app.logger.info("---------------------------------------------------------------------\n")
        except Exception as e:
            current_app.logger.error(f"Error during calculation demo: {e}", exc_info=True)
        # --- 追加ここまで ---

        return jsonify({
            'message': 'Configuration loaded successfully.',
            'model_name': loaded_data.get('model_name', ''),
            'fitting_config': fitting_config_for_frontend,
            'fitting_method': loaded_data.get('fitting_method'),
            'functions': loaded_data.get('functions')
        }), 200

    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON format in the selected file.'}), 400
    except Exception as e:
        current_app.logger.error(f"Error loading model config: {e}", exc_info=True)
        return jsonify({'error': f'Failed to load model configuration: {str(e)}'}), 500