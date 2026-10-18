/**
 * Geppy's Contextile - Content Script
 * Finds active text input / contenteditable elements in web AI apps and injects compiled prompts.
 */

(() => {
  if (window.__geppys_contextile_injected) return;
  window.__geppys_contextile_injected = true;

  console.log("[Geppy's Contextile] Content script active on page.");

  // Display floating toast message
  function showToast(message, isError = false) {
    const existing = document.getElementById("geppy-contextile-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "geppy-contextile-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: ${isError ? "#ef4444" : "#4f46e5"};
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(10px);
    `;

    toast.innerHTML = `
      <span style="font-size: 18px;">${isError ? "⚠️" : "⚡"}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Find target text input or contenteditable element
  function findTargetInputElement() {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "INPUT" ||
        activeEl.isContentEditable ||
        activeEl.getAttribute("contenteditable") === "true")
    ) {
      return activeEl;
    }

    // Specific AI site selectors
    const selectors = [
      // Gemini
      "rich-textarea [contenteditable='true']",
      "#prompt-textarea",
      "div[contenteditable='true'][aria-label*='Prompt']",
      "div[contenteditable='true']",
      
      // Generic / Antigravity / Image Gen
      "textarea[placeholder*='prompt' i]",
      "textarea[placeholder*='ask' i]",
      "textarea[placeholder*='message' i]",
      "textarea",
      "input[type='text'][placeholder*='prompt' i]",
      "input[type='text']"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isElementVisible(el)) {
        return el;
      }
    }

    return null;
  }

  function isElementVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  // Inject text into target element with DOM event dispatching
  function injectTextIntoElement(target, text) {
    target.focus();

    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const val = target.value || "";

      // Replace selected text or append
      const newVal = val.slice(0, start) + text + val.slice(end);
      target.value = newVal;

      // Move cursor
      target.selectionStart = target.selectionEnd = start + text.length;

      // Dispatch React / Angular / Native input events
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
      // Execute document insertText command if supported, or fallback to textContent
      try {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          target.innerText = text;
        }
      } catch (e) {
        target.innerText = text;
      }

      // Dispatch events for framework listeners
      target.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  // Listen for messages from extension popup / service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "DO_INJECT") {
      const textToInject = message.prompt;
      if (!textToInject) {
        showToast("No prompt text provided to inject.", true);
        sendResponse({ success: false, error: "Empty prompt" });
        return;
      }

      const inputElement = findTargetInputElement();
      if (inputElement) {
        try {
          injectTextIntoElement(inputElement, textToInject);
          showToast("Prompt Injected by Geppy's Contextile!");
          sendResponse({ success: true });
        } catch (err) {
          console.error("[Geppy's Contextile] Injection error:", err);
          showToast("Failed to inject prompt: " + err.message, true);
          sendResponse({ success: false, error: err.message });
        }
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(textToInject).then(
          () => {
            showToast("No active input box found. Prompt copied to clipboard!");
            sendResponse({ success: true, copied: true });
          },
          (err) => {
            showToast("Could not find input box or copy to clipboard.", true);
            sendResponse({ success: false, error: "Input element not found" });
          }
        );
      }
    }
    return true;
  });
})();
