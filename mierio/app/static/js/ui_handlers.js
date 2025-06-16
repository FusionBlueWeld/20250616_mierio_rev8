// ui_handlers.js

const UIHandlers = {
    /**
     * タブ切り替え機能を初期化します。
     */
    initTabSwitching: () => {
        window.openTab = (evt, tabName) => {
            const tabContents = document.getElementsByClassName('tab-content');
            for (let i = 0; i < tabContents.length; i++) {
                tabContents[i].style.display = 'none';
            }

            const tabButtons = document.getElementsByClassName('tab-button');
            for (let i = 0; i < tabButtons.length; i++) {
                tabButtons[i].classList.remove('active');
            }

            document.getElementById(tabName).style.display = 'block';
            evt.currentTarget.classList.add('active');

            // タブ切り替え時の処理はscript.jsで管理
            // 各タブの初期化/更新関数を呼び出す
            if (tabName === 'view-tab') {
                if (window.updatePlot) window.updatePlot();
            } else if (tabName === 'model-tab') {
                if (window.populateFunctionTable) window.populateFunctionTable();
                if (window.populateFittingTable) window.populateFittingTable();
            }
        };

        // 初期表示時に'VIEW'タブをアクティブにする
        document.querySelector('.tab-button.active').click();
    },

    /**
     * ファイル名表示とファイルアップロードのイベントリスナーを設定します。
     * @param {string} fileInputId - ファイル入力要素のID
     * @param {string} fileNameDisplayId - ファイル名表示要素のID
     * @param {string} fileType - 'feature' または 'target'
     * @param {Function} onFileUploadSuccess - ファイルアップロード成功時に呼び出すコールバック
     * @param {Function} onFileClear - ファイル選択が解除された時に呼び出すコールバック
     */
    setupFileInput: (fileInputId, fileNameDisplayId, fileType, onFileUploadSuccess, onFileClear) => {
        const fileInput = document.getElementById(fileInputId);
        const fileNameDisplay = document.getElementById(fileNameDisplayId);

        fileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                fileNameDisplay.value = event.target.files[0].name;
                const result = await APIService.uploadCSV(event.target.files[0], fileType);
                if (result.error) {
                    alert(`ファイルのアップロードに失敗しました: ${result.error}`);
                    fileNameDisplay.value = '';
                    onFileClear(fileType); // エラー時もクリア処理
                } else {
                    onFileUploadSuccess(fileType, result.headers);
                }
            } else {
                fileNameDisplay.value = '';
                onFileClear(fileType);
            }
            // FeatureまたはTargetファイルが変更されたらModelファイルのボタンの状態を更新
            UIHandlers.updateModelFileButtonState();
        });
    },

    /**
     * LEDボタンのトグル機能を初期化します。
     */
    initLedButtons: () => {
        const ledButtons = document.querySelectorAll('.led-button');
        ledButtons.forEach(button => {
            button.addEventListener('click', () => {
                const ledIndicator = button.querySelector('.led-indicator');
                ledIndicator.classList.toggle('active');
            });
        });
    },

    /**
     * 学習プログレスバーを更新します。
     * @param {number} progress - 0から100までの進捗率
     * @param {string} text - 表示するテキスト
     */
    updateProgressBar: (progress, text) => {
        const progressBarContainer = document.getElementById('learning-progress-bar-container');
        const progressBar = document.getElementById('learning-progress-bar');
        const progressText = document.getElementById('learning-progress-text');

        if (progress === 0) {
            progressBarContainer.style.display = 'block';
        }

        progressBar.style.width = `${progress}%`;
        progressText.textContent = text;

        if (progress >= 100) {
            setTimeout(() => {
                progressBarContainer.style.display = 'none';
                progressText.textContent = '';
            }, 2000); // 完了後2秒で非表示
        }
    },

    /**
     * VIEWタブのインタラクションボタン（LEARNING, Thresholdなど）の状態を更新します。
     * @param {boolean} isOverlapEnabled - オーバーラップスイッチがONか
     * @param {boolean} isModelConfigLoaded - モデル設定がロードされているか
     */
    updateViewActionButtons: (isOverlapEnabled, isModelConfigLoaded) => {
        const learningButton = document.getElementById('learning-button');
        const thresholdButton = document.getElementById('threshold-button');
        const thresholdValueInput = document.getElementById('threshold-value');
        const overlapToggle = document.getElementById('overlap-toggle');

        overlapToggle.disabled = !isModelConfigLoaded; // モデルがロードされていなければオーバーラップは無効

        if (isOverlapEnabled && isModelConfigLoaded) {
            learningButton.disabled = false;
            thresholdButton.disabled = false;
            thresholdValueInput.disabled = false;
        } else {
            learningButton.disabled = true;
            thresholdButton.disabled = true;
            thresholdValueInput.disabled = true;
            thresholdButton.classList.remove('active');
        }
    },

    /**
     * Modelファイル選択ボタンの状態を更新します。
     * FeatureとTargetのCSVが両方ロードされている場合に有効化します。
     */
    updateModelFileButtonState: () => {
        const featureFileName = document.getElementById('feature-file-name').value;
        const targetFileName = document.getElementById('target-file-name').value;
        const modelFileButton = document.getElementById('model-file-button');

        if (featureFileName && targetFileName) {
            modelFileButton.disabled = false;
            modelFileButton.style.backgroundColor = '#28a745'; // 緑色
            modelFileButton.style.cursor = 'pointer';
        } else {
            modelFileButton.disabled = true;
            modelFileButton.style.backgroundColor = '#6c757d'; // 灰色
            modelFileButton.style.cursor = 'not-allowed';
        }
    }
};