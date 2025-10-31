# FAP Analyzer API Specification (Version 1)

## 1. 概要

このAPIは、FF14フレンド募集サイト「FaP」から収集・評価された投稿データを提供します。主な機能として、投稿データの検索と、Discordへの新規投稿通知ルールの管理を提供します。

**ベースURL**: (APIサーバーが動作するホストによる。例: `http://localhost:8000`)

## 2. 認証

現在、APIエンドポイントへのアクセスに認証は必要ありません。

## 3. データモデル

### 3.1. Post (投稿データ)

投稿の基本情報、評価スコア、タグ情報を含みます。

| 
**フィールド名**

 | 

**型**

 | 

**説明**

 |
| --- | --- | --- |
| 

`post_id`

 | 

integer

 | 

投稿の一意なID

 |
| 

`post_datetime`

 | 

string

 | 

投稿日時 (例: YYYY/MM/DD HH:MM)

 |
| 

`title`

 | 

string

 | 

投稿タイトル

 |
| 

`purpose`

 | 

string

 | 

募集目的 (例: フレンド, 相方, 固定PT)

 |
| 

`original_text`

 | 

string

 | 

投稿本文

 |
| 

`author_name`

 | 

string

 | 

投稿者名

 |
| 

`author_real_age`

 | 

string

 | 

投稿者のリアル年代 (例: 20代, 30代, ？代)

 |
| 

`author_real_gender`

 | 

string

 | 

投稿者のリアル性別 (例: 男性, 女性, 性別非公開)

 |
| 

`author_char_race`

 | 

string

 | 

キャラクターの種族

 |
| 

`author_char_gender`

 | 

string

 | 

キャラクターの性別 (例: ♂, ♀)

 |
| 

`author_char_job`

 | 

string

 | 

キャラクターのジョブ

 |
| 

`server`

 | 

string

 | 

活動サーバー名

 |
| 

`voice_chat`

 | 

string

 | 

ボイスチャットの使用状況 (例: ◯, △, ✕)

 |
| 

`server_transfer`

 | 

string

 | 

サーバー移転の可否 (例: 移転不可, 同DC移転可, 移転可)

 |
| 

`sub_char_ok`

 | 

integer

 | 

サブキャラクターでの参加可否 (1: 可, 0: 不可)

 |
| 

`unique_score`

 | 

float

 | 

投稿のユニーク性スコア ($0-100$)

 |
| 

`score_breakdown`

 | 

string (JSON)

 | 

スコアの内訳 (類似度分析の詳細)

 |
| 

`is_repost`

 | 

integer

 | 

再投稿判定 (1: 再投稿の可能性あり, 0: 新規)

 |
| 

`penalty`

 | 

float

 | 

再投稿ペナルティ (負の値が大きいほどペナルティ大)

 |
| 

`max_similarity_score`

 | 

float

 | 

最も類似した過去投稿との類似度スコア

 |
| 

`tags`

 | 

object (キー: string, 値: array\[string\])

 | 

カテゴリ分類されたタグのリスト (例: `{"playstyle_tags": ["のんびり", "初心者歓迎"]}`)

 |
| 

`score_reasoning`

 | 

string

 | 

スコア内訳を人間が読める形式にしたテキスト

 |
| 

`score_summary_list`

 | 

array\[string\]

 | 

スコア評価に関する総評のリスト

 |

### 3.2. DiscordAlert (Discord通知ルール)

登録されたDiscord通知ルールを表します。

| 
**フィールド名**

 | 

**型**

 | 

**説明**

 |
| --- | --- | --- |
| 

`alert_id`

 | 

integer

 | 

通知ルールの一意なID

 |
| 

`guild_id`

 | 

string

 | 

通知ルールを登録したDiscordサーバーのID (管理用)

 |
| 

`webhook_url`

 | 

string

 | 

通知を送信するDiscord Webhook URL

 |
| 

`conditions_json`

 | 

string (JSON)

 | 

通知条件を定義したJSON文字列

 |

### 3.3. CreateDiscordAlert (Discord通知ルール作成リクエスト)

新しい通知ルールを作成する際にリクエストボディで使用します。

| 
**フィールド名**

 | 

**型**

 | 

**説明**

 |
| --- | --- | --- |
| 

`guild_id`

 | 

string

 | 

通知ルールを登録するDiscordサーバーのID (管理用)

 |
| 

`webhook_url`

 | 

string

 | 

通知を送信するDiscord Webhook URL

 |
| 

`conditions_json`

 | 

string (JSON)

 | 

通知条件を定義したJSON文字列

 |

## 4. エンドポイント

### 4.1. 投稿データの検索

**エンドポイント**: `GET /api/v1/posts`

**説明**: 指定された条件に基づいて投稿データを検索し、リスト形式で返します。結果は投稿日時の降順でソートされます。

**クエリパラメータ**: (すべてオプション)

| 
**パラメータ名**

 | 

**型**

 | 

**説明**

 | 

**例**

 |
| --- | --- | --- | --- |
| 

`min_score`

 | 

float

 | 

取得する投稿の最低ユニークスコア

 | 

$80.5$

 |
| 

`max_age_hours`

 | 

integer

 | 

取得する投稿の最大経過時間 (時間単位)。指定した場合、現在時刻からこの時間以内に投稿されたもののみ取得。

 | 

$24$ (過去$24$時間以内)

 |
| 

`purpose`

 | 

string

 | 

募集目的 (完全一致)

 | 

相方

 |
| 

`author_real_gender`

 | 

string

 | 

投稿者のリアル性別 (完全一致)

 | 

女性

 |
| 

`author_real_age`

 | 

string

 | 

投稿者のリアル年代 (完全一致)

 | 

$30$代

 |
| 

`author_char_race`

 | 

string

 | 

キャラクター種族 (完全一致)

 | 

ミコッテ

 |
| 

`server`

 | 

string

 | 

活動サーバー名 (完全一致)

 | 

Mana

 |
| 

`voice_chat`

 | 

string

 | 

ボイスチャット状況 (完全一致)

 | 

$\\bigcirc$

 |
| 

`server_transfer`

 | 

string

 | 

サーバー移転可否 (完全一致)

 | 

移転可

 |
| 

`sub_char_ok`

 | 

boolean

 | 

サブキャラ参加可否 (`true` または `false`)

 | 

`true`

 |
| 

`include_wish_real_ages`

 | 

array\[string\]

 | 

希望リアル年代タグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。年代不問, 指定なし も自動的に検索対象に含まれます。

 | 

`include_wish_real_ages=20代&include_wish_real_ages=30代`

 |
| 

`include_wish_jobs`

 | 

array\[string\]

 | 

希望ジョブタグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。ジョブ不問 も自動的に検索対象に含まれます。

 | 

`include_wish_jobs=学者`

 |
| 

`include_playstyle_tags`

 | 

array\[string\]

 | 

プレイスタイルタグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。誰でも歓迎 も自動的に検索対象に含まれます。

 | 

`include_playstyle_tags=初心者歓迎`

 |
| 

`include_activity_times`

 | 

array\[string\]

 | 

活動時間タグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。

 | 

`include_activity_times=21時～24時`

 |
| 

`include_wish_races`

 | 

array\[string\]

 | 

希望種族タグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。種族不問 も自動的に検索対象に含まれます。

 | 

`include_wish_races=アウラ`

 |
| 

`include_wish_char_genders`

 | 

array\[string\]

 | 

希望キャラ性別タグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。キャラ性別不問 も自動的に検索対象に含まれます。

 | 

`include_wish_char_genders=♂`

 |
| 

`include_wish_real_genders`

 | 

array\[string\]

 | 

希望リアル性別タグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。男女不問, 性別不問 も自動的に検索対象に含まれます。

 | 

`include_wish_real_genders=女性`

 |
| 

`include_external_tools`

 | 

array\[string\]

 | 

外部ツールタグ (指定したタグのいずれかを含む投稿を検索)。複数指定可能。

 | 

`include_external_tools=Discord`

 |

**成功レスポンス**:

*   コード: `200 OK`
*   ボディ: `array[Post]` (上記 3.1. Post モデルの配列)

**エラーレスポンス**:

*   コード: `500 Internal Server Error`
*   ボディ: `{"detail": "エラーメッセージ"}`

### 4.2. Discord通知ルールの管理

#### 4.2.1. 通知ルールの登録

**エンドポイント**: `POST /api/v1/alerts`

**説明**: 新しいDiscord通知ルールをデータベースに登録します。

**リクエストボディ**: `CreateDiscordAlert` (上記 3.3. CreateDiscordAlert モデル)

`conditions_json` フィールドには、`GET /api/v1/posts` のクエリパラメータ名をキー、期待する値を値としたJSON文字列を指定します。

例: `{"min_score": 90, "purpose": "相方", "include_playstyle_tags": ["高難易度", "早期攻略"]}`

**成功レスポンス**:

*   コード: `200 OK`
*   ボディ: `DiscordAlert` (作成された通知ルール。`alert_id` が払い出される)

**エラーレスポンス**:

*   コード: `400 Bad Request` (データが無効な場合)
*   コード: `500 Internal Server Error`
*   ボディ: `{"detail": "エラーメッセージ"}`

#### 4.2.2. 通知ルールの削除

**エンドポイント**: `DELETE /api/v1/alerts/{alert_id}`

**説明**: 指定された `alert_id` に一致する通知ルールを削除します。

**パスパラメータ**:

*   `alert_id` (integer, required): 削除する通知ルールのID。

**成功レスポンス**:

*   コード: `204 No Content`

**エラーレスポンス**:

*   コード: `404 Not Found` (指定された `alert_id` が存在しない場合)
*   コード: `500 Internal Server Error`
*   ボディ: `{"detail": "エラーメッセージ"}` ($404$, $500$の場合)

#### 4.2.3. 通知ルールの一覧取得

**エンドポイント**: `GET /api/v1/alerts`

**説明**: 登録されているDiscord通知ルールの一覧を取得します。`guild_id` を指定することで、特定のDiscordサーバーによって登録されたルールのみをフィルタリングできます。

**クエリパラメータ**:

*   `guild_id` (string, optional): フィルタリングしたいDiscordサーバーのID。

**成功レスポンス**:

*   コード: `200 OK`
*   ボディ: `array[DiscordAlert]` (上記 3.2. DiscordAlert モデルの配列)

**エラーレスポンス**:

*   コード: `500 Internal Server Error`
*   ボディ: `{"detail": "エラーメッセージ"}`

## 5. 内部動作の補足

*   **データ更新**: API自体はデータの更新を行いません。バックグラウンドで cron ジョブが定期的に `run_periodic_update.py` を実行し、`scraper.py` でデータを収集・更新し、`evaluator.py` でスコアを計算しています。
*   **通知実行**: `run_periodic_update.py` は、`evaluator.py` が新しく評価した投稿を検出し、`discord_alerts` テーブルに登録されたルールと照合します。条件に一致した場合、対応するWebhook URLに `run_periodic_update.py` が直接通知を送信します。APIはこの通知プロセスには直接関与しません（ルールの登録・削除のみ）。
*   **タグ検索の仕様**: `include_` で始まるクエリパラメータ（例: `include_wish_jobs`）では、`config.py` 内の `UNSPECIFIED_TAG_MAP` に基づき、関連する「指定なし」タグ（例: ジョブ不問）も自動的に検索条件に追加されます。ただし、パラメータの値が「指定なし」タグのみの場合は、追加されません。