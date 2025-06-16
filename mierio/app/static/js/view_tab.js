// view_tab.js

// グローバル変数（script.jsからアクセスされることを想定）
let featureHeaders = [];
let targetHeaders = [];
let currentFeatureSelections = {};
let currentTargetSelection = '';
let plotlyGraphContainer;

const ViewTab = {
    init: () => {
        plotlyGraphContainer = document.getElementById('graph-container');

        // Plotlyグラフを初期化（一度だけ）
        if (!plotlyGraphContainer.dataset.plotlyInitialized || plotlyGraphContainer.dataset.plotlyInitialized === 'false') {
            Plotly.newPlot(plotlyGraphContainer, [], {
                margin: { t: 50, b: 50, l: 50, r: 50 },
                xaxis: { title: 'X-axis' },
                yaxis: { title: 'Y-axis' },
                hovermode: 'closest',
                title: 'グラフ表示エリア'
            });
            plotlyGraphContainer.dataset.plotlyInitialized = 'true';
        }

        // Thresholdボタンのトグル動作（色変更）
        document.getElementById('threshold-button').addEventListener('click', () => {
            document.getElementById('threshold-button').classList.toggle('active');
            // TODO: ここでThresholdラインの表示/非表示を切り替えるロジックを実装
        });

        // LEARNING Progress Bar (デモ)
        let progressInterval;
        document.getElementById('learning-button').addEventListener('click', () => {
            const overlapToggle = document.getElementById('overlap-toggle');
            if (overlapToggle.checked) {
                UIHandlers.updateProgressBar(0, '0%');
                let progress = 0;
                const totalSteps = 100;
                const updateInterval = 50;

                progressInterval = setInterval(() => {
                    progress += 1;
                    if (progress <= totalSteps) {
                        UIHandlers.updateProgressBar(progress, `${progress}%`);
                        if (progress % 20 === 0 && progress < 100) {
                            console.log(`Updating graph at ${progress}%`);
                        }
                    } else {
                        clearInterval(progressInterval);
                        UIHandlers.updateProgressBar(100, 'Complete!');
                    }
                }, updateInterval);
            } else {
                alert('LEARNINGを実行するには、オーバーラップスイッチをONにしてください。');
            }
        });

        // OVERLAPスイッチの動作制御
        document.getElementById('overlap-toggle').addEventListener('change', () => {
            const isOverlapEnabled = document.getElementById('overlap-toggle').checked;
            // model_tab.jsからmodelConfigLoadedフラグを取得する想定
            const isModelConfigLoaded = window.modelConfigLoaded; // script.jsを介してグローバルにアクセス
            UIHandlers.updateViewActionButtons(isOverlapEnabled, isModelConfigLoaded);
        });
    },

    /**
     * Feature Parameterのドロップダウンを動的に生成し、イベントリスナーを設定します。
     * @param {Array<string>} headers - CSVのヘッダーリスト
     */
    populateFeatureParameters: (headers) => {
        featureHeaders = headers; // グローバル変数にセット
        const container = document.getElementById('feature-params-container');
        container.innerHTML = ''; // 既存の要素をクリア

        featureHeaders.forEach((header, index) => {
            if (header.toLowerCase() !== 'main_id') {
                const row = document.createElement('div');
                row.classList.add('param-row');
                row.dataset.paramName = header;

                const dropdown = document.createElement('select');
                dropdown.classList.add('param-dropdown', 'feature-param-dropdown');
                dropdown.innerHTML = `
                    <option value="Constant">Constant</option>
                    <option value="X_axis">X_axis</option>
                    <option value="Y_axis">Y_axis</option>
                `;

                const constantInput = document.createElement('input');
                constantInput.type = 'number';
                constantInput.classList.add('constant-value-input');
                constantInput.placeholder = 'Value (if Constant)';
                constantInput.style.display = 'block';

                if (currentFeatureSelections[header]) {
                    dropdown.value = currentFeatureSelections[header].type;
                    if (currentFeatureSelections[header].type === 'Constant' && currentFeatureSelections[header].value !== undefined) {
                        constantInput.value = currentFeatureSelections[header].value;
                    } else {
                        constantInput.style.display = 'none';
                    }
                } else {
                    currentFeatureSelections[header] = { type: 'Constant', value: '' };
                }

                dropdown.addEventListener('change', (event) => {
                    const selectedType = event.target.value;
                    constantInput.style.display = (selectedType === 'Constant') ? 'block' : 'none';

                    ViewTab.handleAxisSelection(header, selectedType);

                    currentFeatureSelections[header].type = selectedType;
                    if (selectedType !== 'Constant') {
                        currentFeatureSelections[header].value = '';
                    } else {
                        currentFeatureSelections[header].value = constantInput.value;
                    }
                    ViewTab.updatePlot();
                });

                constantInput.addEventListener('input', (event) => {
                    currentFeatureSelections[header].value = event.target.value;
                    ViewTab.updatePlot();
                });

                row.appendChild(document.createTextNode(`${index + 1} "${header}" `));
                row.appendChild(dropdown);
                row.appendChild(constantInput);
                container.appendChild(row);
            }
        });
        ViewTab.updatePlot();
    },

    /**
     * X_axis / Y_axis の重複選択を防止し、ドロップダウンを更新します。
     * @param {string} changedParamName - 変更があったパラメータ名
     * @param {string} selectedType - 選択されたタイプ ('X_axis' or 'Y_axis')
     */
    handleAxisSelection: (changedParamName, selectedType) => {
        if (selectedType === 'X_axis' || selectedType === 'Y_axis') {
            document.querySelectorAll('.feature-param-dropdown').forEach(dropdown => {
                const paramName = dropdown.closest('.param-row').dataset.paramName;
                if (paramName !== changedParamName && dropdown.value === selectedType) {
                    dropdown.value = 'Constant';
                    const constantInput = dropdown.closest('.param-row').querySelector('.constant-value-input');
                    if (constantInput) constantInput.style.display = 'block';

                    currentFeatureSelections[paramName].type = 'Constant';
                    currentFeatureSelections[paramName].value = constantInput ? constantInput.value : '';
                }
            });
        }
    },

    /**
     * Target Parameterのドロップダウンを動的に生成し、イベントリスナーを設定します。
     * @param {Array<string>} headers - CSVのヘッダーリスト
     */
    populateTargetParameters: (headers) => {
        targetHeaders = headers; // グローバル変数にセット
        const container = document.getElementById('target-params-container');
        container.innerHTML = '';

        const row = document.createElement('div');
        row.classList.add('param-row');
        const select = document.createElement('select');
        select.id = 'target-param-dropdown';
        select.classList.add('param-dropdown');
        select.innerHTML = '<option value="">-- Targetを選択 --</option>';

        targetHeaders.forEach(header => {
            if (header.toLowerCase() !== 'main_id') {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                select.appendChild(option);
            }
        });

        if (currentTargetSelection) {
            select.value = currentTargetSelection;
        }

        select.addEventListener('change', (event) => {
            currentTargetSelection = event.target.value;
            ViewTab.updatePlot();
        });

        row.appendChild(select);
        container.appendChild(row);
        ViewTab.updatePlot();
    },

    /**
     * バックエンドからPlotlyグラフデータを取得し、グラフを更新します。
     */
    updatePlot: async () => {
        const selectedX = Object.values(currentFeatureSelections).find(s => s.type === 'X_axis');
        const selectedY = Object.values(currentFeatureSelections).find(s => s.type === 'Y_axis');
        const selectedTarget = currentTargetSelection;

        if (!selectedX || !selectedY || !selectedTarget) {
            plotlyGraphContainer.style.display = 'none';
            return;
        }

        const missingConstantValue = Object.values(currentFeatureSelections).some(s =>
            s.type === 'Constant' && (s.value === '' || s.value === undefined || s.value === null)
        );
        if (missingConstantValue) {
            plotlyGraphContainer.style.display = 'none';
            return;
        }

        plotlyGraphContainer.style.display = 'flex';
        // Plotlyグラフを初期化（念のため再度チェック）
        if (!plotlyGraphContainer.dataset.plotlyInitialized || plotlyGraphContainer.dataset.plotlyInitialized === 'false') {
            Plotly.newPlot(plotlyGraphContainer, [], {
                margin: { t: 50, b: 50, l: 50, r: 50 },
                xaxis: { title: 'X-axis' },
                yaxis: { title: 'Y-axis' },
                hovermode: 'closest',
                title: 'グラフ表示エリア'
            });
            plotlyGraphContainer.dataset.plotlyInitialized = 'true';
        }


        const payload = {
            featureParams: Object.keys(currentFeatureSelections).map(key => ({
                name: key,
                type: currentFeatureSelections[key].type,
                value: currentFeatureSelections[key].value
            })),
            targetParam: selectedTarget
        };

        try {
            const result = await APIService.getPlotData(payload);

            if (result.error) {
                console.error('Failed to get plot data:', result.error);
                Plotly.react(plotlyGraphContainer, [], { title: `グラフ表示エラー: ${result.error}` });
            } else {
                const graphData = JSON.parse(result.graph_json);
                const graphLayout = JSON.parse(result.layout_json);
                Plotly.react(plotlyGraphContainer, graphData, graphLayout);
            }
        } catch (error) {
            console.error('Error fetching plot data:', error);
            Plotly.react(plotlyGraphContainer, [], { title: `通信エラー: ${error.message}` });
        }
    },

    /**
     * グラフの表示/非表示を決定します。
     * Feature/TargetのCSVが両方ロードされており、かつPlotlyが初期化済みの場合に表示。
     */
    updatePlotDisplayState: () => {
        if (featureHeaders.length > 0 && targetHeaders.length > 0) {
            plotlyGraphContainer.style.display = 'flex';
            // Plotlyグラフを初期化（一度だけ）
            if (!plotlyGraphContainer.dataset.plotlyInitialized || plotlyGraphContainer.dataset.plotlyInitialized === 'false') {
                 Plotly.newPlot(plotlyGraphContainer, [], {
                    margin: { t: 50, b: 50, l: 50, r: 50 },
                    xaxis: { title: 'X-axis' },
                    yaxis: { title: 'Y-axis' },
                    hovermode: 'closest',
                    title: 'グラフ表示エリア'
                });
                plotlyGraphContainer.dataset.plotlyInitialized = 'true';
            }
        } else {
            plotlyGraphContainer.style.display = 'none';
            plotlyGraphContainer.dataset.plotlyInitialized = 'false'; // 非表示になったら初期化フラグをリセット
            Plotly.purge(plotlyGraphContainer); // グラフをクリア
        }
    },

    // 外部から利用するためのセッター
    setFeatureHeaders: (headers) => { featureHeaders = headers; },
    setTargetHeaders: (headers) => { targetHeaders = headers; },
    setCurrentFeatureSelections: (selections) => { currentFeatureSelections = selections; },
    setCurrentTargetSelection: (selection) => { currentTargetSelection = selection; },
    getFeatureHeaders: () => featureHeaders,
    getTargetHeaders: () => targetHeaders,
    getCurrentFeatureSelections: () => currentFeatureSelections,
    getCurrentTargetSelection: () => currentTargetSelection
};

// グローバルスコープに公開 (script.jsからアクセスするため)
window.ViewTab = ViewTab;
window.featureHeaders = featureHeaders;
window.targetHeaders = targetHeaders;
window.currentFeatureSelections = currentFeatureSelections;
window.currentTargetSelection = currentTargetSelection;
window.updatePlot = ViewTab.updatePlot; // script.jsのDOMContentLoadedイベントで呼び出せるように