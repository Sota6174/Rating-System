/**
 * テストデータ生成
 * サンプルプレイヤー・対局データの生成
 */

/**
 * テストデータ作成（メイン関数）
 */
function createTestData() {
  logInfo('=== テストデータ作成開始 ===');

  try {
    const sheets = getSheets();
    if (!validateSheets(sheets)) {
      throw new Error('必要なシートが見つかりません');
    }

    // サンプルプレイヤー作成
    createSamplePlayers(sheets.playerList);

    // サンプル対局データ作成
    createSampleMatches(sheets.matchData);

    // 初期更新日時設定
    const initialDate = new Date('2025-01-01 00:00:00');
    recordLastUpdateTime(sheets.ratingCalc, initialDate);

    logInfo('=== テストデータ作成完了 ===');

  } catch (error) {
    logError('テストデータ作成エラー', error);
    throw error;
  }
}

/**
 * サンプルプレイヤー作成
 * @param {Sheet} sheet - プレイヤーリストシート
 */
function createSamplePlayers(sheet) {
  const samplePlayers = [
    { id: 'player001', name: '山田太郎' },
    { id: 'player002', name: '佐藤花子' },
    { id: 'player003', name: '田中次郎' },
    { id: 'player004', name: '鈴木美咲' },
    { id: 'player005', name: '高橋健一' },
    { id: 'player006', name: '渡辺由美' },
    { id: 'player007', name: '伊藤誠' },
    { id: 'player008', name: '中村愛' },
    { id: 'player009', name: '小林大輔' },
    { id: 'player010', name: '加藤理恵' }
  ];

  // プレイヤーにデフォルト値設定
  const playersWithDefaults = samplePlayers.map(player => setPlayerDefaults({
    ...player,
    rating: RATING_CONFIG.INITIAL_RATING + (Math.random() - 0.5) * 200, // ±100のランダム値
    games: Math.floor(Math.random() * 50), // 0-49の対局数
    lastMatchDate: new Date('2025-01-01')
  }));

  // 既存プレイヤーチェック
  const existingData = loadPlayerData(sheet);
  const existingIds = new Set(existingData.map(row => row[PLAYER_COLUMN.ID]));

  const newPlayers = playersWithDefaults.filter(player => !existingIds.has(player.id));

  if (newPlayers.length > 0) {
    batchAddPlayers(sheet, newPlayers);
    logInfo(`${newPlayers.length}名のサンプルプレイヤーを追加`);
  } else {
    logInfo('サンプルプレイヤーは既に存在します');
  }
}

/**
 * サンプル対局データ作成
 * @param {Sheet} sheet - 対局データシート
 */
function createSampleMatches(sheet) {
  const playerIds = [
    'player001', 'player002', 'player003', 'player004', 'player005',
    'player006', 'player007', 'player008', 'player009', 'player010'
  ];

  const playerNames = [
    '山田太郎', '佐藤花子', '田中次郎', '鈴木美咲', '高橋健一',
    '渡辺由美', '伊藤誠', '中村愛', '小林大輔', '加藤理恵'
  ];

  const matches = [];
  const baseDate = new Date('2025-01-10 19:00:00');

  // 30局のサンプル対局を生成
  for (let i = 0; i < 30; i++) {
    // ランダムに4人選択
    const selectedIndices = getRandomPlayers(4, playerIds.length);
    const matchPlayers = selectedIndices.map(index => ({
      id: playerIds[index],
      name: playerNames[index]
    }));

    // 対局時間（基準日から i 日後）
    const matchDate = new Date(baseDate);
    matchDate.setDate(matchDate.getDate() + i);
    matchDate.setHours(19 + Math.floor(Math.random() * 4)); // 19-22時
    matchDate.setMinutes(Math.floor(Math.random() * 60));

    const startTime = new Date(matchDate);
    const endTime = new Date(matchDate);
    endTime.setMinutes(endTime.getMinutes() + 90 + Math.floor(Math.random() * 60)); // 90-150分

    // スコア生成（合計0になるように調整）
    const scores = generateMatchScores();

    // 対局データ行作成
    const matchRow = new Array(18).fill('');
    matchRow[MATCH_COLUMN.START_TIME] = startTime;
    matchRow[MATCH_COLUMN.END_TIME] = endTime;

    matchPlayers.forEach((player, index) => {
      matchRow[MATCH_COLUMN.PLAYER_IDS[index]] = player.id;
      matchRow[MATCH_COLUMN.PLAYER_NAMES[index]] = player.name;
      matchRow[MATCH_COLUMN.SCORES[index]] = scores[index];
      matchRow[MATCH_COLUMN.FINAL_SCORES[index]] = calculateFinalScore(scores[index], index + 1);
    });

    matches.push(matchRow);
  }

  // 既存データの最終行を取得
  const lastRow = sheet.getLastRow();
  const startRow = lastRow + 1;

  // 一括でデータを追加
  if (matches.length > 0) {
    const range = sheet.getRange(startRow, 1, matches.length, 18);
    range.setValues(matches);
    logInfo(`${matches.length}局のサンプル対局データを追加`);
  }
}

/**
 * ランダムなプレイヤー選択
 * @param {number} count - 選択人数
 * @param {number} totalPlayers - 総プレイヤー数
 * @return {Array} - 選択されたプレイヤーのインデックス配列
 */
function getRandomPlayers(count, totalPlayers) {
  const indices = [];
  const used = new Set();

  while (indices.length < count) {
    const index = Math.floor(Math.random() * totalPlayers);
    if (!used.has(index)) {
      indices.push(index);
      used.add(index);
    }
  }

  return indices;
}

/**
 * 対局スコア生成
 * @return {Array} - 4人分のスコア配列（合計0）
 */
function generateMatchScores() {
  // 基本的な麻雀スコア分布に近いランダム生成
  const baseScores = [
    Math.floor(Math.random() * 20000) + 10000,  // 1位: 10000-30000
    Math.floor(Math.random() * 10000),          // 2位: 0-10000
    Math.floor(Math.random() * 10000) * -1,     // 3位: -10000-0
    Math.floor(Math.random() * 20000) * -1 - 10000  // 4位: -30000--10000
  ];

  // 合計を0に調整
  const total = baseScores.reduce((sum, score) => sum + score, 0);
  baseScores[0] -= total; // 1位のスコアで調整

  // 100点単位に丸める
  return baseScores.map(score => Math.round(score / 100) * 100);
}

/**
 * 最終スコア計算（順位に応じたウマ・オカを含む）
 * @param {number} score - 基本スコア
 * @param {number} placement - 順位
 * @return {number} - 最終スコア
 */
function calculateFinalScore(score, placement) {
  // 簡単なウマ・オカ計算（+30/+10/-10/-30）
  const uma = RATING_CONFIG.PLACEMENT_POINTS[placement - 1];
  return score + uma * 100; // 100点単位に変換
}

/**
 * テスト用の特定対局データ作成
 * @return {Array} - テスト用対局データ
 */
function createTestMatch() {
  const testMatch = new Array(18).fill('');

  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2時間前
  const endTime = new Date(now.getTime() - 30 * 60 * 1000); // 30分前

  testMatch[MATCH_COLUMN.START_TIME] = startTime;
  testMatch[MATCH_COLUMN.END_TIME] = endTime;

  // テスト用プレイヤー
  const testPlayers = [
    { id: 'test001', name: 'テスト1位' },
    { id: 'test002', name: 'テスト2位' },
    { id: 'test003', name: 'テスト3位' },
    { id: 'test004', name: 'テスト4位' }
  ];

  const testScores = [15000, 5000, -5000, -15000];

  testPlayers.forEach((player, index) => {
    testMatch[MATCH_COLUMN.PLAYER_IDS[index]] = player.id;
    testMatch[MATCH_COLUMN.PLAYER_NAMES[index]] = player.name;
    testMatch[MATCH_COLUMN.SCORES[index]] = testScores[index];
    testMatch[MATCH_COLUMN.FINAL_SCORES[index]] = calculateFinalScore(testScores[index], index + 1);
  });

  return testMatch;
}