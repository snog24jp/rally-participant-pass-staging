const defaultEventShareToken = "m0-local-event-share-token-00000001";
const apiBaseURL = localAPIBaseURL();

const messages = {
  ja: {
    eyebrow: "Participant Pass",
    yourBalance: "あなたの精算額",
    viewAs: "自分の名前を確認",
    participantNameLabel: "参加者名",
    confirmName: "確認",
    totalSpend: "合計支出",
    perPerson: "1人あたり",
    payments: "支払い件数",
    settlement: "精算案",
    expenses: "支払い履歴",
    live: "ライブ",
    aiPreview: "AIプレビュー",
    ctaTitle: "Rallyでイベントを管理する",
    ctaBody: "Rallyなら、支払いの追加、精算回数の削減、参加者への共有までまとめて管理できます。",
    openApp: "Rallyで管理する",
    receives: "受け取り",
    pays: "支払い",
    settled: "精算不要",
    from: "から",
    noTransfers: "この参加者に必要な精算はありません",
    copied: "共有リンクをコピーしました",
    appLater: "Rallyアプリを開いています",
    loading: "読み込み中",
    loadFailed: "共有リンクを確認できませんでした",
    missingSharedLink: "共有リンクから開いてください",
    missingSharedLinkHint: "このページ単体では精算情報を表示できません。Rallyアプリでイベントの共有リンクを作成し、そのリンクから開いてください。",
    linkExpired: "共有リンクは失効または期限切れです。幹事に新しいリンクを確認してください。",
    participantLinkExpired: "本人確認済みリンクは失効しました。もう一度、自分の名前を入力してください。",
    chooseParticipant: "自分の名前を入力してください",
    evidence: "精算根拠",
    receiveFrom: "{name} から受け取り",
    payTo: "{name} へ支払い",
    cancel: "戻る",
    missingName: "名前が見つからない場合は幹事に確認してください",
    privacyHint: "残高と精算根拠は、参加者名を確認してから表示します。共有リンクだけでは表示しません。",
    privateViewHint: "この表示はあなたの確認済みリンクにだけ表示されています。",
    organizerRecovery: "リンクが無効な場合は幹事に新しいリンクを確認してください。",
    organizerRecoveryAction: "この画面を幹事に送る",
    organizerRecoveryCopied: "幹事へ送る内容をコピーしました",
    recoveryState: "状態コード",
    recoveryEvent: "イベント",
    closedEvent: "このイベントは締め済みです。",
    appBenefit: "次回の幹事をもっと楽にする",
    categories: {
      dinner: "食事",
      taxi: "タクシー",
      "test-snack": "軽食"
    }
  },
  en: {
    eyebrow: "Participant Pass",
    yourBalance: "Your balance",
    viewAs: "Confirm your name",
    participantNameLabel: "Participant name",
    confirmName: "Confirm",
    totalSpend: "Total spend",
    perPerson: "Per person",
    payments: "Payments",
    settlement: "Settlement",
    expenses: "Expenses",
    live: "Live",
    aiPreview: "AI preview",
    ctaTitle: "Keep this event organized",
    ctaBody: "Open Rally to add payments, reduce settlement steps, and invite the next participant.",
    openApp: "Open Rally",
    receives: "You receive",
    pays: "You pay",
    settled: "No settlement needed",
    from: "from",
    noTransfers: "No transfer for this participant",
    copied: "Share link copied",
    appLater: "Opening Rally",
    loading: "Loading",
    loadFailed: "Could not verify this shared link",
    missingSharedLink: "Open from a shared link",
    missingSharedLinkHint: "This page cannot show settlement details by itself. Create an event share link in the Rally app, then open that link.",
    linkExpired: "This shared link was revoked or expired. Ask the organizer for a new link.",
    participantLinkExpired: "Your identified link was revoked or expired. Enter your name again.",
    chooseParticipant: "Enter your name",
    evidence: "Settlement evidence",
    receiveFrom: "Receive from {name}",
    payTo: "Pay {name}",
    cancel: "Back",
    missingName: "If your name cannot be found, ask the organizer",
    privacyHint: "Balances and settlement evidence appear after Rally confirms your participant name. The shared event link alone does not show them.",
    privateViewHint: "This view is only shown through your identified link.",
    organizerRecovery: "If the link is invalid, ask the organizer for a new link.",
    organizerRecoveryAction: "Send this screen to organizer",
    organizerRecoveryCopied: "Copied organizer recovery text",
    recoveryState: "State code",
    recoveryEvent: "Event",
    closedEvent: "This event is closed.",
    appBenefit: "Make your next event easier",
    categories: {
      dinner: "Dinner",
      taxi: "Taxi",
      "test-snack": "Snack"
    }
  }
};

let locale = "ja";
const initialParams = new URLSearchParams(location.search);
const providedEventShareToken = initialParams.get("eventShareToken")?.trim() ?? "";
const shouldUseDefaultEventShareToken = !providedEventShareToken && isLocalPreview();
let eventShareToken = providedEventShareToken || (shouldUseDefaultEventShareToken ? defaultEventShareToken : "");
let eventData = null;
let balanceData = null;
let selectedParticipantId = null;
let participantViewToken = null;
let loadError = null;
let participantSessionNotice = null;
let participantSessionErrorCode = null;
let identifyInFlight = false;

stripUnsafeParticipantTokenFromURL();

function localAPIBaseURL() {
  const configuredBaseURL = document.currentScript?.dataset?.apiBaseUrl?.trim();
  if (configuredBaseURL) return configuredBaseURL.replace(/\/$/, "");
  if ((location.hostname === "127.0.0.1" || location.hostname === "localhost") && location.port === "4173") {
    return "http://127.0.0.1:54321/functions/v1";
  }
  return `${location.origin}/functions/v1`;
}

function isLocalPreview() {
  return location.hostname === "127.0.0.1" || location.hostname === "localhost";
}

function t(key) {
  return messages[locale][key];
}

function formatMoney(amount, currency) {
  const localeId = locale === "ja" ? "ja-JP" : "en-US";
  const fractionDigits = currency === "JPY" ? 0 : 2;
  return new Intl.NumberFormat(localeId, {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  }).format(amount);
}

function formatMessage(key, values) {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, value),
    t(key)
  );
}

function categoryLabel(category) {
  if (!category) return t("evidence");
  return messages[locale].categories[category] ?? category;
}

async function apiPost(functionName, body) {
  const response = await fetch(`${apiBaseURL}/${functionName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => {
    throw new Error("API response was not valid JSON.");
  });
  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    const error = new Error(message);
    error.code = payload?.error?.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadEvent() {
  loadError = null;
  participantSessionErrorCode = null;
  renderLoading();
  if (!eventShareToken) {
    render();
    return;
  }
  try {
    eventData = await apiPost("participant-resolve-event", { eventShareToken });
    participantViewToken = participantViewToken || sessionStorage.getItem(participantTokenStorageKey());
    if (participantViewToken) {
      try {
        balanceData = await apiPost("participant-view-balance", { participantViewToken });
        selectedParticipantId = balanceData.participant.participantId;
        updateURL();
      } catch (error) {
        if (isParticipantTokenExpired(error)) {
          clearParticipantSession();
          balanceData = null;
          selectedParticipantId = null;
          participantSessionNotice = t("participantLinkExpired");
          participantSessionErrorCode = error.code;
        } else {
          throw error;
        }
      }
    }
    render();
  } catch (error) {
    loadError = error;
    render();
  }
}

async function loadParticipantBalance(displayName) {
  if (identifyInFlight) return;
  identifyInFlight = true;
  participantSessionNotice = null;
  participantSessionErrorCode = null;
  try {
    const identify = await apiPost("participant-identify", { eventShareToken, displayName });
    participantViewToken = identify.participantViewToken;
    sessionStorage.setItem(participantTokenStorageKey(), participantViewToken);
    balanceData = await apiPost("participant-view-balance", { participantViewToken });
    selectedParticipantId = balanceData.participant.participantId;
    updateURL();
  } finally {
    identifyInFlight = false;
  }
}

function isParticipantTokenExpired(error) {
  return error?.code === "participant_view_revoked" || error?.code === "participant_view_expired";
}

function isEventTokenExpired(error) {
  return error?.code === "event_share_revoked" || error?.code === "event_share_expired";
}

function clearParticipantSession() {
  sessionStorage.removeItem(participantTokenStorageKey());
  participantViewToken = null;
}

function participantTokenStorageKey() {
  return `rally.participantViewToken.${eventShareToken}`;
}

function updateURL() {
  const params = new URLSearchParams();
  params.set("eventShareToken", eventShareToken);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

function stripUnsafeParticipantTokenFromURL() {
  const params = new URLSearchParams(location.search);
  if (!params.has("participantViewToken")) return;
  params.delete("participantViewToken");
  if (!params.has("eventShareToken") && eventShareToken) params.set("eventShareToken", eventShareToken);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

function renderLoading() {
  document.getElementById("eventName").textContent = "Rally";
  document.getElementById("participantBalance").textContent = t("loading");
  document.getElementById("balanceNote").textContent = "";
  document.getElementById("statusPill").textContent = "";
  setDataBadgesVisible(false);
  document.getElementById("ctaBand").classList.add("hidden");
}

function render() {
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.getElementById("languageButton").textContent = locale.toUpperCase();

  if (loadError) {
    renderError();
    return;
  }
  if (!eventShareToken) {
    renderMissingSharedLink();
    return;
  }
  if (!eventData) {
    renderLoading();
    return;
  }

  document.getElementById("eventName").textContent = eventData.eventName;
  renderParticipants();

  if (!balanceData) {
    renderParticipantPrompt();
    return;
  }

  renderSummary();
  setDataBadgesVisible(true);
  renderMetrics();
  renderExpenses();
  renderSettlements();
}

function setDataBadgesVisible(isVisible) {
  document.getElementById("settlementBadge").classList.toggle("hidden", !isVisible);
  document.getElementById("expenseBadge").classList.toggle("hidden", !isVisible);
}

function renderMissingSharedLink() {
  document.getElementById("eventName").textContent = "Rally";
  document.getElementById("participantBalance").textContent = t("missingSharedLink");
  document.getElementById("balanceNote").textContent = t("missingSharedLinkHint");
  document.getElementById("statusPill").textContent = "";
  resetIdentifyForm({ disabled: true });
  document.getElementById("participantCount").textContent = "0";
  document.getElementById("totalSpend").textContent = "-";
  document.getElementById("perPerson").textContent = "-";
  document.getElementById("paymentCount").textContent = "-";
  document.getElementById("expenseList").replaceChildren();
  document.getElementById("settlementList").replaceChildren();
  setDataBadgesVisible(false);
  document.getElementById("identifyPanel").classList.add("hidden");
  document.getElementById("identifyPanel").replaceChildren();
  document.getElementById("ctaBand").classList.add("hidden");
}

function renderError() {
  document.getElementById("eventName").textContent = eventData?.eventName || "Rally";
  document.getElementById("participantBalance").textContent = t("loadFailed");
  document.getElementById("balanceNote").textContent = isEventTokenExpired(loadError)
    ? `${t("linkExpired")} ${t("organizerRecovery")}`
    : `${loadError.message} ${t("organizerRecovery")}`;
  document.getElementById("statusPill").textContent = "";
  resetIdentifyForm({ disabled: true });
  document.getElementById("participantCount").textContent = "0";
  document.getElementById("totalSpend").textContent = "-";
  document.getElementById("perPerson").textContent = "-";
  document.getElementById("paymentCount").textContent = "-";
  document.getElementById("expenseList").replaceChildren();
  document.getElementById("settlementList").replaceChildren();
  setDataBadgesVisible(false);
  document.getElementById("identifyPanel").classList.add("hidden");
  document.getElementById("identifyPanel").replaceChildren();
  document.getElementById("ctaBand").classList.add("hidden");
  renderOrganizerRecovery("load_failed");
}

function renderParticipantPrompt() {
  document.getElementById("participantBalance").textContent = t("chooseParticipant");
  document.getElementById("balanceNote").textContent = participantSessionNotice ?? t("privacyHint");
  document.getElementById("statusPill").textContent = "";
  document.getElementById("totalSpend").textContent = "-";
  document.getElementById("perPerson").textContent = "-";
  document.getElementById("paymentCount").textContent = "-";
  document.getElementById("expenseList").replaceChildren();
  document.getElementById("settlementList").replaceChildren(
    listItem({ title: t("chooseParticipant"), meta: t("missingName"), amount: "" })
  );
  setDataBadgesVisible(false);
  document.getElementById("identifyPanel").classList.add("hidden");
  document.getElementById("identifyPanel").replaceChildren();
  renderOrganizerRecovery(participantSessionErrorCode ?? (participantSessionNotice ? "participant_view_expired" : "choose_participant_or_missing_name"));
  document.getElementById("ctaBand").classList.add("hidden");
}

function renderParticipants() {
  const count = Number.isFinite(Number(eventData?.participantCount)) ? Number(eventData.participantCount) : 0;
  document.getElementById("participantCount").textContent = `${count}`;
  resetIdentifyForm({ disabled: Boolean(balanceData) || identifyInFlight });
}

function renderSummary() {
  const { amount, currency, direction } = balanceData.balance;
  document.getElementById("participantBalance").textContent = formatMoney(Math.abs(amount), currency);

  const note = document.getElementById("balanceNote");
  const pill = document.getElementById("statusPill");
  const closedPrefix = eventData?.status === "closed" ? `${t("closedEvent")} ` : "";
  if (direction === "receives") {
    note.textContent = `${closedPrefix}${t("receives")}。${t("privateViewHint")}`;
    pill.textContent = t("receives");
    pill.style.color = "var(--green)";
  } else if (direction === "pays") {
    note.textContent = `${closedPrefix}${t("pays")}。${t("privateViewHint")}`;
    pill.textContent = t("pays");
    pill.style.color = "var(--amber)";
  } else {
    note.textContent = `${closedPrefix}${t("settled")}。${t("privateViewHint")}`;
    pill.textContent = t("settled");
    pill.style.color = "var(--green)";
  }
  document.getElementById("identifyPanel").classList.add("hidden");
  document.getElementById("identifyPanel").replaceChildren();
  document.getElementById("ctaBand").classList.remove("hidden");
}

function renderOrganizerRecovery(reasonCode) {
  const panel = document.getElementById("identifyPanel");
  const eventName = eventData?.eventName || balanceData?.event?.eventName || "Rally";
  const stateCode = recoveryStateCode(reasonCode);
  const title = document.createElement("p");
  title.className = "confirm-title";
  title.textContent = `${t("recoveryEvent")}: ${eventName}`;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${t("recoveryState")}: ${stateCode}`;

  const button = document.createElement("button");
  button.className = "secondary-button";
  button.type = "button";
  button.textContent = t("organizerRecoveryAction");
  button.addEventListener("click", async () => {
    const text = organizerRecoveryText(eventName, stateCode, reasonCode);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      window.alert(t("organizerRecoveryCopied"));
      return;
    }
    window.prompt(t("organizerRecoveryAction"), text);
  });

  panel.replaceChildren(title, meta, button);
  panel.classList.remove("hidden");
}

function recoveryStateCode(reasonCode) {
  const tokenTail = eventShareToken.slice(-6).replace(/[^a-zA-Z0-9]/g, "x");
  const code = loadError?.code || reasonCode || "unknown";
  return `${code}:${tokenTail}`;
}

function organizerRecoveryText(eventName, stateCode, reasonCode) {
  const reason = loadError?.code || reasonCode || "unknown";
  if (locale === "ja") {
    return [
      "Rallyの参加者画面で確認が必要です。",
      `イベント: ${eventName}`,
      `状態コード: ${stateCode}`,
      `理由: ${reason}`,
      "共有URLの再発行、参加者名、本人確認申請の状態を確認してください。"
    ].join("\n");
  }
  return [
    "Rally Participant Pass needs organizer help.",
    `Event: ${eventName}`,
    `State code: ${stateCode}`,
    `Reason: ${reason}`,
    "Please check the share link, participant name, or claim status."
  ].join("\n");
}

function renderMetrics() {
  const { totalSpend, perPerson, paymentCount } = balanceData.metrics;
  const currency = balanceData.event.defaultCurrency;
  document.getElementById("totalSpend").textContent = formatMoney(totalSpend, currency);
  document.getElementById("perPerson").textContent = formatMoney(perPerson, currency);
  document.getElementById("paymentCount").textContent = String(paymentCount);
}

function renderExpenses() {
  const container = document.getElementById("expenseList");
  container.replaceChildren();

  for (const expense of balanceData.expenseEvidence) {
    container.append(
      listItem({
        title: categoryLabel(expense.category),
        meta: expense.payerDisplayName,
        amount: formatMoney(expense.amount, expense.currency),
        tone: expense.payerDisplayName === balanceData.participant.displayName ? "positive" : ""
      })
    );
  }
}

function renderSettlements() {
  const container = document.getElementById("settlementList");
  container.replaceChildren();

  if (balanceData.transfers.length === 0) {
    container.append(listItem({ title: t("noTransfers"), meta: t("settled"), amount: "" }));
    return;
  }

  for (const transfer of balanceData.transfers) {
    const isPayer = transfer.fromParticipantId === selectedParticipantId;
    const other = isPayer ? transfer.toDisplayName : transfer.fromDisplayName;
    container.append(
      listItem({
        title: isPayer ? formatMessage("payTo", { name: other }) : formatMessage("receiveFrom", { name: other }),
        meta: balanceData.event.eventName,
        amount: formatMoney(transfer.amount, transfer.currency),
        tone: isPayer ? "negative" : "positive"
      })
    );
  }
}

function listItem({ title, meta, amount, tone = "" }) {
  const item = document.createElement("article");
  item.className = "list-item";
  const copy = document.createElement("div");
  const titleNode = document.createElement("div");
  titleNode.className = "title";
  titleNode.textContent = title;
  const metaNode = document.createElement("span");
  metaNode.className = "meta";
  metaNode.textContent = meta;
  copy.append(titleNode, metaNode);

  const amountNode = document.createElement("strong");
  amountNode.className = `amount ${tone}`;
  amountNode.textContent = amount;
  item.append(copy, amountNode);
  return item;
}

document.getElementById("languageButton").addEventListener("click", () => {
  locale = locale === "ja" ? "en" : "ja";
  render();
});

document.getElementById("shareButton").addEventListener("click", async () => {
  const params = new URLSearchParams();
  params.set("eventShareToken", eventShareToken);
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
  }
  window.alert(t("copied"));
});

document.getElementById("participantIdentifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (identifyInFlight) return;
  const input = document.getElementById("participantNameInput");
  const displayName = input.value.trim().replace(/\s+/g, " ");
  if (!displayName) {
    participantSessionNotice = t("missingName");
    participantSessionErrorCode = "invalid_display_name";
    render();
    input.focus();
    return;
  }
  try {
    renderLoading();
    await loadParticipantBalance(displayName);
    render();
  } catch (error) {
    if (isEventTokenExpired(error)) {
      loadError = error;
    } else {
      clearParticipantSession();
      balanceData = null;
      selectedParticipantId = null;
      participantSessionNotice = error.message;
      participantSessionErrorCode = error.code ?? "participant_identify_failed";
    }
    render();
  }
});

document.getElementById("openAppButton").addEventListener("click", () => {
  openRallyFromParticipantPass();
});

loadEvent();

function openRallyFromParticipantPass() {
  const button = document.getElementById("openAppButton");
  const deepLink = participantDeepLink(button.dataset.deepLinkBase);
  const appStoreURL = configuredHTTPSURL(button.dataset.appStoreUrl);
  const waitlistURL = configuredHTTPSURL(button.dataset.waitlistUrl);
  let pageWasHidden = false;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") pageWasHidden = true;
  };
  document.addEventListener("visibilitychange", onVisibilityChange, { once: true });

  recordGrowthAction("opened", "deep_link");
  window.location.href = deepLink;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (pageWasHidden) return;
    if (appStoreURL) {
      recordGrowthAction("app_store_fallback", "app_store");
      window.location.href = appStoreURL;
      return;
    }
    if (waitlistURL) {
      recordGrowthAction("waitlist_fallback", "waitlist");
      window.location.href = waitlistURL;
      return;
    }
    recordGrowthAction("unavailable", "none");
    window.alert(t("appLater"));
  }, 900);
}

function participantDeepLink(baseValue) {
  const base = baseValue || "rally://participant-pass";
  const deepLink = new URL(base);
  deepLink.searchParams.set("source", "participant_pass");
  return deepLink.toString();
}

function configuredHTTPSURL(value) {
  if (!value) return null;
  try {
    const url = new URL(value, location.origin);
    if (url.protocol !== "https:" && url.origin !== location.origin) return null;
    url.searchParams.set("source", "participant_pass");
    return url.toString();
  } catch {
    return null;
  }
}

function resetIdentifyForm({ disabled }) {
  const input = document.getElementById("participantNameInput");
  const button = document.getElementById("participantIdentifyButton");
  input.disabled = disabled;
  button.disabled = disabled;
}

function recordGrowthAction(action, handoffTarget) {
  apiPost("participant-record-growth-action", {
    eventShareToken,
    action,
    handoffTarget,
    locale
  }).catch((error) => console.error("participant_growth_action_failed", error));
}
