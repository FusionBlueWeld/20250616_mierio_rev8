// mierio/app/static/js/script.js

// script.js

document.addEventListener('DOMContentLoaded', () => {
    // UIハンドラの初期化
    UIHandlers.initTabSwitching();
    UIHandlers.initLedButtons();

    // VIEWタブの初期化
    ViewTab.init();

    // MODELタブの初期化
    ModelTab.init();

    // ファイル選択ボタンの処理 (ファイル名表示とUI更新)
    UIHandlers.setupFileInput(
        'feature-file-input',
        'feature-file-name',
        'feature',
        (fileType, headers) => { // onFileUploadSuccess
            ViewTab.setFeatureHeaders(headers);
            ViewTab.setCurrentFeatureSelections({}); // ヘッダーが変わったら選択状態をリセット
            ModelTab.setModelFittingSelections({}); // MODELタブの選択状態もリセット
            ViewTab.populateFeatureParameters(headers);
            ViewTab.updatePlotDisplayState();
            ViewTab.updatePlot();
            ModelTab.populateFittingTable();
            UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
            UIHandlers.updateModelFileButtonState(); // Modelボタンの状態を更新
        },
        (fileType) => { // onFileClear
            ViewTab.setFeatureHeaders([]);
            ViewTab.setCurrentFeatureSelections({});
            ModelTab.setModelFittingSelections({});
            document.getElementById('feature-params-container').innerHTML = '';
            ViewTab.updatePlotDisplayState();
            ViewTab.updatePlot();
            ModelTab.populateFittingTable();
            UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
            UIHandlers.updateModelFileButtonState(); // Modelボタンの状態を更新
        }
    );

    UIHandlers.setupFileInput(
        'target-file-input',
        'target-file-name',
        'target',
        (fileType, headers) => { // onFileUploadSuccess
            ViewTab.setTargetHeaders(headers);
            ViewTab.setCurrentTargetSelection(''); // ヘッダーが変わったら選択状態をリセット
            ModelTab.setModelFittingSelections({}); // MODELタブの選択状態もリセット
            ViewTab.populateTargetParameters(headers);
            ViewTab.updatePlotDisplayState();
            ViewTab.updatePlot();
            ModelTab.populateFittingTable();
            UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
            UIHandlers.updateModelFileButtonState(); // Modelボタンの状態を更新
        },
        (fileType) => { // onFileClear
            ViewTab.setTargetHeaders([]);
            ViewTab.setCurrentTargetSelection('');
            ModelTab.setModelFittingSelections({});
            document.getElementById('target-params-container').innerHTML = '';
            ViewTab.updatePlotDisplayState();
            ViewTab.updatePlot();
            ModelTab.populateFittingTable();
            UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
            UIHandlers.updateModelFileButtonState(); // Modelボタンの状態を更新
        }
    );

    // --- Modelファイル選択コンポーネントの処理を追加 ---
    const modelFileInput = document.getElementById('model-file-input');
    const modelFileNameDisplay = document.getElementById('model-file-name');
    const modelDisplayName = document.getElementById('model-display-name'); // MODELタブのModel Nameテキストボックス

    modelFileInput.addEventListener('change', async (event) => {
        if (event.target.files.length > 0) {
            const file = event.target.files[0];
            modelFileNameDisplay.value = file.name;
            
            try {
                // APIService.loadModelConfig を直接呼び出す
                const result = await APIService.loadModelConfig(file.name);

                if (result.error) {
                    alert(`モデル設定のロードに失敗しました: ${result.error}`);
                    modelFileNameDisplay.value = '';
                    modelDisplayName.value = ''; // ロード失敗時はMODELタブの表示もクリア
                    ModelTab.setModelConfigLoaded(false); // ロード失敗
                } else {
                    alert(result.message);
                    // ロード成功後、ModelTabの内部状態を更新
                    ModelTab.setModelFittingSelections(result.fitting_config || {});
                    document.getElementById('fitting-method-toggle').checked = (result.fitting_method === '線形結合');
                    document.getElementById('fitting-method-label').textContent = result.fitting_method;
                    ModelTab.setModelFunctions(result.functions || []);
                    ModelTab.setModelConfigLoaded(true); // ロード成功

                    modelDisplayName.value = result.model_name || ''; // モデル名をテキストボックスに反映

                    ModelTab.populateFunctionTable();
                    ModelTab.populateFittingTable();
                    UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
                    ViewTab.updatePlot(); // ロード後、VIEWタブのグラフを更新
                }
            } catch (error) {
                console.error('Error loading model config from main screen:', error);
                alert(`モデル設定ロード中にエラーが発生しました: ${error.message}`);
                modelFileNameDisplay.value = '';
                modelDisplayName.value = ''; // エラー時はMODELタブの表示もクリア
                ModelTab.setModelConfigLoaded(false); // ロード失敗
            }
        } else {
            modelFileNameDisplay.value = '';
            modelDisplayName.value = ''; // ファイル選択解除時はMODELタブの表示もクリア
            ModelTab.setModelConfigLoaded(false); // ファイル選択解除
            ModelTab.resetModelSettings(); // モデル設定をリセット
        }
    });
    // --- Modelファイル選択コンポーネントの処理 追加終わり ---


    // VIEWタブの初期ボタン状態設定
    UIHandlers.updateViewActionButtons(document.getElementById('overlap-toggle').checked, ModelTab.getModelConfigLoaded());
    UIHandlers.updateModelFileButtonState(); // 初期ロード時にModelボタンの状態を更新
});