// mierio/app/static/js/model_tab.js

// グローバル変数 (script.jsからアクセスされることを想定)
let modelFittingSelections = {};
let modelFunctions = [];
let modelConfigLoaded = false; // モデル設定がロードされたかどうかのフラグ

// デフォルト関数データ (初回起動時のみ使用。modelFunctionsの初期値として)
// Feature変数は 'x' に固定
const initialDefaultFunctions = [
    { name: "Exp_Decay", equation: "A * exp(-x / tau) + C", parameters: "A=1.0, tau=100.0, C=0.5" },
    { name: "Gaussian", equation: "Amp * exp(-(x - mu)**2 / (2 * sigma**2))", parameters: "Amp=1.0, mu=0.0, sigma=1.0" },
    { name: "Power_Law", equation: "alpha * x**beta", parameters: "alpha=1.0, beta=0.7" },
    { name: "Linear", equation: "m * x + b", parameters: "m=0.1, b=0.0" },
    { name: "Polynomial_2nd", equation: "a * x**2 + b * x + c", parameters: "a=0.01, b=0.1, c=0.0" },
    { name: "Log_Growth", equation: "K / (1 + exp(-r * (x - x0)))", parameters: "K=1.0, r=0.1, x0=0.0" }
];

const ModelTab = {
    init: () => {
        modelFunctions = [...initialDefaultFunctions]; // 初期関数をロード
        ModelTab.populateFunctionTable(); // FUNCTIONテーブルを初期表示

        // MODELタブの線形結合/乗積トグルスイッチのラベル更新
        const fittingMethodToggle = document.getElementById('fitting-method-toggle');
        const fittingMethodLabel = document.getElementById('fitting-method-label');
        fittingMethodToggle.addEventListener('change', () => {
            fittingMethodLabel.textContent = fittingMethodToggle.checked ? '線形結合' : '乗積';
        });

        // MODELタブ APPLYボタンのクリックイベント (関数定義とフィッティング設定をまとめて保存)
        document.getElementById('model-apply-button').addEventListener('click', async () => {
            const modelDisplayName = document.getElementById('model-display-name'); // 追加
            const modelName = modelDisplayName.value.trim(); // モデル名を取得

            // 入力値の検証
            for (const func of modelFunctions) {
                if (!func.name.match(/^[a-zA-Z0-9_]+$/)) {
                    alert(`関数名 "${func.name}" は英数字とアンダースコアのみ使用できます。`);
                    return;
                }
                if (!func.equation.trim()) {
                    alert(`関数 "${func.name}" の式は空にできません。`);
                    return;
                }
                // パラメータ形式の簡易検証
                if (func.parameters.trim()) {
                    const params = func.parameters.split(',').map(p => p.trim());
                    for (const param of params) {
                        if (!param.includes('=') || param.split('=').length !== 2) {
                            alert(`関数 "${func.name}" のパラメータ "${param}" の形式が無効です。「name=value」の形式で記述してください。`);
                            return;
                        }
                        const [paramName, paramValue] = param.split('=');
                        if (!paramName.match(/^[a-zA-Z_]+[a-zA-Z0-9_]*$/)) { // Pythonの変数名規則に簡易的に合わせる
                            alert(`関数 "${func.name}" のパラメータ名 "${paramName}" は有効な変数名ではありません（英数字とアンダースコア、数字は先頭以外）。`);
                            return;
                        }
                        if (isNaN(parseFloat(paramValue))) {
                            alert(`関数 "${func.name}" のパラメータ "${paramName}" の値は数値である必要があります。`);
                            return;
                        }
                    }
                }
            }


            const fittingConfigToSend = {};
            const targetHeaders = window.ViewTab.getTargetHeaders(); // ViewTabからターゲットヘッダーを取得
            const featureHeaders = window.ViewTab.getFeatureHeaders(); // Featureヘッダーも取得

            // fitting_configToSend の構造を Target をキーにするように変更
            // フロントエンドでは Feature をキーに扱っているので、ここで変換して送る
            // バックエンドで Target をキーに変換される
            for (const featureHeader of featureHeaders) {
                if (featureHeader.toLowerCase() === 'main_id') continue;
                fittingConfigToSend[featureHeader] = {};
                for (const targetHeader of targetHeaders) {
                    if (targetHeader.toLowerCase() === 'main_id') continue;
                    const dropdown = document.querySelector(`#fitting-table tbody tr[data-feature-header="${featureHeader}"] td:nth-child(${targetHeaders.indexOf(targetHeader) + 2}) .fitting-dropdown`);
                    if (dropdown) {
                         fittingConfigToSend[featureHeader][targetHeader] = dropdown.value;
                    }
                }
            }

            const fittingMethod = fittingMethodToggle.checked ? '線形結合' : '乗積';

            const payload = {
                modelName: modelName, // モデル名を追加
                fittingConfig: fittingConfigToSend,
                fittingMethod: fittingMethod,
                functions: modelFunctions
            };

            try {
                const result = await APIService.saveModelConfig(payload);

                if (result.error) {
                    alert(`設定の保存に失敗しました: ${result.error}`);
                } else {
                    alert(`設定が保存されました: ${result.message}`);
                    console.log(result.filepath);
                    ModelTab.setModelConfigLoaded(true); // 保存成功
                    // VIEWタブのUIを更新
                    UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
                    window.ViewTab.updatePlot(); // 保存後、VIEWタブのグラフを更新
                }
            } catch (error) {
                console.error('Error saving model config:', error);
                alert(`設定保存中にエラーが発生しました: ${error.message}`);
            }
        });

        document.getElementById('add-function-row').addEventListener('click', () => {
            modelFunctions.push({ name: "", equation: "", parameters: "" });
            ModelTab.populateFunctionTable();
        });

        document.getElementById('delete-function-row').addEventListener('click', () => {
            if (modelFunctions.length > 0) {
                modelFunctions.pop();
                ModelTab.populateFunctionTable();
            }
        });
    },

    /**
     * MODELタブのFITTING設定テーブルにドロップダウンを生成します。
     * 選択状態はmodelFittingSelectionsに保存/復元されます。
     */
    populateFittingTable: async () => {
        const fittingTableBody = document.querySelector('#fitting-table tbody');
        const modelApplyButton = document.getElementById('model-apply-button');

        const featureHeaders = window.ViewTab.getFeatureHeaders(); // ViewTabからヘッダーを取得
        const targetHeaders = window.ViewTab.getTargetHeaders(); // ViewTabからヘッダーを取得

        if (featureHeaders.length === 0 || targetHeaders.length === 0) {
            fittingTableBody.innerHTML = '<tr><td colspan="100%">CSVファイルがロードされていません。FeatureとTargetファイルをアップロードしてください。</td></tr>';
            modelApplyButton.disabled = true;
            return;
        }
        modelApplyButton.disabled = false;

        // FITTINGテーブルのヘッダーを更新
        const fittingTableHeaderRow = document.querySelector('#fitting-table thead tr');
        fittingTableHeaderRow.innerHTML = '<th>Feature / Target</th>'; // Featureヘッダー用の空セル
        targetHeaders.forEach(tHeader => {
            if (tHeader.toLowerCase() !== 'main_id') { // main_idを除外
                fittingTableHeaderRow.innerHTML += `<th>${tHeader}</th>`;
            }
        });

        fittingTableBody.innerHTML = ''; // 既存の行をクリア

        // modelFunctions (MODELタブの関数選択肢) が最新の状態であることを確認
        // modelFunctionsからavailableFunctionsを構築
        const availableFunctions = modelFunctions.map(func => func.name).filter(name => name);
        console.log("Available Functions for Fitting Table:", availableFunctions);

        featureHeaders.forEach(fHeader => {
            if (fHeader.toLowerCase() !== 'main_id') { // main_idを除外
                const row = document.createElement('tr');
                row.dataset.featureHeader = fHeader;
                row.innerHTML = `<td>${fHeader}</td>`;

                targetHeaders.forEach(tHeader => {
                    if (tHeader.toLowerCase() !== 'main_id') { // main_idを除外
                        const cell = document.createElement('td');
                        const select = document.createElement('select');
                        select.classList.add('fitting-dropdown');
                        select.innerHTML = '<option value="">--関数を選択--</option>';

                        availableFunctions.forEach(funcName => {
                            const option = document.createElement('option');
                            option.value = funcName;
                            option.textContent = funcName;
                            select.appendChild(option);
                        });

                        // modelFittingSelections の構造がフロントエンドの期待する形式（Featureをキー）になっていることを前提に、値を設定
                        if (modelFittingSelections[fHeader] && modelFittingSelections[fHeader][tHeader]) {
                            const optionExists = Array.from(select.options).some(option => option.value === modelFittingSelections[fHeader][tHeader]);
                            if (optionExists) {
                                select.value = modelFittingSelections[fHeader][tHeader];
                            } else {
                                select.value = ''; // 選択肢にない場合は空に
                            }
                        }

                        select.addEventListener('change', (event) => {
                            if (!modelFittingSelections[fHeader]) {
                                modelFittingSelections[fHeader] = {};
                            }
                            modelFittingSelections[fHeader][tHeader] = event.target.value;
                            console.log('Model Fitting Selection Updated:', modelFittingSelections);
                        });

                        cell.appendChild(select);
                        row.appendChild(cell);
                    }
                });
                fittingTableBody.appendChild(row);
            }
        });
    },

    /**
     * modelFunctions配列に基づいてFUNCTION定義テーブルを再描画します。
     * この関数は、データモデル(modelFunctions)が変更されたときに呼び出されます。
     */
    populateFunctionTable: () => {
        const functionTableBody = document.getElementById('function-table-body');
        functionTableBody.innerHTML = '';

        modelFunctions.forEach((func, index) => {
            const newRow = document.createElement('tr');
            newRow.classList.add('function-row');
            newRow.dataset.functionIndex = index;
            newRow.innerHTML = `
                <td></td>
                <td><input type="text" class="function-name" placeholder="関数名 (英数字と_)" value="${func.name || ''}"></td>
                <td><input type="text" class="function-equation" placeholder="例: A * exp(-x/tau) + C" value="${func.equation || ''}"></td>
                <td><input type="text" class="function-parameters" placeholder="例: A=1.0, tau=100.0, C=0.5" value="${func.parameters || ''}"></td>
            `;
            functionTableBody.appendChild(newRow);
        });
        ModelTab.updateRowNumbers();

        document.querySelectorAll('#function-table-body .function-row input').forEach(input => {
            input.addEventListener('input', (event) => {
                const row = event.target.closest('.function-row');
                const index = parseInt(row.dataset.functionIndex);
                const func = modelFunctions[index];

                if (!func) return;

                if (event.target.classList.contains('function-name')) {
                    func.name = event.target.value.trim();
                    ModelTab.populateFittingTable(); // 関数名が変わったらフィッティングテーブルを更新
                } else if (event.target.classList.contains('function-equation')) {
                    func.equation = event.target.value.trim();
                } else if (event.target.classList.contains('function-parameters')) {
                    func.parameters = event.target.value.trim();
                }
                console.log("modelFunctions Updated:", modelFunctions);
            });
        });
        ModelTab.populateFittingTable();
    },

    /**
     * FUNCTION定義テーブルの行番号を更新するヘルパー関数。
     */
    updateRowNumbers: () => {
        const functionTableBody = document.getElementById('function-table-body');
        const rows = functionTableBody.querySelectorAll('.function-row');
        rows.forEach((row, index) => {
            row.querySelector('td:first-child').textContent = index + 1;
        });
    },

    /**
     * モデル設定を初期状態にリセットします。
     * メイン画面のModelファイル選択が解除された場合などに使用できます。
     */
    resetModelSettings: () => {
        modelFittingSelections = {};
        modelFunctions = [...initialDefaultFunctions]; // デフォルト関数に戻す
        modelConfigLoaded = false;
        document.getElementById('fitting-method-toggle').checked = true; // デフォルトの線形結合に戻す
        document.getElementById('fitting-method-label').textContent = '線形結合';
        document.getElementById('model-display-name').value = ''; // モデル名表示をクリア
        ModelTab.populateFunctionTable();
        ModelTab.populateFittingTable();
        UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, modelConfigLoaded);
        window.ViewTab.updatePlot(); // VIEWタブのグラフもリセットに伴い更新
    },

    // 外部から利用するためのセッターとゲッター
    setModelFittingSelections: (selections) => { modelFittingSelections = selections; },
    getModelFittingSelections: () => modelFittingSelections,
    setModelFunctions: (functions) => { modelFunctions = functions; },
    getModelFunctions: () => modelFunctions,
    setModelConfigLoaded: (isLoaded) => { modelConfigLoaded = isLoaded; },
    getModelConfigLoaded: () => modelConfigLoaded
};

// グローバルスコープに公開 (script.jsからアクセスするため)
window.ModelTab = ModelTab;
window.modelFittingSelections = modelFittingSelections;
window.modelFunctions = modelFunctions;
window.modelConfigLoaded = modelConfigLoaded;
window.populateFunctionTable = ModelTab.populateFunctionTable;
window.populateFittingTable = ModelTab.populateFittingTable;