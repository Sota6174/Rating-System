/**
 * 設定定数ファイル
 * レーティングシステムの全設定値を管理
 */

// シート名定数
const SHEET_NAMES = {
  PLAYER_LIST: '統計情報',
  MATCH_DATA: '整形C',
  RATING_CALC: 'レーティング算出'
};

// プレイヤーリストのカラム定数
const PLAYER_COLUMN = {
  ID: 0,                    // A列: 雀魂ID
  NAME: 1,                  // B列: 雀魂名
  RATING: 2,                // C列: レーティング
  GAMES: 3,                 // D列: 累計対局数
  LAST_MATCH_DATE: 4,       // E列: 最終対局日時
  PREV_MONTH_RATING: 5,     // F列: 先月末レーティング
  PREV_MONTH_GAMES: 6       // G列: 先月末累計対局数
};

// 対局データのカラム定数
const MATCH_COLUMN = {
  START_TIME: 0,            // A列: 開始時間
  END_TIME: 1,              // B列: 終了時間
  PLAYER_IDS: [2, 3, 4, 5], // C-F列: プレイヤーID
  PLAYER_NAMES: [6, 7, 8, 9], // G-J列: プレイヤー名
  SCORES: [10, 11, 12, 13], // K-N列: 得点
  FINAL_SCORES: [14, 15, 16, 17] // O-R列: スコア
};

// レーティング算出シートのセル定数
const RATING_CALC_CELLS = {
  LAST_UPDATE_DISPLAY: 'A1', // 表示用更新日時
  LAST_UPDATE_INTERNAL: 'B1' // 内部用更新日時
};

// レーティング計算定数
const RATING_CONFIG = {
  INITIAL_RATING: 1500,              // 初期レーティング
  PLACEMENT_POINTS: [30, 10, -10, -30], // 順位点（1位〜4位）
  CORRECTION_FACTOR: 40,              // 平均レート補正係数
  GAMES_FACTOR: 0.002,                // 対局数係数
  MIN_CORRECTION: 0.2,                // 最小補正値
  MAX_CORRECTION_GAMES: 300           // 最大補正対局数
};

// デフォルト値定数
const DEFAULT_VALUES = {
  RATING: 1500,
  GAMES: 0,
  DATE: '2025/01/01'
};

// エラーメッセージ定数
const ERROR_MESSAGES = {
  SHEET_NOT_FOUND: 'シートが見つかりません: ',
  INVALID_DATE: '不正な日時形式です: ',
  DUPLICATE_PLAYER: '重複したプレイヤーIDです: ',
  INVALID_MATCH_DATA: '無効な対局データです',
  CALCULATION_ERROR: 'レーティング計算エラー: '
};

// 処理結果メッセージ定数
const SUCCESS_MESSAGES = {
  PROCESS_COMPLETE: 'レーティング処理が完了しました',
  NO_NEW_MATCHES: '新規対局データが見つかりませんでした',
  PLAYERS_UPDATED: '名のプレイヤーデータを更新しました',
  MATCHES_PROCESSED: '局の対局データを処理しました'
};

// 日付フォーマット定数
const DATE_FORMAT = {
  DISPLAY: 'yyyy/MM/dd HH:mm:ss',     // 表示用フォーマット
  INTERNAL: 'yyyy-MM-dd HH:mm:ss'     // 内部処理用フォーマット
};