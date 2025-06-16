import numexpr
import re
import pandas as pd
import numpy as np

def parse_params(params_str):
    """
    パラメータ文字列（例: "A=1.0, B=2.0"）を辞書に変換します。
    """
    params = {}
    if not params_str:
        return params
    for part in params_str.split(','):
        if '=' in part:
            key_value = part.split('=', 1)
            params[key_value[0].strip()] = key_value[1].strip()
    return params

def generate_equation_string(target_name, fitting_config, functions_map, fitting_method):
    """
    指定されたターゲットのnumexprで評価可能な計算式文字列を生成します。
    """
    operator = ' * ' if fitting_method == '乗積' else ' + '
    
    feature_map = fitting_config.get(target_name, {})
    if not feature_map:
        return None

    substituted_parts = []
    # Featureの順序を安定させるためキーでソート
    sorted_features = sorted(feature_map.items())

    for feature, func_name in sorted_features:
        if feature.lower() == 'main_id':
            continue
        
        func_definition = functions_map.get(func_name)
        if func_definition:
            equation = func_definition.get('equation', 'x')
            params_str = func_definition.get('parameters', '')
            params_dict = parse_params(params_str)
            
            # 演算子の優先順位の問題を避けるため、各部分式を括弧で囲む
            sub_eq = f"({equation})"
            
            # パラメータを値に置換（長い名前から置換して誤動作を防ぐ）
            sorted_keys = sorted(params_dict.keys(), key=len, reverse=True)
            for param_name in sorted_keys:
                param_val = params_dict[param_name]
                # re.subで単語境界(\b)を使い、他の変数名の一部とマッチするのを防ぐ
                sub_eq = re.sub(r'\b' + re.escape(param_name) + r'\b', str(param_val), sub_eq)
            
            # 変数'x'をFeature名に置換
            sub_eq = re.sub(r'\bx\b', feature, sub_eq)
            
            substituted_parts.append(sub_eq)
        else:
            # 関数定義が見つからない場合はFeature名をそのまま使用
            substituted_parts.append(feature)

    if not substituted_parts:
        return None
        
    return operator.join(substituted_parts)

def calculate_targets(model_config, feature_values):
    """
    モデル設定と特徴量の値から、numexprを使用してターゲット変数を計算します。

    Args:
        model_config (dict): ロードされたモデル設定のJSONデータ。
        feature_values (dict): 計算に使用する特徴量の値の辞書 (例: {'X1_speed': 5, 'X2_height': -6.0})

    Returns:
        dict: 計算されたターゲット変数の辞書 (例: {'Z_depth': 123.45, 'Z_width': 678.90})
    """
    fitting_config = model_config.get('fitting_config', {})
    functions_list = model_config.get('functions', [])
    fitting_method = model_config.get('fitting_method', '線形結合')
    functions_map = {func['name']: func for func in functions_list}
    
    results = {}
    
    # numexprで利用可能な関数や変数を格納する辞書
    # 特徴量の値で初期化
    local_dict = feature_values.copy()
    # numpyの関数などを追加
    local_dict.update({
        'exp': np.exp,
        'log': np.log,
        'sin': np.sin,
        'cos': np.cos,
        'tan': np.tan,
        'pi': np.pi
    })

    for target_name in fitting_config.keys():
        equation_str = generate_equation_string(target_name, fitting_config, functions_map, fitting_method)
        
        if equation_str:
            try:
                # numexprで計算を実行。global_dictは空にして予期せぬ変数の混入を防ぐ
                calculated_value = numexpr.evaluate(equation_str, local_dict=local_dict, global_dict={})
                # 結果がNumpy配列の場合があるので、item()でPythonのスカラー値に変換
                results[target_name] = calculated_value.item() if hasattr(calculated_value, 'item') else calculated_value
            except Exception as e:
                raise ValueError(f"Failed to evaluate expression for '{target_name}': {equation_str}. Error: {e}")
                
    return results