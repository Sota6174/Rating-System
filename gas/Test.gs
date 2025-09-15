/**
 * テスト実行・デバッグ関数
 * 各機能のテスト・動作確認
 */

/**
 * 全テスト実行
 */
function runAllTests() {
  logInfo("=== 全テスト実行開始 ===");

  const tests = [testUtils, testRatingCalculation, testPlayerManager, testSheetManager, testDataValidation];

  let passedCount = 0;
  let failedCount = 0;

  tests.forEach((test) => {
    try {
      test();
      passedCount++;
      logInfo(`✓ ${test.name} - PASS`);
    } catch (error) {
      failedCount++;
      logError(`✗ ${test.name} - FAIL: ${error.message}`);
    }
  });

  logInfo(`=== テスト結果: ${passedCount}件成功, ${failedCount}件失敗 ===`);
}

/**
 * 簡単なテスト用対局データ作成
 */
function createSimpleTestMatch() {
  const testMatch = new Array(18).fill("");

  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2時間前
  const endTime = new Date(now.getTime() - 30 * 60 * 1000); // 30分前

  testMatch[MATCH_COLUMN.START_TIME] = startTime;
  testMatch[MATCH_COLUMN.END_TIME] = endTime;

  // テスト用プレイヤー
  const testPlayers = [
    { id: "test001", name: "テスト1位" },
    { id: "test002", name: "テスト2位" },
    { id: "test003", name: "テスト3位" },
    { id: "test004", name: "テスト4位" },
  ];

  const testScores = [15000, 5000, -5000, -15000];

  testPlayers.forEach((player, index) => {
    testMatch[MATCH_COLUMN.PLAYER_IDS[index]] = player.id;
    testMatch[MATCH_COLUMN.PLAYER_NAMES[index]] = player.name;
    testMatch[MATCH_COLUMN.SCORES[index]] = testScores[index];
    testMatch[MATCH_COLUMN.FINAL_SCORES[index]] = testScores[index] + RATING_CONFIG.PLACEMENT_POINTS[index] * 100;
  });

  return testMatch;
}

/**
 * ランダムプレイヤー選択
 */
function selectRandomPlayers(playerIds, count) {
  const selected = [];
  const available = [...playerIds];

  for (let i = 0; i < count && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available.splice(randomIndex, 1)[0]);
  }

  return selected;
}

/**
 * ユーティリティ関数テスト
 */
function testUtils() {
  // 日付パース関数テスト
  const testDate1 = parseDate("2025-01-13 10:30:00");
  if (!testDate1 || testDate1.getFullYear() !== 2025) {
    throw new Error("日付パース失敗");
  }

  const testDate2 = parseDate("invalid-date");
  if (testDate2 !== null) {
    throw new Error("無効日付のパースが失敗していない");
  }

  // 数値チェック関数テスト
  if (!isNumber(123) || isNumber("abc") || isNumber(NaN)) {
    throw new Error("数値チェック関数が正しく動作していない");
  }

  // 文字列チェック関数テスト
  if (!isNotEmpty("test") || isNotEmpty("") || isNotEmpty(null)) {
    throw new Error("文字列チェック関数が正しく動作していない");
  }
}

/**
 * レーティング計算テスト
 */
function testRatingCalculation() {
  // テスト用プレイヤー
  const testPlayer = {
    id: "test001",
    name: "テストプレイヤー",
    rating: 1500,
    games: 10,
  };

  // 1位の場合のレーティング変動テスト
  const tableAvgRating = 1500;
  const ratingChange1st = calculateRatingChange(testPlayer, 1, tableAvgRating);

  // 1位の場合は正の値になるはず
  if (ratingChange1st <= 0) {
    throw new Error("1位のレーティング変動が正の値ではない");
  }

  // 4位の場合のレーティング変動テスト
  const ratingChange4th = calculateRatingChange(testPlayer, 4, tableAvgRating);

  // 4位の場合は負の値になるはず
  if (ratingChange4th >= 0) {
    throw new Error("4位のレーティング変動が負の値ではない");
  }

  // 順位点の確認
  const expectedPlacement1st = RATING_CONFIG.PLACEMENT_POINTS[0];
  const expectedPlacement4th = RATING_CONFIG.PLACEMENT_POINTS[3];

  if (expectedPlacement1st <= expectedPlacement4th) {
    throw new Error("順位点の設定が正しくない");
  }
}

/**
 * プレイヤー管理テスト
 */
function testPlayerManager() {
  // テスト用プレイヤーデータ
  const testPlayer1 = {
    id: "test001",
    name: "テスト1",
    rating: 1500,
    games: 0,
  };

  const testPlayer2 = {
    id: "test002",
    name: "テスト2",
  };

  // デフォルト値設定テスト
  const playerWithDefaults = setPlayerDefaults(testPlayer2);

  if (playerWithDefaults.rating !== DEFAULT_VALUES.RATING) {
    throw new Error("プレイヤーデフォルト値設定が正しくない");
  }

  if (playerWithDefaults.games !== DEFAULT_VALUES.GAMES) {
    throw new Error("プレイヤーデフォルト対局数設定が正しくない");
  }

  // プレイヤー統計テスト
  const testPlayerMap = new Map();
  testPlayerMap.set("test001", testPlayer1);
  testPlayerMap.set("test002", playerWithDefaults);

  const stats = getPlayerStats(testPlayerMap);

  if (stats.totalPlayers !== 2) {
    throw new Error("プレイヤー統計の総数が正しくない");
  }

  if (stats.averageRating !== 1500) {
    throw new Error("プレイヤー統計の平均レーティングが正しくない");
  }
}

/**
 * データ検証テスト
 */
function testDataValidation() {
  // 正常な対局データ
  const validMatch = new Array(18).fill("");
  validMatch[MATCH_COLUMN.START_TIME] = new Date("2025-01-13 19:00:00");
  validMatch[MATCH_COLUMN.END_TIME] = new Date("2025-01-13 20:30:00");
  validMatch[MATCH_COLUMN.PLAYER_IDS[0]] = "player001";
  validMatch[MATCH_COLUMN.PLAYER_IDS[1]] = "player002";
  validMatch[MATCH_COLUMN.PLAYER_IDS[2]] = "player003";
  validMatch[MATCH_COLUMN.PLAYER_IDS[3]] = "player004";
  validMatch[MATCH_COLUMN.SCORES[0]] = 15000;
  validMatch[MATCH_COLUMN.SCORES[1]] = 5000;
  validMatch[MATCH_COLUMN.SCORES[2]] = -5000;
  validMatch[MATCH_COLUMN.SCORES[3]] = -15000;

  const validResult = validateMatchData(validMatch);
  if (!validResult.isValid) {
    throw new Error(`正常データの検証に失敗: ${validResult.errors.join(", ")}`);
  }

  // 異常な対局データ（重複プレイヤー）
  const invalidMatch = [...validMatch];
  invalidMatch[MATCH_COLUMN.PLAYER_IDS[1]] = "player001"; // 重複

  const invalidResult = validateMatchData(invalidMatch);
  if (invalidResult.isValid) {
    throw new Error("重複プレイヤーデータの検証でエラーが検出されない");
  }

  // 異常な対局データ（スコア不足）
  const invalidMatch2 = [...validMatch];
  invalidMatch2[MATCH_COLUMN.SCORES[0]] = ""; // スコア空欄

  const invalidResult2 = validateMatchData(invalidMatch2);
  if (invalidResult2.isValid) {
    throw new Error("不正スコアデータの検証でエラーが検出されない");
  }
}

/**
 * シート管理テスト（モック）
 */
function testSheetManager() {
  // プレイヤーマップ作成テスト
  const testPlayerData = [
    ["player001", "テスト1", 1500, 10, "2025-01-13", 1500, 10],
    ["player002", "テスト2", 1600, 15, "2025-01-12", 1550, 12],
    ["", "", "", "", "", "", ""], // 空行
  ];

  const playerMap = createPlayerMap(testPlayerData);

  if (playerMap.size !== 2) {
    throw new Error("プレイヤーマップ作成で想定外の件数");
  }

  if (!playerMap.has("player001") || !playerMap.has("player002")) {
    throw new Error("プレイヤーマップに期待するプレイヤーが含まれていない");
  }

  const player1 = playerMap.get("player001");
  if (player1.rating !== 1500 || player1.games !== 10) {
    throw new Error("プレイヤーマップの値が正しくない");
  }

  // 空行検索テスト
  const emptyRowIndex = findFirstEmptyRow(testPlayerData, 1);
  if (emptyRowIndex !== 2) {
    throw new Error("空行検索が正しく動作していない");
  }
}

/**
 * エンドツーエンドテスト（実際のシートは使用しない）
 */
function testEndToEnd() {
  logInfo("=== エンドツーエンドテスト開始 ===");

  try {
    // テスト用対局データ
    const testMatch = createSimpleTestMatch();

    // テスト用プレイヤーマップ
    const testPlayerMap = new Map();
    testPlayerMap.set("test001", {
      rowIndex: 2,
      id: "test001",
      name: "テスト1位",
      rating: 1500,
      games: 0,
      lastMatchDate: new Date("2025-01-01"),
    });
    testPlayerMap.set("test002", {
      rowIndex: 3,
      id: "test002",
      name: "テスト2位",
      rating: 1500,
      games: 0,
      lastMatchDate: new Date("2025-01-01"),
    });
    testPlayerMap.set("test003", {
      rowIndex: 4,
      id: "test003",
      name: "テスト3位",
      rating: 1500,
      games: 0,
      lastMatchDate: new Date("2025-01-01"),
    });
    testPlayerMap.set("test004", {
      rowIndex: 5,
      id: "test004",
      name: "テスト4位",
      rating: 1500,
      games: 0,
      lastMatchDate: new Date("2025-01-01"),
    });

    // 対局処理テスト
    const result = processMatchRating(testMatch, testPlayerMap);

    if (!result.success) {
      throw new Error(`対局処理失敗: ${result.errors.join(", ")}`);
    }

    if (result.updates.size !== 4) {
      throw new Error("対局処理で4人分の更新データが生成されていない");
    }

    // 1位のプレイヤーのレーティングが上昇しているかチェック
    const firstPlacePlayer = result.updates.get(2); // test001
    if (firstPlacePlayer.rating <= 1500) {
      throw new Error("1位プレイヤーのレーティングが上昇していない");
    }

    // 4位のプレイヤーのレーティングが下降しているかチェック
    const fourthPlacePlayer = result.updates.get(5); // test004
    if (fourthPlacePlayer.rating >= 1500) {
      throw new Error("4位プレイヤーのレーティングが下降していない");
    }

    // プレイヤー名が対局データから正しく取得されているかチェック
    if (firstPlacePlayer.name !== "テスト1位") {
      throw new Error("プレイヤー名が正しく更新されていない");
    }

    logInfo("✓ エンドツーエンドテスト - PASS");
  } catch (error) {
    logError(`✗ エンドツーエンドテスト - FAIL: ${error.message}`);
    throw error;
  }
}

/**
 * パフォーマンステスト
 */
function testPerformance() {
  logInfo("=== パフォーマンステスト開始 ===");

  const timer = new Timer();

  // 大量データでのテスト（100局分）
  const testMatches = [];
  const testPlayerMap = new Map();

  // テスト用プレイヤー作成
  for (let i = 1; i <= 20; i++) {
    const playerId = `perf${i.toString().padStart(3, "0")}`;
    testPlayerMap.set(playerId, {
      rowIndex: i + 1,
      id: playerId,
      name: `パフォーマンステスト${i}`,
      rating: 1500 + Math.random() * 200 - 100,
      games: Math.floor(Math.random() * 50),
      lastMatchDate: new Date("2025-01-01"),
    });
  }

  // テスト用対局データ作成
  const playerIds = Array.from(testPlayerMap.keys());
  for (let i = 0; i < 100; i++) {
    const selectedPlayers = selectRandomPlayers(playerIds, 4);
    const testMatch = new Array(18).fill("");

    const matchDate = new Date("2025-01-10");
    matchDate.setDate(matchDate.getDate() + i);

    testMatch[MATCH_COLUMN.START_TIME] = new Date(matchDate);
    testMatch[MATCH_COLUMN.END_TIME] = new Date(matchDate.getTime() + 90 * 60 * 1000);

    selectedPlayers.forEach((playerId, pos) => {
      testMatch[MATCH_COLUMN.PLAYER_IDS[pos]] = playerId;
      testMatch[MATCH_COLUMN.SCORES[pos]] = pos === 0 ? 15000 : pos === 1 ? 5000 : pos === 2 ? -5000 : -15000;
    });

    testMatches.push(testMatch);
  }

  // バッチ処理テスト
  const result = batchProcessMatches(testMatches, testPlayerMap);

  const elapsedTime = timer.elapsed();

  if (!result.success) {
    throw new Error(`パフォーマンステスト失敗: ${result.errors.join(", ")}`);
  }

  logInfo(`✓ パフォーマンステスト - PASS (${result.processedCount}局処理, ${elapsedTime.toFixed(2)}秒)`);

  // 3秒以内に処理完了することを確認
  if (elapsedTime > 3.0) {
    logError(`⚠ パフォーマンス警告: 処理時間が${elapsedTime.toFixed(2)}秒でした（目標: 3秒以内）`);
  }
}
