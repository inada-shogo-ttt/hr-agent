// SSE接続をWeb Workerで管理し、タブがバックグラウンドでも接続を維持する
self.onmessage = async function (e) {
  const { url, body } = e.data;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 504) {
        self.postMessage({ type: "__worker_error", error: "TIMEOUT" });
      } else {
        self.postMessage({ type: "__worker_error", error: "HTTP error: " + response.status });
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedComplete = false;
    let receivedError = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        if (!block.trim()) continue;
        // SSEコメント（ハートビート等）はスキップ
        if (block.trim().startsWith(":")) continue;

        const dataLines = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("data: ")) {
            dataLines.push(line.slice(6));
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5));
          }
        }
        if (dataLines.length === 0) continue;
        const jsonStr = dataLines.join("\n");
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === "workflow_complete") receivedComplete = true;
          if (event.type === "workflow_error") receivedError = true;
          self.postMessage({ type: "__worker_event", event: event });
        } catch (err) {
          console.error("[sse-worker] Failed to parse SSE event:", err);
        }
      }
    }

    // ストリーム終了後の判定:
    // - workflow_error 受信済みなら実エラーが表示されているためタイムアウト扱いにしない
    // - 完了もエラーも無いままストリームが切れた場合のみタイムアウト扱い
    if (receivedComplete || receivedError) {
      self.postMessage({ type: "__worker_done" });
    } else {
      self.postMessage({ type: "__worker_error", error: "TIMEOUT" });
    }
  } catch (err) {
    self.postMessage({ type: "__worker_error", error: err.message || "Unknown error" });
  }
};
