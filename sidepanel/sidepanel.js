/**
 * Geppy's Contextile - Side Panel Controller
 * Handles sidebar tab switching, multi-mode prompt compilation, Media Asset Gallery with associated rules, and Chrome AI integration.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // DOM References
  const modeSelect = document.getElementById("modeSelect");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Builder Tab Elements
  const templateSelect = document.getElementById("templateSelect");
  const btnSaveTemplate = document.getElementById("btnSaveTemplate");
  const activeModeNotice = document.getElementById("activeModeNotice");
  const dynamicCategoriesContainer = document.getElementById("dynamicCategoriesContainer");
  const builderMediaAssetsContainer = document.getElementById("builderMediaAssetsContainer");
  const mediaCountBadge = document.getElementById("mediaCountBadge");
  const contextInput = document.getElementById("contextInput");
  const toggleCharacterRules = document.getElementById("toggleCharacterRules");
  const previewOutput = document.getElementById("previewOutput");
  const btnCopyPrompt = document.getElementById("btnCopyPrompt");
  const btnInjectPrompt = document.getElementById("btnInjectPrompt");

  // Media Gallery Tab Elements
  const btnOpenAddAsset = document.getElementById("btnOpenAddAsset");
  const assetFilterMode = document.getElementById("assetFilterMode");
  const mediaGalleryContainer = document.getElementById("mediaGalleryContainer");
  const addAssetModal = document.getElementById("addAssetModal");
  const btnCloseAssetModal = document.getElementById("btnCloseAssetModal");
  const btnSaveAsset = document.getElementById("btnSaveAsset");

  // Asset Form Elements
  const newAssetName = document.getElementById("newAssetName");
  const newAssetMode = document.getElementById("newAssetMode");
  const assetFileInput = document.getElementById("assetFileInput");
  const btnBrowseFile = document.getElementById("btnBrowseFile");
  const newAssetUrl = document.getElementById("newAssetUrl");
  const assetPreviewContainer = document.getElementById("assetPreviewContainer");
  const assetPreviewImg = document.getElementById("assetPreviewImg");
  const newAssetRules = document.getElementById("newAssetRules");
  const newAssetTags = document.getElementById("newAssetTags");

  // Category Manager Elements
  const btnOpenAddCategory = document.getElementById("btnOpenAddCategory");
  const categoryFilterMode = document.getElementById("categoryFilterMode");
  const categoriesList = document.getElementById("categoriesList");
  const addCategoryModal = document.getElementById("addCategoryModal");
  const btnCloseCategoryModal = document.getElementById("btnCloseCategoryModal");
  const btnSaveCategory = document.getElementById("btnSaveCategory");

  const addOptionModal = document.getElementById("addOptionModal");
  const btnCloseOptionModal = document.getElementById("btnCloseOptionModal");
  const btnSaveOption = document.getElementById("btnSaveOption");
  const targetOptionCategoryId = document.getElementById("targetOptionCategoryId");
  const newOptionLabel = document.getElementById("newOptionLabel");
  const newOptionModifier = document.getElementById("newOptionModifier");

  // AI Generator Elements
  const aiTargetCategory = document.getElementById("aiTargetCategory");
  const aiPromptInput = document.getElementById("aiPromptInput");
  const btnGenerateAiOptions = document.getElementById("btnGenerateAiOptions");
  const aiStatusMessage = document.getElementById("aiStatusMessage");
  const aiResultsContainer = document.getElementById("aiResultsContainer");
  const aiResultsList = document.getElementById("aiResultsList");
  const btnAddAiResults = document.getElementById("btnAddAiResults");

  // State
  let currentStore = null;
  let currentMode = "antigravity";
  let selectedOptionIds = {}; // { categoryId: [optionId1, ...] }
  let selectedMediaAssetIds = []; // [assetId1, ...]
  let generatedAiOptions = [];
  let currentStagedImageData = ""; // Data URL for uploaded asset image

  // --- INITIALIZATION ---
  async function init() {
    setupTabNavigation();
    setupFileUploadHandlers();
    await loadStore();
    await detectAndSetMode();
    renderAll();
  }

  // Fetch Store
  async function loadStore() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_STORE" }, (response) => {
        if (response && response.success && response.data) {
          currentStore = response.data;
        } else {
          chrome.storage.local.get(null, (items) => {
            currentStore = items;
            resolve();
          });
          return;
        }
        resolve();
      });
    });
  }

  // Save Store
  async function saveStore() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "UPDATE_STORE", payload: currentStore }, () => {
        chrome.storage.local.set(currentStore, () => resolve());
      });
    });
  }

  // Mode Auto-detection
  async function detectAndSetMode() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "DETECT_MODE" }, (response) => {
        if (response && response.success && response.mode) {
          currentMode = response.mode;
        } else {
          currentMode = "antigravity";
        }
        modeSelect.value = currentMode;
        resolve();
      });
    });
  }

  // --- TAB NAVIGATION ---
  function setupTabNavigation() {
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");

        tabBtns.forEach((b) => b.classList.remove("active"));
        tabPanes.forEach((p) => p.classList.remove("active"));

        btn.classList.add("active");
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add("active");

        if (targetTab === "tab-gallery") {
          renderMediaGallery();
        } else if (targetTab === "tab-categories") {
          renderCategoryManager();
        } else if (targetTab === "tab-aigen") {
          populateAiCategoryDropdown();
        }
      });
    });
  }

  // Mode select change
  modeSelect.addEventListener("change", (e) => {
    currentMode = e.target.value;
    selectedOptionIds = {};
    selectedMediaAssetIds = [];
    renderAll();
  });

  // Render main UI sections
  function renderAll() {
    updateModeBadge();
    renderTemplatesDropdown();
    renderDynamicCategories();
    renderBuilderMediaAssets();
    renderCharacterRulesTab();
    compilePrompt();
  }

  function updateModeBadge() {
    const modeNames = {
      gemini: "♊ Gemini Ideation Mode",
      antigravity: "🚀 Antigravity App Scaffold Mode",
      image_gen: "🎨 Image Gen Visual Asset Mode"
    };
    activeModeNotice.textContent = modeNames[currentMode] || currentMode;
  }

  // --- TEMPLATES ---
  function renderTemplatesDropdown() {
    templateSelect.innerHTML = `<option value="">-- Select a Template --</option>`;
    if (!currentStore || !currentStore.templates) return;

    const filteredTemplates = currentStore.templates.filter(
      (t) => t.targetPlatform === currentMode || !t.targetPlatform
    );

    filteredTemplates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.templateId;
      opt.textContent = t.templateName;
      templateSelect.appendChild(opt);
    });
  }

  templateSelect.addEventListener("change", (e) => {
    const tmplId = e.target.value;
    if (!tmplId || !currentStore.templates) return;

    const tmpl = currentStore.templates.find((t) => t.templateId === tmplId);
    if (tmpl) {
      if (tmpl.targetPlatform) {
        currentMode = tmpl.targetPlatform;
        modeSelect.value = currentMode;
        updateModeBadge();
      }
      contextInput.value = tmpl.contextText || "";
      toggleCharacterRules.checked = tmpl.includeCharacterRules !== false;
      selectedOptionIds = JSON.parse(JSON.stringify(tmpl.selectedOptions || {}));
      selectedMediaAssetIds = Array.isArray(tmpl.selectedMediaAssetIds) ? [...tmpl.selectedMediaAssetIds] : [];
      renderDynamicCategories();
      renderBuilderMediaAssets();
      compilePrompt();
    }
  });

  btnSaveTemplate.addEventListener("click", async () => {
    const templateName = prompt("Enter a name for this template:", "New Custom Template");
    if (!templateName) return;

    const newTemplate = {
      templateId: "t-" + Date.now(),
      templateName: templateName.trim(),
      targetPlatform: currentMode,
      includeCharacterRules: toggleCharacterRules.checked,
      selectedOptions: JSON.parse(JSON.stringify(selectedOptionIds)),
      selectedMediaAssetIds: [...selectedMediaAssetIds],
      contextText: contextInput.value
    };

    if (!currentStore.templates) currentStore.templates = [];
    currentStore.templates.push(newTemplate);
    await saveStore();
    renderTemplatesDropdown();
    templateSelect.value = newTemplate.templateId;
    alert("Template saved successfully!");
  });

  // --- DYNAMIC CATEGORY PILLS (TAB 1) ---
  function renderDynamicCategories() {
    dynamicCategoriesContainer.innerHTML = "";
    if (!currentStore || !currentStore.dropdownCategories) return;

    const activeCategories = currentStore.dropdownCategories.filter(
      (c) => c.targetMode === currentMode || c.targetMode === "all"
    );

    if (activeCategories.length === 0) {
      dynamicCategoriesContainer.innerHTML = `<p class="option-modifier-text" style="padding:8px;">No categories configured for this mode.</p>`;
      return;
    }

    activeCategories.forEach((cat) => {
      const block = document.createElement("div");
      block.className = "category-block";

      const header = document.createElement("div");
      header.className = "category-header";
      header.innerHTML = `
        <span class="category-name">${cat.categoryName}</span>
        <span class="badge badge-info">${cat.isMultiSelect ? "Multi" : "Single"}</span>
      `;

      const pillsContainer = document.createElement("div");
      pillsContainer.className = "options-pills";

      if (!selectedOptionIds[cat.categoryId]) {
        selectedOptionIds[cat.categoryId] = [];
      }

      cat.options.forEach((opt) => {
        const isSelected = selectedOptionIds[cat.categoryId].includes(opt.optionId);
        const pill = document.createElement("button");
        pill.className = `option-pill ${isSelected ? "selected" : ""}`;
        pill.textContent = opt.label;
        pill.title = opt.promptModifier;

        pill.addEventListener("click", () => {
          if (cat.isMultiSelect) {
            if (isSelected) {
              selectedOptionIds[cat.categoryId] = selectedOptionIds[cat.categoryId].filter(
                (id) => id !== opt.optionId
              );
            } else {
              selectedOptionIds[cat.categoryId].push(opt.optionId);
            }
          } else {
            if (isSelected) {
              selectedOptionIds[cat.categoryId] = [];
            } else {
              selectedOptionIds[cat.categoryId] = [opt.optionId];
            }
          }
          renderDynamicCategories();
          compilePrompt();
        });

        pillsContainer.appendChild(pill);
      });

      block.appendChild(header);
      block.appendChild(pillsContainer);
      dynamicCategoriesContainer.appendChild(block);
    });
  }

  // --- MODULAR MEDIA ASSETS SELECTOR (TAB 1) ---
  function renderBuilderMediaAssets() {
    builderMediaAssetsContainer.innerHTML = "";
    if (!currentStore || !currentStore.mediaAssets) return;

    const filteredAssets = currentStore.mediaAssets.filter(
      (a) => a.targetMode === currentMode || a.targetMode === "all"
    );

    mediaCountBadge.textContent = `${selectedMediaAssetIds.length} Active`;

    if (filteredAssets.length === 0) {
      builderMediaAssetsContainer.innerHTML = `<p class="option-modifier-text" style="grid-column: 1/-1; padding:4px;">No media assets for this mode. Upload assets in the Media tab!</p>`;
      return;
    }

    filteredAssets.forEach((asset) => {
      const isSelected = selectedMediaAssetIds.includes(asset.assetId);
      const card = document.createElement("div");
      card.className = `media-select-card ${isSelected ? "selected" : ""}`;
      card.title = asset.associatedRules || asset.name;

      card.innerHTML = `
        ${isSelected ? '<span class="media-check-badge">✓</span>' : ''}
        <img class="media-thumb" src="${asset.imageData || asset.imageUrl}" alt="${asset.name}">
        <span class="media-select-name">${asset.name}</span>
      `;

      card.addEventListener("click", () => {
        if (isSelected) {
          selectedMediaAssetIds = selectedMediaAssetIds.filter((id) => id !== asset.assetId);
        } else {
          selectedMediaAssetIds.push(asset.assetId);
        }
        renderBuilderMediaAssets();
        compilePrompt();
      });

      builderMediaAssetsContainer.appendChild(card);
    });
  }

  // --- PROMPT COMPILER WITH MEDIA RULES ---
  function compilePrompt() {
    const contextText = contextInput.value.trim();
    const useRules = toggleCharacterRules.checked;
    const rules = currentStore ? currentStore.characterRules : null;

    // Active Category Modifiers
    const activeModifiers = [];
    if (currentStore && currentStore.dropdownCategories) {
      currentStore.dropdownCategories.forEach((cat) => {
        const selected = selectedOptionIds[cat.categoryId] || [];
        if (selected.length > 0) {
          cat.options.forEach((opt) => {
            if (selected.includes(opt.optionId)) {
              activeModifiers.push({
                categoryName: cat.categoryName,
                label: opt.label,
                promptModifier: opt.promptModifier
              });
            }
          });
        }
      });
    }

    // Active Media Assets & Rules
    const activeMediaAssets = [];
    if (currentStore && currentStore.mediaAssets) {
      currentStore.mediaAssets.forEach((asset) => {
        if (selectedMediaAssetIds.includes(asset.assetId)) {
          activeMediaAssets.push(asset);
        }
      });
    }

    let compiled = "";

    if (currentMode === "gemini") {
      compiled += `[CREATIVE DIRECTION & BRAINSTORMING SPEC]\n`;
      if (contextText) {
        compiled += `Context / Core Request:\n${contextText}\n\n`;
      }
      if (activeModifiers.length > 0) {
        compiled += `Active Concept Modifiers:\n`;
        activeModifiers.forEach((m) => {
          compiled += `- [${m.categoryName}] ${m.promptModifier}\n`;
        });
        compiled += `\n`;
      }
      if (activeMediaAssets.length > 0) {
        compiled += `[MEDIA ASSET & VISUAL CONTEXT]\n`;
        activeMediaAssets.forEach((a) => {
          compiled += `- Reference Asset: "${a.name}"\n  Rules/Constraints: ${a.associatedRules || "Visual reference attached."}\n`;
        });
        compiled += `\n`;
      }
      if (useRules && rules) {
        compiled += `[CHARACTER GUARDRAILS: ${rules.characterName}]\n`;
        compiled += `- Art Style: ${rules.animationStyle}\n`;
        compiled += `- Mandatory Traits: ${rules.mandatoryTraits.join(", ")}\n`;
        compiled += `- Guardrail Constraints: ${rules.forbiddenModifications.join(", ")}\n`;
      }
    } else if (currentMode === "antigravity") {
      compiled += `[ANTIGRAVITY TASK BLUEPRINT & APP SCAFFOLD SPEC]\n`;
      if (contextText) {
        compiled += `Objective / Goal:\n${contextText}\n\n`;
      }
      if (activeModifiers.length > 0) {
        compiled += `Architecture & Technical Requirements:\n`;
        activeModifiers.forEach((m) => {
          compiled += `- ${m.promptModifier}\n`;
        });
        compiled += `\n`;
      }
      if (activeMediaAssets.length > 0) {
        compiled += `[VISUAL BLUEPRINTS & DESIGN RULES]\n`;
        activeMediaAssets.forEach((a) => {
          compiled += `- Spec Reference: "${a.name}" => ${a.associatedRules}\n`;
        });
        compiled += `\n`;
      }
      if (useRules && rules) {
        compiled += `[CHARACTER & BRAND RULES: ${rules.characterName}]\n`;
        compiled += `- Visual Style: ${rules.animationStyle}\n`;
        compiled += `- Mandatory Traits: ${rules.mandatoryTraits.join(", ")}\n`;
      }
    } else if (currentMode === "image_gen") {
      const parts = [];
      if (contextText) parts.push(contextText);
      activeModifiers.forEach((m) => parts.push(m.promptModifier));

      if (activeMediaAssets.length > 0) {
        activeMediaAssets.forEach((a) => {
          if (a.associatedRules) parts.push(`[Ref "${a.name}"]: ${a.associatedRules}`);
        });
      }

      if (useRules && rules) {
        parts.push(rules.animationStyle);
        parts.push(`${rules.characterName} character`);
        rules.mandatoryTraits.forEach((t) => parts.push(t));
        parts.push("locked character proportions, high quality vector render, 8k resolution");
      }

      compiled = parts.join(", ");
    }

    previewOutput.value = compiled.trim();
  }

  contextInput.addEventListener("input", compilePrompt);
  toggleCharacterRules.addEventListener("change", compilePrompt);

  // Copy Prompt
  btnCopyPrompt.addEventListener("click", () => {
    const text = previewOutput.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      btnCopyPrompt.textContent = "✅ Copied!";
      setTimeout(() => (btnCopyPrompt.textContent = "📋 Copy"), 2000);
    });
  });

  // Inject Prompt
  btnInjectPrompt.addEventListener("click", () => {
    const text = previewOutput.value;
    if (!text) {
      alert("No prompt text to inject!");
      return;
    }

    btnInjectPrompt.disabled = true;
    btnInjectPrompt.innerHTML = `<span class="btn-icon">⏳</span> Injecting...`;

    chrome.runtime.sendMessage({ type: "INJECT_PROMPT", prompt: text }, (response) => {
      btnInjectPrompt.disabled = false;
      btnInjectPrompt.innerHTML = `<span class="btn-icon">🚀</span> Inject into Active Tab`;

      if (response && response.success) {
        if (response.copied) {
          alert("Target input box not found. Prompt copied to your clipboard!");
        }
      } else {
        alert("Failed to inject prompt: " + (response ? response.error : "Unknown error"));
      }
    });
  });

  // --- MEDIA GALLERY TAB (TAB 2) ---
  function renderMediaGallery() {
    mediaGalleryContainer.innerHTML = "";
    if (!currentStore || !currentStore.mediaAssets) return;

    const filterVal = assetFilterMode.value;
    const filtered = currentStore.mediaAssets.filter(
      (a) => filterVal === "all" || a.targetMode === filterVal || a.targetMode === "all"
    );

    if (filtered.length === 0) {
      mediaGalleryContainer.innerHTML = `<p class="option-modifier-text" style="grid-column: 1/-1; padding:12px;">No assets match the filter.</p>`;
      return;
    }

    filtered.forEach((asset) => {
      const card = document.createElement("div");
      card.className = "asset-card";

      card.innerHTML = `
        <img class="asset-card-img" src="${asset.imageData || asset.imageUrl}" alt="${asset.name}">
        <div class="asset-card-body">
          <div class="asset-card-title">${asset.name}</div>
          <div class="asset-card-rules">${asset.associatedRules || "No rules defined."}</div>
          <div class="asset-card-footer">
            <span class="badge badge-info">${asset.targetMode}</span>
            <button class="btn-icon-only btn-delete-asset" data-asset-id="${asset.assetId}" title="Delete Asset">🗑️</button>
          </div>
        </div>
      `;

      mediaGalleryContainer.appendChild(card);
    });

    document.querySelectorAll(".btn-delete-asset").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const assetId = btn.getAttribute("data-asset-id");
        if (confirm("Delete this media asset?")) {
          currentStore.mediaAssets = currentStore.mediaAssets.filter((a) => a.assetId !== assetId);
          selectedMediaAssetIds = selectedMediaAssetIds.filter((id) => id !== assetId);
          await saveStore();
          renderMediaGallery();
          renderBuilderMediaAssets();
          compilePrompt();
        }
      });
    });
  }

  assetFilterMode.addEventListener("change", renderMediaGallery);

  // File Upload and Modal Handlers
  function setupFileUploadHandlers() {
    btnBrowseFile.addEventListener("click", (e) => {
      e.preventDefault();
      assetFileInput.click();
    });

    assetFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) processImageFile(file);
    });

    const dropzoneArea = document.getElementById("dropzoneArea");
    dropzoneArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzoneArea.style.borderColor = "var(--accent-primary)";
    });

    dropzoneArea.addEventListener("dragleave", () => {
      dropzoneArea.style.borderColor = "var(--border-color)";
    });

    dropzoneArea.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzoneArea.style.borderColor = "var(--border-color)";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processImageFile(e.dataTransfer.files[0]);
      }
    });

    newAssetUrl.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      if (url) {
        currentStagedImageData = url;
        showImagePreview(url);
      }
    });
  }

  // Compress & convert file to Data URL
  function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Canvas compression max 800px width/height
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        const maxSz = 800;

        if (w > maxSz || h > maxSz) {
          if (w > h) {
            h = Math.round((h * maxSz) / w);
            w = maxSz;
          } else {
            w = Math.round((w * maxSz) / h);
            h = maxSz;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        currentStagedImageData = dataUrl;
        newAssetUrl.value = "";
        showImagePreview(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showImagePreview(src) {
    assetPreviewImg.src = src;
    assetPreviewContainer.classList.remove("hidden");
  }

  btnOpenAddAsset.addEventListener("click", () => {
    newAssetName.value = "";
    newAssetMode.value = currentMode;
    newAssetUrl.value = "";
    newAssetRules.value = "";
    newAssetTags.value = "";
    currentStagedImageData = "";
    assetPreviewContainer.classList.add("hidden");
    addAssetModal.classList.remove("hidden");
  });

  btnCloseAssetModal.addEventListener("click", () => {
    addAssetModal.classList.add("hidden");
  });

  btnSaveAsset.addEventListener("click", async () => {
    const name = newAssetName.value.trim();
    const rulesText = newAssetRules.value.trim();

    if (!name) {
      alert("Please enter an asset name.");
      return;
    }

    if (!currentStagedImageData && !newAssetUrl.value.trim()) {
      alert("Please upload an image or provide an image URL.");
      return;
    }

    const finalImage = currentStagedImageData || newAssetUrl.value.trim();
    const tagArray = newAssetTags.value.split(",").map((t) => t.trim()).filter(Boolean);

    const newAsset = {
      assetId: "asset_" + Date.now(),
      name: name,
      targetMode: newAssetMode.value,
      associatedRules: rulesText,
      imageData: finalImage,
      tags: tagArray
    };

    if (!currentStore.mediaAssets) currentStore.mediaAssets = [];
    currentStore.mediaAssets.push(newAsset);
    await saveStore();

    addAssetModal.classList.add("hidden");
    renderMediaGallery();
    renderBuilderMediaAssets();
    compilePrompt();
  });

  // --- CATEGORY MANAGER (TAB 3) ---
  function renderCategoryManager() {
    categoriesList.innerHTML = "";
    if (!currentStore || !currentStore.dropdownCategories) return;

    const filterVal = categoryFilterMode.value;
    const filteredCats = currentStore.dropdownCategories.filter(
      (c) => filterVal === "all" || c.targetMode === filterVal || c.targetMode === "all"
    );

    if (filteredCats.length === 0) {
      categoriesList.innerHTML = `<p class="option-modifier-text" style="padding:12px;">No categories match the filter.</p>`;
      return;
    }

    filteredCats.forEach((cat) => {
      const card = document.createElement("div");
      card.className = "cat-manage-card";

      const header = document.createElement("div");
      header.className = "cat-manage-header";
      header.innerHTML = `
        <span class="cat-manage-title">
          ${cat.categoryName}
          <span class="badge badge-info">${cat.targetMode}</span>
        </span>
        <div class="cat-actions">
          <button class="btn btn-secondary btn-sm btn-add-opt" data-cat-id="${cat.categoryId}">+ Add Option</button>
          <button class="btn-icon-only btn-delete-cat" data-cat-id="${cat.categoryId}" title="Delete Category">🗑️</button>
        </div>
      `;

      const optList = document.createElement("div");
      optList.className = "options-manage-list";

      if (cat.options.length === 0) {
        optList.innerHTML = `<span class="option-modifier-text">No options added yet.</span>`;
      } else {
        cat.options.forEach((opt) => {
          const item = document.createElement("div");
          item.className = "option-manage-item";
          item.innerHTML = `
            <div>
              <span class="option-label-text">${opt.label}</span>
              <br>
              <span class="option-modifier-text">${opt.promptModifier}</span>
            </div>
            <button class="btn-icon-only btn-delete-opt" data-cat-id="${cat.categoryId}" data-opt-id="${opt.optionId}" title="Delete Option">❌</button>
          `;
          optList.appendChild(item);
        });
      }

      card.appendChild(header);
      card.appendChild(optList);
      categoriesList.appendChild(card);
    });

    document.querySelectorAll(".btn-add-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        targetOptionCategoryId.value = btn.getAttribute("data-cat-id");
        newOptionLabel.value = "";
        newOptionModifier.value = "";
        addOptionModal.classList.remove("hidden");
      });
    });

    document.querySelectorAll(".btn-delete-cat").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const catId = btn.getAttribute("data-cat-id");
        if (confirm("Delete this category?")) {
          currentStore.dropdownCategories = currentStore.dropdownCategories.filter(
            (c) => c.categoryId !== catId
          );
          await saveStore();
          renderCategoryManager();
          renderDynamicCategories();
        }
      });
    });

    document.querySelectorAll(".btn-delete-opt").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const catId = btn.getAttribute("data-cat-id");
        const optId = btn.getAttribute("data-opt-id");
        const cat = currentStore.dropdownCategories.find((c) => c.categoryId === catId);
        if (cat) {
          cat.options = cat.options.filter((o) => o.optionId !== optId);
          await saveStore();
          renderCategoryManager();
          renderDynamicCategories();
        }
      });
    });
  }

  categoryFilterMode.addEventListener("change", renderCategoryManager);

  btnOpenAddCategory.addEventListener("click", () => {
    newCatName.value = "";
    newCatMode.value = currentMode;
    newCatMultiSelect.checked = true;
    addCategoryModal.classList.remove("hidden");
  });

  btnCloseCategoryModal.addEventListener("click", () => {
    addCategoryModal.classList.add("hidden");
  });

  btnSaveCategory.addEventListener("click", async () => {
    const name = newCatName.value.trim();
    if (!name) {
      alert("Please enter a category name.");
      return;
    }

    const newCategory = {
      categoryId: "cat_" + Date.now(),
      categoryName: name,
      targetMode: newCatMode.value,
      isMultiSelect: newCatMultiSelect.checked,
      options: []
    };

    if (!currentStore.dropdownCategories) currentStore.dropdownCategories = [];
    currentStore.dropdownCategories.push(newCategory);
    await saveStore();

    addCategoryModal.classList.add("hidden");
    renderCategoryManager();
    renderDynamicCategories();
  });

  btnCloseOptionModal.addEventListener("click", () => {
    addOptionModal.classList.add("hidden");
  });

  btnSaveOption.addEventListener("click", async () => {
    const catId = targetOptionCategoryId.value;
    const label = newOptionLabel.value.trim();
    const modifier = newOptionModifier.value.trim();

    if (!label || !modifier) {
      alert("Please enter both label and prompt modifier.");
      return;
    }

    const cat = currentStore.dropdownCategories.find((c) => c.categoryId === catId);
    if (cat) {
      cat.options.push({
        optionId: "opt_" + Date.now(),
        label: label,
        promptModifier: modifier
      });
      await saveStore();
      addOptionModal.classList.add("hidden");
      renderCategoryManager();
      renderDynamicCategories();
    }
  });

  // --- AI OPTION GENERATOR (TAB 4) ---
  function populateAiCategoryDropdown() {
    aiTargetCategory.innerHTML = "";
    if (!currentStore || !currentStore.dropdownCategories) return;

    currentStore.dropdownCategories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.categoryId;
      opt.textContent = `${cat.categoryName} (${cat.targetMode})`;
      aiTargetCategory.appendChild(opt);
    });
  }

  btnGenerateAiOptions.addEventListener("click", async () => {
    const catId = aiTargetCategory.value;
    const userQuery = aiPromptInput.value.trim();

    if (!catId) {
      showAiStatus("Please select a target category.", "error");
      return;
    }
    if (!userQuery) {
      showAiStatus("Please enter a natural language request.", "error");
      return;
    }

    const cat = currentStore.dropdownCategories.find((c) => c.categoryId === catId);
    const catName = cat ? cat.categoryName : "Selected Category";
    const targetMode = cat ? cat.targetMode : "all";

    showAiStatus("✨ Invoking AI generator...", "info");
    btnGenerateAiOptions.disabled = true;

    try {
      let generated = [];

      if (window.ai && window.ai.languageModel && typeof window.ai.languageModel.create === "function") {
        try {
          const session = await window.ai.languageModel.create();
          const promptText = `Generate 4 distinct prompt modifier options for category '${catName}' in mode '${targetMode}'.
User request: "${userQuery}".
Return ONLY a valid JSON array of objects with keys "label" and "promptModifier".
Example format: [{"label": "Name", "promptModifier": "Modifier text"}]`;

          const responseText = await session.prompt(promptText);
          session.destroy();

          const jsonMatch = responseText.match(/\[.*\]/s);
          if (jsonMatch) {
            generated = JSON.parse(jsonMatch[0]);
          }
        } catch (aiErr) {
          console.warn("[Contextile AI] Native window.ai fallback invoked:", aiErr);
        }
      }

      if (!generated || generated.length === 0) {
        generated = generateFallbackOptions(userQuery, catName, targetMode);
      }

      generatedAiOptions = generated;
      renderAiResults();
      showAiStatus(`Generated ${generated.length} options successfully!`, "success");
    } catch (err) {
      console.error("[Contextile AI] Error:", err);
      showAiStatus("Failed to generate options: " + err.message, "error");
    } finally {
      btnGenerateAiOptions.disabled = false;
    }
  });

  function showAiStatus(msg, type) {
    aiStatusMessage.className = `status-msg ${type}`;
    aiStatusMessage.textContent = msg;
    aiStatusMessage.classList.remove("hidden");
  }

  function generateFallbackOptions(query, categoryName, mode) {
    const cleanQuery = query.replace(/^generate\s*\d*\s*/i, "").trim();
    return [
      {
        label: `${cleanQuery} - Style A`,
        promptModifier: `Apply high-impact ${cleanQuery} aesthetics with detailed ${categoryName.toLowerCase()} execution.`
      },
      {
        label: `${cleanQuery} - Style B`,
        promptModifier: `Integrate refined ${cleanQuery} elements tailored for ${mode} workflows.`
      },
      {
        label: `${cleanQuery} - Dynamic`,
        promptModifier: `Emphasize dynamic contrast and modern framing based on ${cleanQuery}.`
      },
      {
        label: `${cleanQuery} - Ultra Clean`,
        promptModifier: `Minimalist, highly crisp structure focusing on ${cleanQuery} parameters.`
      }
    ];
  }

  function renderAiResults() {
    aiResultsList.innerHTML = "";
    if (generatedAiOptions.length === 0) {
      aiResultsContainer.classList.add("hidden");
      return;
    }

    generatedAiOptions.forEach((opt, idx) => {
      const item = document.createElement("div");
      item.className = "ai-result-item";
      item.innerHTML = `
        <input type="checkbox" id="ai_opt_${idx}" checked>
        <div class="ai-result-details">
          <h5>${opt.label}</h5>
          <p>${opt.promptModifier}</p>
        </div>
      `;
      aiResultsList.appendChild(item);
    });

    aiResultsContainer.classList.remove("hidden");
  }

  btnAddAiResults.addEventListener("click", async () => {
    const catId = aiTargetCategory.value;
    const cat = currentStore.dropdownCategories.find((c) => c.categoryId === catId);
    if (!cat) return;

    let addedCount = 0;
    generatedAiOptions.forEach((opt, idx) => {
      const cb = document.getElementById(`ai_opt_${idx}`);
      if (cb && cb.checked) {
        cat.options.push({
          optionId: "opt_ai_" + Date.now() + "_" + idx,
          label: opt.label,
          promptModifier: opt.promptModifier
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await saveStore();
      alert(`Successfully added ${addedCount} options to category "${cat.categoryName}"!`);
      aiResultsContainer.classList.add("hidden");
      renderDynamicCategories();
    }
  });

  // --- GEPPY RULES TAB (TAB 5) ---
  function renderCharacterRulesTab() {
    if (!currentStore || !currentStore.characterRules) return;
    const r = currentStore.characterRules;

    const ruleAnimationStyle = document.getElementById("ruleAnimationStyle");
    const ruleMandatoryTraits = document.getElementById("ruleMandatoryTraits");
    const ruleForbidden = document.getElementById("ruleForbidden");

    if (ruleAnimationStyle) ruleAnimationStyle.textContent = r.animationStyle;

    if (ruleMandatoryTraits && r.mandatoryTraits) {
      ruleMandatoryTraits.innerHTML = r.mandatoryTraits.map((t) => `<li>${t}</li>`).join("");
    }

    if (ruleForbidden && r.forbiddenModifications) {
      ruleForbidden.innerHTML = r.forbiddenModifications.map((f) => `<li>${f}</li>`).join("");
    }
  }

  // Run Init
  init();
});
