import pandas as pd
import numpy as np
import os

def load_and_merge_csvs(feature_filepath, target_filepath):
    """
    指定されたFeatureとTargetのCSVファイルをロードし、'main_id'をキーとして結合します。
    'main_id'がない場合はインデックスで結合を試みます。
    """
    if not os.path.exists(feature_filepath):
        raise FileNotFoundError(f"Feature CSV file not found: {feature_filepath}")
    if not os.path.exists(target_filepath):
        raise FileNotFoundError(f"Target CSV file not found: {target_filepath}")

    df_feature = pd.read_csv(feature_filepath)
    df_target = pd.read_csv(target_filepath)

    if 'main_id' in df_feature.columns and 'main_id' in df_target.columns:
        df_merged = pd.merge(df_feature, df_target, on='main_id', how='inner')
    else:
        if len(df_feature) != len(df_target):
            raise ValueError('Feature and Target CSV files have different number of rows and no common "main_id".')
        df_merged = pd.concat([df_feature, df_target], axis=1)
    
    return df_merged

def filter_dataframe(df, feature_params):
    """
    FeatureパラメータのConstant設定に基づいてDataFrameをフィルタリングします。
    """
    df_filtered = df.copy()
    for param_info in feature_params:
        param_name = param_info['name']
        param_type = param_info['type']
        param_value = param_info.get('value')

        if param_type == 'Constant':
            if param_value is None or param_value == '':
                raise ValueError(f"Constant value for '{param_name}' is not provided.")
            
            if param_name not in df_filtered.columns:
                raise KeyError(f"Parameter '{param_name}' not found in data for Constant filter.")

            try:
                temp_series = pd.to_numeric(df_filtered[param_name], errors='coerce')
                
                if not temp_series.isnull().all():
                    df_filtered[param_name] = temp_series
                    tolerance = 1e-9
                    df_filtered = df_filtered[np.isclose(df_filtered[param_name].astype(float), float(param_value), atol=tolerance)]
                else:
                    df_filtered = df_filtered[df_filtered[param_name] == str(param_value)]
                
            except ValueError:
                raise ValueError(f"Invalid constant value for '{param_name}'. Must be a number or match string value.")
            except KeyError:
                raise KeyError(f"Parameter '{param_name}' not found in Feature data.")
    return df_filtered

def convert_columns_to_numeric(df, columns):
    """
    指定されたカラムを数値型に変換し、変換できない場合はNaNとします。
    """
    for col in columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    return df