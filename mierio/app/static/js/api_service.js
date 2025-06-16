// mierio/app/static/js/api_service.js

const APIService = {
    /**
     * CSVファイルをサーバーにアップロードします。
     * @param {File} file - アップロードするファイルオブジェクト
     * @param {string} fileType - 'feature' または 'target'
     * @returns {Promise<Object>} - サーバーからのレスポンスデータ
     */
    uploadCSV: async (file, fileType) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);

        try {
            const response = await fetch('/upload_csv', {
                method: 'POST',
                body: formData,
            });
            return await response.json();
        } catch (error) {
            console.error('Error in uploadCSV:', error);
            throw new Error(`ファイルアップロード中にエラーが発生しました: ${error.message}`);
        }
    },

    /**
     * Plotlyグラフデータをバックエンドから取得します。
     * @param {Object} payload - FeatureパラメータとTargetパラメータを含むオブジェクト
     * @returns {Promise<Object>} - グラフデータとレイアウトを含むオブジェクト
     */
    getPlotData: async (payload) => {
        try {
            const response = await fetch('/get_plot_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            return await response.json();
        } catch (error) {
            console.error('Error in getPlotData:', error);
            throw new Error(`プロットデータ取得中にエラーが発生しました: ${error.message}`);
        }
    },

    /**
     * モデルテーブルのヘッダーをバックエンドから取得します。
     * @returns {Promise<Object>} - FeatureとTargetのヘッダーリスト
     */
    getModelTableHeaders: async () => {
        try {
            const response = await fetch('/get_model_table_headers', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return await response.json();
        } catch (error) {
            console.error('Error in getModelTableHeaders:', error);
            throw new Error(`モデルテーブルヘッダー取得中にエラーが発生しました: ${error.message}`);
        }
    },

    /**
     * モデル設定をバックエンドに保存します。
     * @param {Object} payload - フィッティング設定、フィッティング方法、関数定義、モデル名を含むオブジェクト
     * @returns {Promise<Object>} - サーバーからのメッセージとファイルパス
     */
    saveModelConfig: async (payload) => {
        try {
            const response = await fetch('/save_model_config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            return await response.json();
        } catch (error) {
            console.error('Error in saveModelConfig:', error);
            throw new Error(`モデル設定保存中にエラーが発生しました: ${error.message}`);
        }
    },

    /**
     * モデル設定ファイルをバックエンドからロードします。
     * @param {string} filename - ロードするJSONファイル名
     * @returns {Promise<Object>} - ロードされたフィッティング設定、フィッティング方法、関数定義、モデル名
     */
    loadModelConfig: async (filename) => {
        try {
            const response = await fetch('/load_model_config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: filename }),
            });
            return await response.json();
        } catch (error) {
            console.error('Error in loadModelConfig:', error);
            throw new Error(`モデル設定ロード中にエラーが発生しました: ${error.message}`);
        }
    }
};