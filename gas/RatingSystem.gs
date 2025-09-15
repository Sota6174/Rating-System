/**
 * レーティングシステム
 * レーティング計算ロジック・対局データ処理
 */

/**
 * レーティング変動計算
 * @param {Object} player - プレイヤーオブジェクト
 * @param {number} placement - 順位（1-4）
 * @param {number} tableAvgRating - 卓の平均レーティング
 * @return {number} - レーティング変動値
 */
function calculateRatingChange(player, placement, tableAvgRating) {
  // 1. 順位点
  const placementPoint = RATING_CONFIG.PLACEMENT_POINTS[placement - 1];

  // 2. 平均レート補正
  const avgRatingCorrection = (tableAvgRating - player.rating) / RATING_CONFIG.CORRECTION_FACTOR;

  // 3. 対局数補正
  let gamesCorrection;
  if (player.games < RATING_CONFIG.MAX_CORRECTION_GAMES) {
    gamesCorrection = 1 - player.games * RATING_CONFIG.GAMES_FACTOR;
  } else {
    gamesCorrection = RATING_CONFIG.MIN_CORRECTION;
  }

  // 4. レート変動計算
  const ratingChange = gamesCorrection * (placementPoint + avgRatingCorrection);

  return ratingChange;
}

/**
 * 対局のレーティング計算処理
 * @param {Array} matchRow - 対局データの行
 * @param {Map} playerMap - プレイヤーマップ
 * @return {Object} - 計算結果 {success: boolean, updates: Map, errors: string[]}
 */
function processMatchRating(matchRow, playerMap) {
  const result = {
    success: false,
    updates: new Map(),
    errors: [],
  };

  try {
    // 対局データ検証
    const validation = validateMatchData(matchRow);
    if (!validation.isValid) {
      result.errors = validation.errors;
      return result;
    }

    // プレイヤー情報取得
    const players = [];
    const playerIds = MATCH_COLUMN.PLAYER_IDS.map((col) => matchRow[col]);
    const playerNames = MATCH_COLUMN.PLAYER_NAMES.map((col) => matchRow[col]);
    const scores = MATCH_COLUMN.SCORES.map((col) => matchRow[col]);

    for (let i = 0; i < 4; i++) {
      const playerId = playerIds[i];
      const playerName = playerNames[i];
      const score = scores[i];

      if (!playerMap.has(playerId)) {
        result.errors.push(`プレイヤーが見つかりません: ${playerId}`);
        return result;
      }

      const player = playerMap.get(playerId);
      players.push({
        ...player,
        name: playerName || player.name, // 対局データの名前を優先、なければ既存の名前を使用
        score: score,
        placement: i + 1, // 順位は1-4（左から順に1位、2位、3位、4位）
      });
    }

    // 卓の平均レーティング計算
    const totalRating = players.reduce((sum, player) => sum + player.rating, 0);
    const tableAvgRating = totalRating / 4;

    // 各プレイヤーのレーティング更新
    const endTime = parseDate(matchRow[MATCH_COLUMN.END_TIME]);

    players.forEach((player) => {
      const ratingChange = calculateRatingChange(player, player.placement, tableAvgRating);
      const newRating = player.rating + ratingChange;

      const updatedPlayer = {
        ...player,
        rating: Math.round(newRating * 100) / 100, // 小数点2桁まで
        games: player.games + 1,
        lastMatchDate: endTime,
        ratingChange: Math.round(ratingChange * 100) / 100,
      };

      result.updates.set(player.rowIndex, updatedPlayer);

      console.log(`${player.name} (${player.id}): ${player.rating} → ${updatedPlayer.rating} (${ratingChange > 0 ? "+" : ""}${updatedPlayer.ratingChange})`);
    });

    result.success = true;
    return result;
  } catch (error) {
    logError(`対局処理エラー`, error);
    result.errors.push(`対局処理中にエラーが発生しました: ${error.message}`);
    return result;
  }
}

/**
 * 新規対局の抽出
 * @param {Array} matchData - 全対局データ
 * @param {Date} lastUpdateTime - 最終更新日時
 * @return {Array} - 新規対局データ
 */
function findNewMatches(matchData, lastUpdateTime) {
  if (!lastUpdateTime) {
    logInfo("最終更新日時が未設定のため、全対局を処理対象とします");
    return matchData;
  }

  const newMatches = matchData.filter((row) => {
    const endTime = parseDate(row[MATCH_COLUMN.END_TIME]);
    return endTime && endTime > lastUpdateTime;
  });

  logInfo(`${matchData.length}局中、${newMatches.length}局が新規対局として抽出されました`);
  return newMatches;
}

/**
 * 対局データの一括処理
 * @param {Array} matches - 対局データ配列
 * @param {Map} playerMap - プレイヤーマップ
 * @return {Object} - 処理結果 {success: boolean, processedCount: number, playerUpdates: Map, errors: string[]}
 */
function batchProcessMatches(matches, playerMap) {
  const result = {
    success: false,
    processedCount: 0,
    playerUpdates: new Map(),
    errors: [],
  };

  if (matches.length === 0) {
    result.success = true;
    return result;
  }

  console.log(`${matches.length}局の対局データを処理開始`);

  // 各対局を順番に処理
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchResult = processMatchRating(match, playerMap);

    if (!matchResult.success) {
      result.errors.push(`${i + 1}局目: ${matchResult.errors.join(", ")}`);
      continue;
    }

    // 成功した場合、更新データをマージ
    matchResult.updates.forEach((player, rowIndex) => {
      result.playerUpdates.set(rowIndex, player);
      // プレイヤーマップも更新（後続の対局計算のため）
      playerMap.set(player.id, player);
    });

    result.processedCount++;
  }

  // エラーがある場合は失敗とする
  if (result.errors.length > 0) {
    logError(`${result.errors.length}件のエラーが発生しました`);
    result.errors.forEach((error) => logError(error));
    result.success = false;
  } else {
    result.success = true;
    logInfo(`${result.processedCount}局の処理が完了しました`);
  }

  return result;
}

/**
 * 最新の対局終了時刻を取得
 * @param {Array} matches - 処理した対局データ
 * @return {Date|null} - 最新の終了時刻
 */
function getLatestEndTime(matches) {
  if (!matches || matches.length === 0) {
    return null;
  }

  let latestTime = null;

  matches.forEach((match) => {
    const endTime = parseDate(match[MATCH_COLUMN.END_TIME]);
    if (endTime && (!latestTime || endTime > latestTime)) {
      latestTime = endTime;
    }
  });

  return latestTime;
}
