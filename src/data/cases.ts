// 支援事例の正本。同一案件の詳細版（services 用 full）と要約版（LP 用 summary）を
// 1エントリに束ねる。継続年数・台数・成果などの事実を更新するときはこのファイルだけを直す。
export interface CaseCardData {
  tag: string;
  title: string;
  problem: string;
  support: string;
  outcome: string;
}

export const itStartupCase: { full: CaseCardData; summary: CaseCardData } = {
  full: {
    tag: '情シスコンサルティング',
    title: 'ITスタートアップ ― 「もうひとりの情シス」として社内IT全般を継続支援',
    problem:
      '専任の情シス担当が不在で、CTOが本業のかたわら社内ITを兼務。デバイス管理やSaaSの統制、セキュリティ認証の運用まで手が回らない状態でした。',
    support:
      'IT顧問として定例と随時のご相談で伴走。PCキッティング手順の整備、SaaS・アカウント管理、生成AIツールの利用統制、ISMS認証の運用・再認証対応を支援しています。',
    outcome:
      '専任者が不在のままでも社内ITを継続運用できる体制を整備。3年以上にわたり継続してご契約いただいています。',
  },
  summary: {
    tag: '情シス伴走支援',
    title: 'ITスタートアップ ― 「もうひとりの情シス」として社内IT全般を継続支援',
    problem: '専任の情シスが不在で、CTOが本業のかたわら社内ITを兼務していた。',
    support:
      'IT顧問として定例と随時の相談で伴走。PCキッティング手順の整備、SaaS・アカウント管理、ISMS認証の運用まで支援。',
    outcome: '専任者が不在のまま社内ITを回せる体制を整備。3年以上継続してご契約いただいています。',
  },
};

export const deviceManagementCase: { full: CaseCardData; summary: CaseCardData } = {
  full: {
    tag: '製品導入支援',
    title: '専門サービス業（PC 100〜200台規模） ― Entra ID / Intune によるデバイス管理基盤の構築',
    problem:
      'PCのキッティングが1台ずつの手作業で、担当者の負荷が大きく設定品質にもばらつきがある状態。PCの定期入れ替えを控え、管理の仕組みづくりが急務でした。',
    support:
      'Entra ID / Intune の導入を設計から構築まで一貫して支援。設計書・パラメータシートを整備し、Autopilot を前提としたゼロタッチキッティングと運用手順を構築しました。',
    outcome:
      'Autopilot によるゼロタッチ展開で、初期設定の多くを自動化。PCの定期入れ替えに合わせて新しい管理基盤に移行する道筋を作りました。',
  },
  summary: {
    tag: 'デバイス管理導入',
    title: '専門サービス業（PC 100〜200台） ― Entra ID / Intune による管理基盤の構築',
    problem: 'キッティングが1台ずつの手作業で、負荷が大きく設定品質にばらつきがあった。',
    support:
      'Entra ID / Intune の導入を設計から構築まで一貫支援。Autopilot 前提のゼロタッチキッティングと運用手順を整備。',
    outcome: '初期設定の多くを自動化。PCの定期入れ替えに合わせて新基盤へ移行する道筋を確立。',
  },
};

export const genaiAdoptionCase: { full: CaseCardData; summary: CaseCardData } = {
  full: {
    tag: '生成AI導入支援',
    title: 'コンサルティング会社 ― 生成AI活用の候補業務を3ヶ月で試作・現場評価',
    problem:
      '生成AIを業務に活かしたい意向はあるものの、どの業務から着手すべきか、品質をどう担保するかが見えず、活用が個人の試行にとどまっていました。',
    support:
      '業務分析からユースケース設計、生成AIによる業務自動化の試作、現場メンバーによる評価までを3ヶ月で実施。週次の定例で改善を重ねました。',
    outcome:
      '6つの業務領域で約10種の成果物を試作し、現場評価で実用可否と残る課題を特定。標準化・実データ検証という次のフェーズに進む土台ができました。',
  },
  summary: {
    tag: '生成AI活用',
    title: 'コンサルティング会社 ― 候補業務を3ヶ月で試作・現場評価',
    problem: '生成AIを業務に活かしたいが、どの業務から着手すべきか見えず、個人の試行にとどまっていた。',
    support:
      '業務分析からユースケース設計、試作、現場メンバーによる評価までを3ヶ月で実施。週次定例で改善を重ねた。',
    outcome: '6つの業務領域で約10種の成果物を試作し、実用可否と課題を特定。次のフェーズに進む土台ができた。',
  },
};

export const claudeEnterpriseCase: { summary: CaseCardData } = {
  summary: {
    tag: '生成AI統制',
    title: '事業会社 ― Claude Enterprise の全社導入',
    problem: '全社導入の方針は決まったが、統制も定着も見通せる体制がなかった。',
    support: '導入設計、SSO・アカウント統制、ガイドライン策定、勉強会・利用分析を担当。',
    outcome: '統制の枠組みと定着サイクルを確立。役員から現場まで活用が拡大。',
  },
};

export const claudeCodeGovernanceCase: { summary: CaseCardData } = {
  summary: {
    tag: '生成AI統制',
    title: 'コンサルティング会社 ― Claude Code の配布統制',
    problem: 'Claude Code の統一配布と、権限・接続範囲の統制が課題だった。',
    support: 'Intune による配布設計、managed settings の方針、接続範囲の設計を担当。',
    outcome: '「個人任せの試行」から「会社として統制された活用」へ移行。',
  },
};
