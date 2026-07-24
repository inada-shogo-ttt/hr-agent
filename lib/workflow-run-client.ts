// クライアント側(sessionStorage)の実行トラッキング補助。
// 進捗ページとグローバル進捗ウィジェット(BackgroundRunIndicator)で共用する。
// 「非表示にした実行」を記録し、進捗ページで完了/エラーを確認済みの実行を
// ウィジェットが重複表示しないようにする。

const DISMISSED_KEY = "dismissedWorkflowRuns";

export function getDismissedRuns(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDismissedRun(runId: string): void {
  try {
    const list = getDismissedRuns();
    if (!list.includes(runId)) {
      list.push(runId);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(list.slice(-20)));
    }
  } catch {
    // sessionStorage が使えない環境では無視
  }
}
