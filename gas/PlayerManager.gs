/**
 * プレイヤー管理
 * プレイヤー情報管理・データ更新
 */

/**
 * 新規プレイヤーの検出と作成
 * @param {Array} matchData - 対局データ
 * @param {Map} playerMap - 既存プレイヤーマップ
 * @return {Array} - 新規プレイヤー配列
 */
function findNewPlayers(matchData, playerMap) {
  const newPlayerIds = new Set();

  // 対局データから全プレイヤーIDを収集
  matchData.forEach((match) => {
    MATCH_COLUMN.PLAYER_IDS.forEach((col) => {
      const playerId = match[col];
      if (isValidPlayerId(playerId) && !playerMap.has(playerId)) {
        newPlayerIds.add(playerId);
      }
    });
  });

  if (newPlayerIds.size === 0) {
    return [];
  }

  // 新規プレイヤーの名前を対局データから取得
  const newPlayers = [];
  const playerNames = new Map();

  // プレイヤーIDと名前のマッピングを作成
  matchData.forEach((match) => {
    MATCH_COLUMN.PLAYER_IDS.forEach((idCol, index) => {
      const playerId = match[idCol];
      const playerName = match[MATCH_COLUMN.PLAYER_NAMES[index]];

      if (isValidPlayerId(playerId) && isNotEmpty(playerName)) {
        playerNames.set(playerId, playerName);
      }
    });
  });

  // 新規プレイヤーオブジェクト作成
  newPlayerIds.forEach((playerId) => {
    const player = setPlayerDefaults({
      id: playerId,
      name: playerNames.get(playerId) || playerId,
    });
    newPlayers.push(player);
  });

  logInfo(`${newPlayers.length}名の新規プレイヤーを検出: ${newPlayers.map((p) => p.name).join(", ")}`);
  return newPlayers;
}

/**
 * プレイヤーマップに新規プレイヤーを追加
 * @param {Map} playerMap - プレイヤーマップ
 * @param {Array} newPlayers - 新規プレイヤー配列
 * @param {number} startRowIndex - 開始行インデックス
 */
function addPlayersToMap(playerMap, newPlayers, startRowIndex) {
  newPlayers.forEach((player, index) => {
    const rowIndex = startRowIndex + index;
    const playerWithRow = {
      ...player,
      rowIndex: rowIndex,
    };
    playerMap.set(player.id, playerWithRow);
  });
}

/**
 * プレイヤー情報の一括処理
 * @param {Object} sheets - シート参照オブジェクト
 * @param {Array} matchData - 対局データ
 * @return {Object} - 処理結果 {success: boolean, playerMap: Map, newPlayersCount: number, errors: string[]}
 */
function processPlayerData(sheets, matchData) {
  const result = {
    success: false,
    playerMap: new Map(),
    newPlayersCount: 0,
    errors: [],
  };

  try {
    // 既存プレイヤーデータ読み込み
    const playerData = loadPlayerData(sheets.playerList);
    result.playerMap = createPlayerMap(playerData);

    logInfo(`既存プレイヤー: ${result.playerMap.size}名`);

    // 新規プレイヤー検出
    const newPlayers = findNewPlayers(matchData, result.playerMap);
    result.newPlayersCount = newPlayers.length;

    if (newPlayers.length > 0) {
      // 新規プレイヤーをシートに追加
      batchAddPlayers(sheets.playerList, newPlayers);

      // プレイヤーマップに新規プレイヤーを追加
      const lastRow = sheets.playerList.getLastRow();
      const startRowIndex = lastRow - newPlayers.length + 1;
      addPlayersToMap(result.playerMap, newPlayers, startRowIndex);

      logInfo(`プレイヤーマップを更新: 総${result.playerMap.size}名`);
    }

    result.success = true;
    return result;
  } catch (error) {
    logError("プレイヤーデータ処理エラー", error);
    result.errors.push(`プレイヤーデータ処理中にエラーが発生しました: ${error.message}`);
    return result;
  }
}

/**
 * プレイヤー統計情報の取得
 * @param {Map} playerMap - プレイヤーマップ
 * @return {Object} - 統計情報
 */
function getPlayerStats(playerMap) {
  if (playerMap.size === 0) {
    return {
      totalPlayers: 0,
      averageRating: 0,
      averageGames: 0,
      highestRating: 0,
      lowestRating: 0,
    };
  }

  const players = Array.from(playerMap.values());
  const totalRating = players.reduce((sum, player) => sum + player.rating, 0);
  const totalGames = players.reduce((sum, player) => sum + player.games, 0);
  const ratings = players.map((player) => player.rating);

  return {
    totalPlayers: players.length,
    averageRating: Math.round((totalRating / players.length) * 100) / 100,
    averageGames: Math.round((totalGames / players.length) * 100) / 100,
    highestRating: Math.max(...ratings),
    lowestRating: Math.min(...ratings),
  };
}

/**
 * プレイヤー一覧の表示（デバッグ用）
 * @param {Map} playerMap - プレイヤーマップ
 * @param {number} limit - 表示件数制限（デフォルト: 10）
 */
function displayPlayerList(playerMap, limit = 10) {
  const players = Array.from(playerMap.values());

  // レーティング順でソート
  players.sort((a, b) => b.rating - a.rating);

  console.log("=== プレイヤー一覧 (上位" + Math.min(limit, players.length) + "名) ===");
  players.slice(0, limit).forEach((player, index) => {
    console.log(`${index + 1}位: ${player.name} (${player.id}) - レート: ${player.rating}, 対局数: ${player.games}`);
  });

  if (players.length > limit) {
    console.log(`... 他${players.length - limit}名`);
  }
}
