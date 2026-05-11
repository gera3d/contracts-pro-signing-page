const SUPABASE_URL = "https://uobhsikllffnwvvpedui.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYmhzaWtsbGZmbnd2dnBlZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNzc0ODcsImV4cCI6MjA1OTY1MzQ4N30.UQatwpoT_-Fxcll2vCtd1j8Is6VMLpCaS0iQrXMXKvs";

const els = {
  chip: document.querySelector("#status-chip"),
  empty: document.querySelector("#empty-state"),
  error: document.querySelector("#error-state"),
  errorMessage: document.querySelector("#error-message"),
  card: document.querySelector("#signing-card"),
  title: document.querySelector("#contract-title"),
  number: document.querySelector("#contract-number"),
  signerName: document.querySelector("#signer-name"),
  signerEmail: document.querySelector("#signer-email"),
  signerRole: document.querySelector("#signer-role"),
  signedBanner: document.querySelector("#signed-banner"),
  form: document.querySelector("#signature-form"),
  typedName: document.querySelector("#typed-name"),
  canvas: document.querySelector("#signature-pad"),
  clear: document.querySelector("#clear-signature"),
  consent: document.querySelector("#consent"),
  submit: document.querySelector("#submit-signature"),
  formStatus: document.querySelector("#form-status"),
};

let request = null;
let hasDrawn = false;
let isDrawing = false;
let lastPoint = null;

const ctx = els.canvas.getContext("2d");

function parseToken() {
  const query = new URLSearchParams(window.location.search);
  const queryToken = query.get("token");
  if (queryToken) return queryToken;

  const hashMatch = window.location.hash.match(/^#\/sign\/([^/?#]+)/);
  if (hashMatch) return decodeURIComponent(hashMatch[1]);

  const pathMatch = window.location.pathname.match(/\/sign\/([^/?#]+)/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  return "";
}

function setChip(label, state = "") {
  els.chip.textContent = label;
  els.chip.className = `status-chip ${state}`.trim();
}

function showOnly(section) {
  [els.empty, els.error, els.card].forEach((el) => el.classList.add("hidden"));
  section.classList.remove("hidden");
}

function setFormStatus(message, state = "") {
  els.formStatus.textContent = message;
  els.formStatus.className = `form-status ${state}`.trim();
}

async function rpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText);
  }

  return text ? JSON.parse(text) : null;
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] : value;
}

function renderRequest(row) {
  request = row;
  els.title.textContent = row.contract_title || "Contract";
  els.number.textContent = row.contract_number || "";
  els.signerName.textContent = row.signer_name || "Signer";
  els.signerEmail.textContent = row.signer_email || "";
  els.signerRole.textContent = row.signer_role || "";
  els.typedName.value = row.signer_name || "";

  const signed = row.status === "Signed";
  els.signedBanner.classList.toggle("hidden", !signed);
  els.form.classList.toggle("hidden", signed);
  if (!signed) {
    els.consent.checked = false;
    resetCanvas();
  }
  setChip(row.status || "Pending", signed ? "signed" : "");
  showOnly(els.card);
  validateForm();
}

async function loadRequest() {
  const token = parseToken();
  if (!token) {
    setChip("Missing link");
    showOnly(els.empty);
    return;
  }

  try {
    const data = await rpc("contracts_pro_view_signing_request", {
      p_token: token,
    });
    renderRequest(firstRow(data));
    setFormStatus("Signing request loaded.");
  } catch (error) {
    setChip("Unavailable");
    els.errorMessage.textContent = cleanError(error);
    showOnly(els.error);
  }
}

function cleanError(error) {
  try {
    const parsed = JSON.parse(error.message);
    return parsed.message || "Please check the link and try again.";
  } catch {
    return error.message || "Please check the link and try again.";
  }
}

function resetCanvas() {
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  ctx.fillStyle = "#fffdfa";
  ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
  hasDrawn = false;
  validateForm();
}

function canvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * els.canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * els.canvas.height,
  };
}

function beginStroke(event) {
  event.preventDefault();
  isDrawing = true;
  hasDrawn = true;
  lastPoint = canvasPoint(event);
  els.canvas.setPointerCapture(event.pointerId);
  validateForm();
}

function continueStroke(event) {
  if (!isDrawing || !lastPoint) return;
  event.preventDefault();
  const nextPoint = canvasPoint(event);
  ctx.strokeStyle = "#1f2933";
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(nextPoint.x, nextPoint.y);
  ctx.stroke();
  lastPoint = nextPoint;
}

function endStroke(event) {
  if (isDrawing) {
    event.preventDefault();
  }
  isDrawing = false;
  lastPoint = null;
}

function validateForm() {
  const canSubmit =
    Boolean(request) &&
    els.typedName.value.trim().length > 1 &&
    els.consent.checked &&
    hasDrawn;
  els.submit.disabled = !canSubmit;
}

async function submitSignature(event) {
  event.preventDefault();
  if (!request) return;

  const token = parseToken();
  const typedName = els.typedName.value.trim();
  els.submit.disabled = true;
  setFormStatus("Submitting signature...");

  try {
    const data = await rpc("contracts_pro_submit_signature", {
      p_token: token,
      p_signer_name: request.signer_name,
      p_signer_email: request.signer_email,
      p_typed_name: typedName,
      p_signature_image_base64: els.canvas.toDataURL("image/png"),
      p_audit_metadata: {
        source: "github_pages_signing",
        userAgent: navigator.userAgent,
        consentChecked: els.consent.checked,
        submittedAt: new Date().toISOString(),
      },
      p_signed_pdf_url: null,
    });
    const submitted = firstRow(data) || {};
    renderRequest({ ...request, ...submitted, status: submitted.status || "Signed" });
    setFormStatus("Signed. You can close this page.", "success");
  } catch (error) {
    setFormStatus(cleanError(error), "error");
    validateForm();
  }
}

els.canvas.addEventListener("pointerdown", beginStroke);
els.canvas.addEventListener("pointermove", continueStroke);
els.canvas.addEventListener("pointerup", endStroke);
els.canvas.addEventListener("pointercancel", endStroke);
els.canvas.addEventListener("pointerleave", endStroke);
els.clear.addEventListener("click", resetCanvas);
els.typedName.addEventListener("input", validateForm);
els.consent.addEventListener("change", validateForm);
els.form.addEventListener("submit", submitSignature);
window.addEventListener("hashchange", () => {
  request = null;
  setChip("Loading");
  setFormStatus("");
  resetCanvas();
  loadRequest();
});

resetCanvas();
loadRequest();
