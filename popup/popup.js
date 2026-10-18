/**
 * Geppy's Contextile - Popup Redirect Helper (MV3 CSP Compliant)
 * Safe script execution for redirecting/opening Side Panel without inline script violations.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Attempt opening native Chrome Side Panel
  if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.sidePanel.open({ tabId: tabs[0].id }).catch((err) => {
          console.warn("[Contextile Popup] Side panel open fallback:", err);
        });
      }
    });
  }

  const btnOpenSidePanel = document.getElementById("btnOpenSidePanel");
  if (btnOpenSidePanel) {
    btnOpenSidePanel.addEventListener("click", () => {
      if (chrome.sidePanel && typeof chrome.sidePanel.open === "function") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.sidePanel.open({ tabId: tabs[0].id });
          }
        });
      } else {
        window.location.href = "../sidepanel/sidepanel.html";
      }
    });
  }

  // Redirect to sidepanel HTML view
  setTimeout(() => {
    window.location.href = "../sidepanel/sidepanel.html";
  }, 150);
});
