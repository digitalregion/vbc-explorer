# Token Data Management Tools

このディレクトリには、VirBiCoin Explorerのトークンデータを管理するための自動化ツールが含まれています。

## ファイル構成

### `updateTokenData.js`
Node.jsスクリプトで、トークンデータの更新を行います。

**機能:**
- トークンのホルダー数を実際のデータベース値に基づいて更新
- トークンの作成日時を適切な値に設定
- OSATOトークンのホルダーデータを追加/更新
- VBCトークンのホルダー数をウォレット数と同期

**使用方法:**
```bash
# トークンデータのみ更新
node updateTokenData.js update-tokens

# OSATOホルダーデータのみ追加
node updateTokenData.js add-osato-data

# 完全更新（推奨）
node updateTokenData.js full-update
```

### `automate-token-update.sh`
Bashスクリプトで、トークンデータ更新プロセスを自動化します。

**機能:**
- MongoDBの接続確認
- データのバックアップ作成
- トークンデータの更新
- データ整合性の検証
- エラー時の自動リトライ
- 古いバックアップファイルの削除

**使用方法:**
```bash
# 完全な自動更新プロセスを実行
./automate-token-update.sh update

# 現在のトークンステータスを表示
./automate-token-update.sh status

# データ整合性の検証
./automate-token-update.sh verify

# データのバックアップのみ作成
./automate-token-update.sh backup
```

## 現在のトークン設定

### OSATO Token (VRC-721 NFT)
- **Address**: `0xD26488eA7e2b4e8Ba8eB9E6d7C8bF2a3C5d4E6F8`
- **Holders**: 8（実際のホルダーデータに基づく）
- **Total Supply**: Unlimited
- **Age**: 約6ヶ月（NFTプロジェクトとして現実的）
- **Decimals**: 0（NFTトークン）

### VBC Token (Native)
- **Address**: `0x7d4cbf1632c0e68fd3b6a61ea8e3f95ae1e7c3de`
- **Holders**: ウォレット数と同期（現在128）
- **Total Supply**: Unlimited
- **Age**: 約2年（ネイティブトークンとして現実的）
- **Decimals**: 18（標準）

## 自動化の推奨事項

### 定期実行の設定
cronジョブで定期的にトークンデータを更新することを推奨します：

```bash
# 毎日午前2時に実行
0 2 * * * /home/aoi/explorer/tools/automate-token-update.sh update >> /var/log/token-update.log 2>&1

# 毎時間ステータスチェック
0 * * * * /home/aoi/explorer/tools/automate-token-update.sh verify >> /var/log/token-verify.log 2>&1
```

### 監視とアラート
- バックアップファイルを定期的に確認
- ログファイルでエラーを監視
- データ整合性の検証結果を確認

## トラブルシューティング

### MongoDB接続エラー
```bash
# MongoDB サービスの状態確認
sudo systemctl status mongod

# MongoDB 再起動
sudo systemctl restart mongod
```

### データ不整合の修正
```bash
# 手動でデータ整合性を確認
./automate-token-update.sh verify

# 完全更新を実行
./automate-token-update.sh update
```

### バックアップからの復元
```bash
# 最新のバックアップファイルを確認
ls -la token_backup_*.json

# MongoDBにデータを復元（手動）
mongosh explorerDB --eval "db.tokens.drop()"
# バックアップファイルの内容を復元...
```

## 開発者向けメモ

### データベースコレクション
- `tokens`: メインのトークン情報
- `tokenholders`: トークンホルダーの詳細
- `Account`: ウォレット/アカウント情報

### API エンドポイント
更新後は以下のAPIエンドポイントで変更を確認できます：
- `/api/tokens/[address]`: 特定のトークン詳細
- `/api/stats-enhanced`: ネットワーク統計

### ログ形式
すべてのログにはタイムスタンプと操作ステータスが含まれ、トラブルシューティングが容易です。
