/**
 * メインエントリーポイント
 * UIメニュー・メイン処理・トリガー管理
 */

/**
 * スプレッドシート開時にメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('レーティングシステム')
    .addItem('レーティング計算実行', 'processRatings')
    .addSeparator()
    .addItem('プレイヤー統計表示', 'showPlayerStats')
    .addItem('システム情報表示', 'showSystemInfo')
    .addSeparator()
    .addItem('テストデータ生成', 'generateTestData')
    .addItem('テスト実行', 'runTests')
    .addToUi();
}

/**
 * メインレーティング処理
 * 外部から呼び出される主要な関数
 */
function processRatings() {
  const timer = new Timer();

  try {
    logInfo('=== レーティング処理開始 ===');

    // シート参照取得・検証
    const sheets = getSheets();
    if (!validateSheets(sheets)) {
      showErrorDialog('必要なシートが見つかりません。シート構成を確認してください。');
      return;
    }

    // データ読み込みフェーズ
    logInfo('データ読み込み開始');
    const matchData = loadMatchData(sheets.matchData);
    const lastUpdateTime = getLastUpdateTime(sheets.ratingCalc);

    logInfo(`対局データ: ${matchData.length}局, 最終更新: ${lastUpdateTime ? formatDate(lastUpdateTime) : '未設定'}`);

    // 新規対局抽出
    const newMatches = findNewMatches(matchData, lastUpdateTime);
    if (newMatches.length === 0) {
      showInfoDialog(SUCCESS_MESSAGES.NO_NEW_MATCHES);
      logInfo(`処理完了: ${timer.elapsedMessage()}`);
      return;
    }

    // プレイヤーデータ処理
    logInfo('プレイヤーデータ処理開始');
    const playerResult = processPlayerData(sheets, newMatches);
    if (!playerResult.success) {
      showErrorDialog('プレイヤーデータ処理でエラーが発生しました:\n' + playerResult.errors.join('\n'));
      return;
    }

    // 対局処理フェーズ
    logInfo('対局レーティング計算開始');
    const matchResult = batchProcessMatches(newMatches, playerResult.playerMap);
    if (!matchResult.success) {
      showErrorDialog('対局処理でエラーが発生しました:\n' + matchResult.errors.join('\n'));
      return;
    }

    // データ更新フェーズ
    logInfo('データ更新開始');
    if (matchResult.playerUpdates.size > 0) {
      batchUpdatePlayers(sheets.playerList, matchResult.playerUpdates);
    }

    // 最終更新日時記録
    const latestEndTime = getLatestEndTime(newMatches) || new Date();
    recordLastUpdateTime(sheets.ratingCalc, latestEndTime);

    // 処理結果表示
    const stats = getPlayerStats(playerResult.playerMap);
    const summary = [
      `${SUCCESS_MESSAGES.PROCESS_COMPLETE}`,
      ``,
      `処理対局数: ${matchResult.processedCount}局`,
      `更新プレイヤー数: ${matchResult.playerUpdates.size}名`,
      `新規プレイヤー数: ${playerResult.newPlayersCount}名`,
      `総プレイヤー数: ${stats.totalPlayers}名`,
      ``,
      `${timer.elapsedMessage()}`
    ].join('\n');

    showSuccessDialog(summary);
    logInfo('=== レーティング処理完了 ===');

  } catch (error) {
    logError('メイン処理でエラーが発生しました', error);
    showErrorDialog(`システムエラーが発生しました:\n${error.message}\n\n実行ログを確認してください。`);
  }
}

/**
 * プレイヤー統計情報表示
 */
function showPlayerStats() {
  try {
    const sheets = getSheets();
    if (!validateSheets(sheets)) {
      showErrorDialog('必要なシートが見つかりません。');
      return;
    }

    const playerData = loadPlayerData(sheets.playerList);
    const playerMap = createPlayerMap(playerData);
    const stats = getPlayerStats(playerMap);

    if (stats.totalPlayers === 0) {
      showInfoDialog('プレイヤーデータが見つかりませんでした。');
      return;
    }

    const message = [
      '=== プレイヤー統計 ===',
      '',
      `総プレイヤー数: ${stats.totalPlayers}名`,
      `平均レーティング: ${stats.averageRating}`,
      `最高レーティング: ${stats.highestRating}`,
      `最低レーティング: ${stats.lowestRating}`,
      `平均対局数: ${stats.averageGames}局`,
      '',
      '詳細はコンソールログを確認してください。'
    ].join('\n');

    displayPlayerList(playerMap, 20);
    showInfoDialog(message);

  } catch (error) {
    logError('統計表示エラー', error);
    showErrorDialog('統計情報の取得に失敗しました。');
  }
}

/**
 * システム情報表示
 */
function showSystemInfo() {
  try {
    const sheets = getSheets();
    const sheetsStatus = [
      `${SHEET_NAMES.PLAYER_LIST}: ${sheets.playerList ? '✓' : '✗'}`,
      `${SHEET_NAMES.MATCH_DATA}: ${sheets.matchData ? '✓' : '✗'}`,
      `${SHEET_NAMES.RATING_CALC}: ${sheets.ratingCalc ? '✓' : '✗'}`
    ];

    let lastUpdate = '未設定';
    if (sheets.ratingCalc) {
      const lastUpdateTime = getLastUpdateTime(sheets.ratingCalc);
      if (lastUpdateTime) {
        lastUpdate = formatDate(lastUpdateTime);
      }
    }

    const message = [
      '=== システム情報 ===',
      '',
      '■ シート構成:',
      ...sheetsStatus,
      '',
      `■ 最終更新日時: ${lastUpdate}`,
      '',
      '■ レーティング設定:',
      `初期レーティング: ${RATING_CONFIG.INITIAL_RATING}`,
      `順位点: [${RATING_CONFIG.PLACEMENT_POINTS.join(', ')}]`,
      `補正係数: ${RATING_CONFIG.CORRECTION_FACTOR}`,
      `対局数係数: ${RATING_CONFIG.GAMES_FACTOR}`,
      `最小補正値: ${RATING_CONFIG.MIN_CORRECTION}`,
      `最大補正対局数: ${RATING_CONFIG.MAX_CORRECTION_GAMES}`
    ].join('\n');

    showInfoDialog(message);

  } catch (error) {
    logError('システム情報表示エラー', error);
    showErrorDialog('システム情報の取得に失敗しました。');
  }
}

/**
 * 成功ダイアログ表示
 * @param {string} message - メッセージ
 */
function showSuccessDialog(message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('処理完了', message, ui.ButtonSet.OK);
}

/**
 * 情報ダイアログ表示
 * @param {string} message - メッセージ
 */
function showInfoDialog(message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('情報', message, ui.ButtonSet.OK);
}

/**
 * エラーダイアログ表示
 * @param {string} message - エラーメッセージ
 */
function showErrorDialog(message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('エラー', message, ui.ButtonSet.OK);
}

/**
 * テストデータ生成（開発用）
 */
function generateTestData() {
  try {
    const result = SpreadsheetApp.getUi().alert(
      'テストデータ生成',
      'テストデータを生成しますか？\n既存データは保持されます。',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );

    if (result === SpreadsheetApp.getUi().Button.YES) {
      createTestData();
      showSuccessDialog('テストデータを生成しました。');
    }
  } catch (error) {
    logError('テストデータ生成エラー', error);
    showErrorDialog('テストデータ生成に失敗しました。');
  }
}

/**
 * テスト実行（開発用）
 */
function runTests() {
  try {
    const timer = new Timer();
    logInfo('=== テスト実行開始 ===');

    runAllTests();

    const message = `テスト実行完了\n\n${timer.elapsedMessage()}\n\n詳細はコンソールログを確認してください。`;
    showInfoDialog(message);

  } catch (error) {
    logError('テスト実行エラー', error);
    showErrorDialog('テスト実行に失敗しました。');
  }
}