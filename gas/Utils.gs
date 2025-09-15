/**
 * ユーティリティ関数
 * 共通関数・日付処理・データ検証
 */

/**
 * 日付文字列をDateオブジェクトに変換
 * @param {string|Date} dateValue - 日付値
 * @return {Date|null} - Dateオブジェクトまたはnull
 */
function parseDate(dateValue) {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return dateValue;
  }

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    console.log(`日付変換エラー: ${dateValue} - ${error.message}`);
    return null;
  }
}

/**
 * 日付を指定フォーマットで文字列に変換
 * @param {Date} date - 日付オブジェクト
 * @param {string} format - フォーマット文字列
 * @return {string} - フォーマットされた日付文字列
 */
function formatDate(date, format = DATE_FORMAT.DISPLAY) {
  if (!date || !(date instanceof Date)) {
    return "";
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), format);
}

/**
 * 数値型チェック
 * @param {*} value - チェックする値
 * @return {boolean} - 数値かどうか
 */
function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}

/**
 * 文字列が空でないかチェック
 * @param {*} value - チェックする値
 * @return {boolean} - 空でない文字列かどうか
 */
function isNotEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * プレイヤーIDの妥当性チェック
 * @param {string} playerId - プレイヤーID
 * @return {boolean} - 妥当かどうか
 */
function isValidPlayerId(playerId) {
  return isNotEmpty(playerId) && playerId.length > 0;
}

/**
 * 対局データの基本検証
 * @param {Array} matchRow - 対局データの行
 * @return {Object} - 検証結果 {isValid: boolean, errors: string[]}
 */
function validateMatchData(matchRow) {
  const errors = [];

  // 開始時間チェック
  if (!parseDate(matchRow[MATCH_COLUMN.START_TIME])) {
    errors.push("開始時間が無効です");
  }

  // 終了時間チェック
  if (!parseDate(matchRow[MATCH_COLUMN.END_TIME])) {
    errors.push("終了時間が無効です");
  }

  // プレイヤーIDチェック
  const playerIds = MATCH_COLUMN.PLAYER_IDS.map((col) => matchRow[col]);
  const validPlayerIds = playerIds.filter((id) => isValidPlayerId(id));

  if (validPlayerIds.length !== 4) {
    errors.push("プレイヤーIDが4人分必要です");
  }

  // プレイヤーID重複チェック
  const uniqueIds = new Set(validPlayerIds);
  if (uniqueIds.size !== validPlayerIds.length) {
    errors.push("プレイヤーIDに重複があります");
  }

  // スコアチェック
  const scores = MATCH_COLUMN.SCORES.map((col) => matchRow[col]);
  const validScores = scores.filter((score) => isNumber(score));

  if (validScores.length !== 4) {
    errors.push("スコアが4人分必要です");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * 空白行を見つける（プレイヤーリストシート用）
 * @param {Array} data - シートデータ
 * @param {number} startRow - 開始行（0ベース）
 * @return {number} - 空白行のインデックス
 */
function findFirstEmptyRow(data, startRow = 1) {
  for (let i = startRow; i < data.length; i++) {
    if (!data[i][PLAYER_COLUMN.ID] || data[i][PLAYER_COLUMN.ID] === "") {
      return i;
    }
  }
  return data.length;
}

/**
 * プレイヤーデータの初期値設定
 * @param {Object} player - プレイヤーオブジェクト
 * @return {Object} - 初期値が設定されたプレイヤーオブジェクト
 */
function setPlayerDefaults(player) {
  return {
    id: player.id || "",
    name: player.name || "",
    rating: isNumber(player.rating) ? player.rating : DEFAULT_VALUES.RATING,
    games: isNumber(player.games) ? player.games : DEFAULT_VALUES.GAMES,
    lastMatchDate: parseDate(player.lastMatchDate) || parseDate(DEFAULT_VALUES.DATE),
    prevMonthRating: isNumber(player.prevMonthRating) ? player.prevMonthRating : DEFAULT_VALUES.RATING,
    prevMonthGames: isNumber(player.prevMonthGames) ? player.prevMonthGames : DEFAULT_VALUES.GAMES,
  };
}

/**
 * エラーログ出力
 * @param {string} message - エラーメッセージ
 * @param {Error} error - エラーオブジェクト（任意）
 */
function logError(message, error = null) {
  let fullMessage = `✗ エラー: ${message}`;
  if (error) {
    fullMessage += ` - ${error.message}`;
  }
  console.log(fullMessage);
}

/**
 * 情報ログ出力
 * @param {string} message - メッセージ
 */
function logInfo(message) {
  console.log(`ℹ 情報: ${message}`);
}

/**
 * 処理時間計測用のタイマークラス
 */
class Timer {
  constructor() {
    this.startTime = new Date();
  }

  elapsed() {
    const endTime = new Date();
    return (endTime - this.startTime) / 1000; // 秒単位
  }

  elapsedMessage() {
    return `処理時間: ${this.elapsed().toFixed(2)}秒`;
  }
}
