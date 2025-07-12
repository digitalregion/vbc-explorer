# VirBiCoin Explorer Data Management

このドキュメントでは、VirBiCoinエクスプローラーのリアルタイム性のある情報とスタティックな情報をDBに読み書きする機能について説明します。

## 概要

VirBiCoinエクスプローラーは、以下の3つの主要なデータ同期ツールを提供します：

1. **Blockchain Sync** (`sync.js`) - ブロックチェーンからブロックとトランザクションデータをリアルタイムで同期
2. **Statistics Calculator** (`stats.js`) - ブロック統計情報を計算・保存
3. **Richlist Calculator** (`richlist.js`) - アカウント残高情報を計算・更新

## データベースモデル

### Block
ブロック情報を格納します（リアルタイム）：
- number, hash, parentHash
- miner, timestamp, difficulty
- gasUsed, gasLimit, transactions

### Transaction
トランザクション情報を格納します（リアルタイム）：
- hash, from, to, value
- blockNumber, gasUsed, gasPrice
- timestamp, status

### BlockStat
ブロック統計情報を格納します（スタティック）：
- blockTime, txCount, difficulty
- gasUsed, gasLimit, uncleCount
- timestamp, miner

### Account
アカウント残高情報を格納します（スタティック）：
- address, balance, type
- blockNumber（最終更新ブロック）

## セットアップ

### 1. 必要な依存関係のインストール

```bash
npm install web3 mongoose
```

### 2. VirBiCoinノードの起動

VirBiCoinノードがlocalhost:8545で稼働していることを確認してください。

### 3. MongoDBの起動

```bash
# MongoDBが稼働していることを確認
mongosh --eval "db.runCommand('ping')"
```

## 使用方法

### 管理スクリプトの使用

```bash
# すべてのデータサービスを開始
./manage-data.sh start all

# 個別サービスの開始
./manage-data.sh start sync     # ブロックチェーン同期のみ
./manage-data.sh start stats    # 統計計算のみ
./manage-data.sh start richlist # リッチリスト計算のみ

# サービスの停止
./manage-data.sh stop all
./manage-data.sh stop sync

# サービス状態の確認
./manage-data.sh status

# ログの確認
./manage-data.sh logs sync
./manage-data.sh logs stats
./manage-data.sh logs richlist

# 初期同期の実行
./manage-data.sh initial-sync

# 統計情報の再計算
./manage-data.sh rescan-stats
```

### npmスクリプトの使用

```bash
# データサービスの開始・停止
npm run data:start
npm run data:stop
npm run data:status

# 初期同期
npm run data:sync

# 個別ツールの実行
npm run sync:virbicoin
npm run stats:virbicoin
npm run richlist:virbicoin
```

### 直接実行

```bash
# ブロックチェーン同期
node tools/sync.js

# 統計計算
node tools/stats.js

# リッチリスト計算
node tools/richlist.js

# 環境変数での設定
RESCAN=100:10000 node tools/stats.js  # 統計再計算
SYNCALL=true node tools/sync.js       # 全ブロック同期
```

## API エンドポイント

### Enhanced Statistics API
`GET /api/stats-enhanced`

拡張された統計情報を提供：
- latestBlock: 最新ブロック番号
- avgBlockTime: 平均ブロック時間
- networkHashrate: ネットワークハッシュレート
- networkDifficulty: ネットワーク難易度
- totalTransactions: 総トランザクション数
- avgGasPrice: 平均ガス価格
- activeMiners: アクティブマイナー数

### Richlist API
`GET /api/richlist?page=1&limit=50`

リッチリスト情報を提供：
- richlist: 残高順のアカウントリスト
- pagination: ページネーション情報
- statistics: 総供給量、アカウント統計

## 設定オプション

### config.json
```json
{
  "nodeAddr": "localhost",
  "port": 8545,
  "wsPort": 8546,
  "bulkSize": 100,
  "syncAll": false,
  "quiet": false,
  "useRichList": true
}
```

## ログとモニタリング

ログファイルは `logs/` ディレクトリに保存されます：
- `logs/sync.log` - ブロックチェーン同期ログ
- `logs/stats.log` - 統計計算ログ
- `logs/richlist.log` - リッチリスト計算ログ

## トラブルシューティング

### 1. VirBiCoinノードに接続できない
```bash
# ノードの状態確認
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545
```

### 2. MongoDBに接続できない
```bash
# MongoDB接続確認
mongosh --eval "db.runCommand('ping')"
```

### 3. サービスが停止する
```bash
# ログの確認
./manage-data.sh logs sync
./manage-data.sh logs stats
./manage-data.sh logs richlist
```

### 4. データが更新されない
```bash
# サービス状態確認
./manage-data.sh status

# サービス再起動
./manage-data.sh restart all
```

## パフォーマンス最適化

1. **bulkSize調整**: 大量データ処理時はbulkSizeを増やす
2. **インデックス**: MongoDBに適切なインデックスを作成
3. **メモリ**: 大きなブロックチェーンの場合、十分なメモリを確保
4. **ネットワーク**: VirBiCoinノードとの高速接続を確保

## セキュリティ

1. MongoDBのアクセス制御を設定
2. VirBiCoinノードのRPCアクセスを適切に制限
3. ログファイルのアクセス権限を適切に設定
4. 本番環境では適切なファイアウォール設定を実装

これらのツールにより、VirBiCoinエクスプローラーは最新のブロックチェーンデータをリアルタイムで追跡し、統計情報とリッチリスト情報を定期的に更新できます。
