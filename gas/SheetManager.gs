/**
 * シート操作管理
 * バッチ読み書き・シート参照取得
 */

/**
 * スプレッドシートのシート参照を取得
 * @return {Object} - シート参照オブジェクト
 */
function getSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  return {
    playerList: spreadsheet.getSheetByName(SHEET_NAMES.PLAYER_LIST),
    matchData: spreadsheet.getSheetByName(SHEET_NAMES.MATCH_DATA),
    ratingCalc: spreadsheet.getSheetByName(SHEET_NAMES.RATING_CALC)
  };
}

/**
 * シートの存在確認
 * @param {Object} sheets - シート参照オブジェクト
 * @return {boolean} - 全シートが存在するかどうか
 */
function validateSheets(sheets) {
  const missingSheets = [];

  if (!sheets.playerList) missingSheets.push(SHEET_NAMES.PLAYER_LIST);
  if (!sheets.matchData) missingSheets.push(SHEET_NAMES.MATCH_DATA);
  if (!sheets.ratingCalc) missingSheets.push(SHEET_NAMES.RATING_CALC);

  if (missingSheets.length > 0) {
    logError(`${ERROR_MESSAGES.SHEET_NOT_FOUND}${missingSheets.join(', ')}`);
    return false;
  }

  return true;
}

/**
 * プレイヤーデータの一括読み込み
 * @param {Sheet} sheet - プレイヤーリストシート
 * @return {Array} - プレイヤーデータ配列
 */
function loadPlayerData(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }

    const range = sheet.getRange(2, 1, lastRow - 1, 7); // A2からG列まで
    return range.getValues();
  } catch (error) {
    logError('プレイヤーデータ読み込みエラー', error);
    return [];
  }
}

/**
 * 対局データの一括読み込み
 * @param {Sheet} sheet - 対局データシート
 * @return {Array} - 対局データ配列
 */
function loadMatchData(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }

    const range = sheet.getRange(2, 1, lastRow - 1, 18); // A2からR列まで
    return range.getValues();
  } catch (error) {
    logError('対局データ読み込みエラー', error);
    return [];
  }
}

/**
 * プレイヤーデータをMapに変換（高速検索用）
 * @param {Array} playerData - プレイヤーデータ配列
 * @return {Map} - プレイヤーIDをキーとするMap
 */
function createPlayerMap(playerData) {
  const playerMap = new Map();

  playerData.forEach((row, index) => {
    const playerId = row[PLAYER_COLUMN.ID];
    if (isValidPlayerId(playerId)) {
      playerMap.set(playerId, {
        rowIndex: index + 2, // シート上の行番号（1ベース、ヘッダー行を考慮）
        id: playerId,
        name: row[PLAYER_COLUMN.NAME] || '',
        rating: isNumber(row[PLAYER_COLUMN.RATING]) ? row[PLAYER_COLUMN.RATING] : DEFAULT_VALUES.RATING,
        games: isNumber(row[PLAYER_COLUMN.GAMES]) ? row[PLAYER_COLUMN.GAMES] : DEFAULT_VALUES.GAMES,
        lastMatchDate: parseDate(row[PLAYER_COLUMN.LAST_MATCH_DATE]) || parseDate(DEFAULT_VALUES.DATE),
        prevMonthRating: isNumber(row[PLAYER_COLUMN.PREV_MONTH_RATING]) ? row[PLAYER_COLUMN.PREV_MONTH_RATING] : DEFAULT_VALUES.RATING,
        prevMonthGames: isNumber(row[PLAYER_COLUMN.PREV_MONTH_GAMES]) ? row[PLAYER_COLUMN.PREV_MONTH_GAMES] : DEFAULT_VALUES.GAMES
      });
    }
  });

  return playerMap;
}

/**
 * 最終更新日時の取得
 * @param {Sheet} sheet - レーティング算出シート
 * @return {Date|null} - 最終更新日時
 */
function getLastUpdateTime(sheet) {
  try {
    const lastUpdateValue = sheet.getRange(RATING_CALC_CELLS.LAST_UPDATE_INTERNAL).getValue();
    return parseDate(lastUpdateValue);
  } catch (error) {
    logError('最終更新日時取得エラー', error);
    return null;
  }
}

/**
 * 最終更新日時の記録
 * @param {Sheet} sheet - レーティング算出シート
 * @param {Date} updateTime - 更新日時
 */
function recordLastUpdateTime(sheet, updateTime) {
  try {
    const displayTime = `更新日時：${formatDate(updateTime, DATE_FORMAT.DISPLAY)}`;
    const internalTime = formatDate(updateTime, DATE_FORMAT.INTERNAL);

    sheet.getRange(RATING_CALC_CELLS.LAST_UPDATE_DISPLAY).setValue(displayTime);
    sheet.getRange(RATING_CALC_CELLS.LAST_UPDATE_INTERNAL).setValue(internalTime);

    logInfo(`最終更新日時を記録: ${displayTime}`);
  } catch (error) {
    logError('最終更新日時記録エラー', error);
  }
}

/**
 * プレイヤーデータの一括更新
 * @param {Sheet} sheet - プレイヤーリストシート
 * @param {Map} updateData - 更新データ（行番号をキーとするMap）
 */
function batchUpdatePlayers(sheet, updateData) {
  if (updateData.size === 0) {
    return;
  }

  try {
    // 更新データを配列に変換
    const updates = [];
    updateData.forEach((player, rowIndex) => {
      const range = sheet.getRange(rowIndex, 1, 1, 7);
      const values = [[
        player.id,
        player.name,
        player.rating,
        player.games,
        formatDate(player.lastMatchDate, DATE_FORMAT.DISPLAY),
        player.prevMonthRating,
        player.prevMonthGames
      ]];
      updates.push({ range, values });
    });

    // 一括更新実行
    updates.forEach(update => {
      update.range.setValues(update.values);
    });

    logInfo(`${updateData.size}件のプレイヤーデータを更新`);
  } catch (error) {
    logError('プレイヤーデータ一括更新エラー', error);
    throw error;
  }
}

/**
 * 新規プレイヤーの一括追加
 * @param {Sheet} sheet - プレイヤーリストシート
 * @param {Array} newPlayers - 新規プレイヤー配列
 */
function batchAddPlayers(sheet, newPlayers) {
  if (newPlayers.length === 0) {
    return;
  }

  try {
    const lastRow = sheet.getLastRow();
    const startRow = lastRow + 1;

    // 新規プレイヤーデータを2次元配列に変換
    const values = newPlayers.map(player => [
      player.id,
      player.name,
      player.rating,
      player.games,
      formatDate(player.lastMatchDate, DATE_FORMAT.DISPLAY),
      player.prevMonthRating,
      player.prevMonthGames
    ]);

    // 一括追加実行
    const range = sheet.getRange(startRow, 1, values.length, 7);
    range.setValues(values);

    logInfo(`${newPlayers.length}件の新規プレイヤーを追加`);
  } catch (error) {
    logError('新規プレイヤー一括追加エラー', error);
    throw error;
  }
}