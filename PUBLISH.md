# Money Diary 公開手順

## 公開URLの考え方

公開URLには `toki` を使わず、`money-diary` を使います。

例:

- `https://money-diary.vercel.app/`
- 独自ドメインを取る場合: `https://money-diary.jp/`

公開トップは `index.html` です。
アプリ本体は `app.html` です。

## Vercelで公開する流れ

1. Vercelにログインします。
2. 新しいプロジェクトを作ります。
3. このフォルダを公開対象にします。
4. プロジェクト名を `money-diary` にします。
5. Framework Presetは `Other` または静的サイト扱いにします。
6. Build Commandは空欄で大丈夫です。
7. Output Directoryは `outputs/kakeibo-calendar` を指定します。
8. Deployを押します。
9. 公開後のURLが `money-diary.vercel.app` に近い名前になっているか確認します。

## 公開後に確認するページ

- LP: `/`
- アプリ: `/app.html`

## Google連携を使う場合

Firebase Consoleで次を確認します。

1. Authenticationを開きます。
2. Sign-in methodでGoogleを有効にします。
3. SettingsのAuthorized domainsに公開URLのドメインを追加します。

例:

- `money-diary.vercel.app`
- 独自ドメインを使う場合はそのドメイン

## 注意

現在のデータはブラウザ内に保存されます。
ユーザーごとの本格保存を入れる場合は、SupabaseやFirebaseなどのデータベースを追加します。
