// Validador de PDF assinado — upload, reCAPTCHA e exibição do resultado

// Substitua pela mesma site key usada no <script> do reCAPTCHA no HTML.
const RECAPTCHA_SITE_KEY = '6Lc-QDMtAAAAACcW5Fg06gvL9_QtbOuSq-RD0dLv';
const API_URL = 'https://assinando-facil-app.xcwgl7.easypanel.host/api/v1/validar-pdf-assinado';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const REQUEST_TIMEOUT = 30000; // 30s — evita requisições penduradas

const form        = document.getElementById('validador-form');
const uploadCard  = document.querySelector('.validador-card');
const dropzone     = document.getElementById('dropzone');
const fileInput   = document.getElementById('pdf-input');
const fileCard    = document.getElementById('file-card');
const fileNameEl  = document.getElementById('file-name');
const fileSizeEl  = document.getElementById('file-size');
const fileRemove  = document.getElementById('file-remove');
const formError   = document.getElementById('form-error');
const btnValidar  = document.getElementById('btn-validar');
const btnSpinner  = document.getElementById('btn-spinner');
const btnLabel    = document.getElementById('btn-label');
const resultCard  = document.getElementById('result-card');

let selectedFile = null;

/* ─── Helpers ────────────────────────────────────────────── */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = '';
  formError.hidden = true;
}

function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

// Verifica a assinatura binária do arquivo ("magic number"). Um PDF legítimo
// começa com "%PDF-". Impede que arquivos renomeados (ex.: .exe -> .pdf) ou com
// MIME forjado passem na validação por extensão/tipo.
async function hasPdfSignature(file) {
  try {
    const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    return bytes[0] === 0x25 && bytes[1] === 0x50 && // %P
           bytes[2] === 0x44 && bytes[3] === 0x46 && // DF
           bytes[4] === 0x2D;                         // -
  } catch (_) {
    return false;
  }
}

/* ─── File selection ─────────────────────────────────────── */
// Fonte única de verdade: o file-card só aparece quando há um arquivo.
function renderFileState() {
  const hasFile = !!selectedFile;
  fileCard.hidden = !hasFile;
  dropzone.hidden = hasFile;
  btnValidar.disabled = !hasFile;
  if (hasFile) {
    fileNameEl.textContent = selectedFile.name;
    fileSizeEl.textContent = formatSize(selectedFile.size);
  }
}

async function setFile(file) {
  clearError();
  resultCard.hidden = true;

  if (!isPdf(file)) {
    resetFile();
    showError('Formato inválido. Envie um arquivo no formato .PDF.');
    return;
  }
  if (file.size === 0) {
    resetFile();
    showError('O arquivo está vazio.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    resetFile();
    showError('Arquivo muito grande. O tamanho máximo permitido é 10 MB.');
    return;
  }
  if (!(await hasPdfSignature(file))) {
    resetFile();
    showError('O conteúdo do arquivo não é um PDF válido.');
    return;
  }

  selectedFile = file;
  renderFileState();
}

function resetFile() {
  selectedFile = null;
  fileInput.value = '';
  renderFileState();
}

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) setFile(fileInput.files[0]);
});

fileRemove.addEventListener('click', () => {
  resetFile();
  clearError();
  resultCard.hidden = true;
});

/* ─── Drag & drop ────────────────────────────────────────── */
['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) setFile(file);
});

/* ─── Loading state ──────────────────────────────────────── */
function setLoading(loading) {
  if (loading) {
    btnValidar.disabled = true;
    btnValidar.classList.add('is-loading');
    btnSpinner.hidden = false;
    btnLabel.textContent = 'Validando...';
    fileRemove.disabled = true;
  } else {
    btnValidar.disabled = !selectedFile;
    btnValidar.classList.remove('is-loading');
    btnSpinner.hidden = true;
    btnLabel.textContent = 'Validar documento';
    fileRemove.disabled = false;
  }
}

/* ─── File → base64 (sem o prefixo data:) ────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const base64 = String(result).split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/* ─── reCAPTCHA token ────────────────────────────────────── */
function getRecaptchaToken() {
  return new Promise((resolve, reject) => {
    if (typeof grecaptcha === 'undefined') {
      reject(new Error('reCAPTCHA não carregado. Recarregue a página e tente novamente.'));
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action: 'validar_pdf' })
        .then(resolve)
        .catch(() => reject(new Error('Falha na verificação de segurança (reCAPTCHA).')));
    });
  });
}

/* ─── Envio do PDF ───────────────────────────────────────── */
async function enviarPdf(pdfBase64) {
  const token = await getRecaptchaToken();

  // Cancela a requisição se o servidor não responder dentro do timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        pdf_base64: pdfBase64,
        recaptcha_token: token
      }),
      mode: 'cors',
      credentials: 'omit',      // não envia cookies/credenciais para a API externa
      cache: 'no-store',        // não armazena a resposta em cache
      redirect: 'follow',
      referrerPolicy: 'strict-origin-when-cross-origin',
      signal: controller.signal
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Tempo de resposta excedido. Tente novamente.');
    }
    throw new Error('Falha de conexão ao validar o documento. Verifique sua internet e tente novamente.');
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.motivo) || `Não foi possível validar o documento (erro ${response.status}).`;
    throw new Error(message);
  }

  return data;
}

/* ─── Submit ─────────────────────────────────────────────── */
let isSubmitting = false;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedFile || isSubmitting) return; // evita envios concorrentes/repetidos

  isSubmitting = true;
  clearError();
  resultCard.hidden = true;
  setLoading(true);

  try {
    const base64 = await fileToBase64(selectedFile);
    const data = await enviarPdf(base64);
    renderResult(data);
  } catch (err) {
    renderError(err.message || 'Ocorreu um erro inesperado ao validar o documento.');
  } finally {
    isSubmitting = false;
    setLoading(false);
  }
});

/* ─── Ícones (SVG) ───────────────────────────────────────── */
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const ICON_REFRESH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
const ICON_PRINT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>';

// Data/hora formatada no padrão brasileiro (fuso de Brasília).
function formatDateTimeBR(value) {
  let date = value ? new Date(value) : new Date();
  if (isNaN(date.getTime())) date = new Date();
  const dia = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  }).format(date);
  return `${dia} às ${hora} (horário de Brasília)`;
}

/* ─── Render do resultado ────────────────────────────────── */
function renderResult(data) {
  if (!data || typeof data !== 'object') {
    renderError('Resposta inválida recebida do servidor.');
    return;
  }

  const isValid =
    data.success === true || data.sucesso === true ||
    data.valido === true || data.valid === true ||
    data.status === 'valido' || data.status === 'valid';

  if (isValid) {
    renderSuccess(data);
    return;
  }
  renderError(data.motivo || 'Não foi possível confirmar a autenticidade deste documento.');
}

// Tela de sucesso — inspirada no comprovante de validação.
// Campos da resposta: { success, motivo, sha256_pdf }.
function renderSuccess(data) {
  const hash = data.sha256_pdf || '';
  const message = data.motivo || 'Assinatura e integridade do documento confirmadas.';
  // A API não retorna data; usamos o momento da validação.
  const dateText = formatDateTimeBR();
  const fileName = (selectedFile && selectedFile.name) || 'Documento.pdf';

  uploadCard.hidden = true;
  resultCard.className = 'result-card is-success validacao-card';
  resultCard.innerHTML =
    `<div class="validacao-actions">` +
      `<button type="button" class="validacao-link" id="btn-again">${ICON_REFRESH} Validar outro documento</button>` +
      `<button type="button" class="validacao-link" id="btn-print">${ICON_PRINT} Imprimir</button>` +
    `</div>` +
    `<div class="validacao-head">` +
      `<div class="validacao-seal">${ICON_CHECK}</div>` +
      `<h2 class="validacao-title">Documento válido</h2>` +
      `<p class="validacao-date">Validado em ${escapeHtml(dateText)}</p>` +
    `</div>` +
    `<div class="validacao-divider"></div>` +
    `<div class="validacao-file">` +
      `<div class="validacao-file-name">${escapeHtml(fileName)}</div>` +
      (hash ? `<div class="validacao-file-hash">Hash do arquivo validado (SHA-256): <span>${escapeHtml(hash)}</span></div>` : '') +
    `</div>` +
    `<ul class="validacao-checks">` +
      `<li class="validacao-check">` +
        `<span class="validacao-check-icon">${ICON_CHECK}</span>` +
        `<span>${escapeHtml(message)}</span>` +
      `</li>` +
    `</ul>`;
  resultCard.hidden = false;
  bindResultActions();
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderError(message) {
  resultCard.className = 'result-card is-error';
  resultCard.innerHTML =
    `<div class="result-head">` +
      `<div class="result-badge">✕</div>` +
      `<div><div class="result-title">Não foi possível validar</div>` +
      `<div class="result-subtitle">${escapeHtml(message)}</div></div>` +
    `</div>`;
  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function bindResultActions() {
  const again = document.getElementById('btn-again');
  if (again) {
    again.addEventListener('click', () => {
      resetFile();
      clearError();
      resultCard.hidden = true;
      uploadCard.hidden = false;
      uploadCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  const print = document.getElementById('btn-print');
  if (print) {
    print.addEventListener('click', () => window.print());
  }
}
