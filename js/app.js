'use strict';

/* ── CONFIGURACIÓN ─────────────────────────────────────────── */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbq0AvLedkSaZ6bEaT_xsIiPtDH8Hx7DfRg9q9RM9IDWM69bmf-MzVCc-uqUYLXt5Twg/exec';
const COOLDOWN_SEC = 10;      // segundos de espera entre envíos

/* ── NUBES INDIVIDUALES ANIMADAS ───────────────────────────── */
(function initClouds() {
    const layer = document.getElementById('clouds-layer');
    if (!layer) return;

    const IMG = 'nube-removebg-preview.png';

    // Bandas verticales — aseguran que las nubes no se sobrepongan
    // Más bandas = más nubes distribuidas por la pantalla
    const BANDS = [
        { minY: 0, maxY: 9 },
        { minY: 9, maxY: 18 },
        { minY: 18, maxY: 27 },
        { minY: 27, maxY: 36 },
        { minY: 36, maxY: 45 },
        { minY: 45, maxY: 54 },
        { minY: 54, maxY: 63 },
        { minY: 63, maxY: 72 },
        { minY: 72, maxY: 81 },
        { minY: 81, maxY: 90 },
    ];

    // 3 nubes por banda = 30 nubes en total
    BANDS.forEach((band) => {
        const count = 3;
        for (let c = 0; c < count; c++) {
            const img = document.createElement('img');
            img.src = IMG;
            img.className = 'cloud-item';
            img.alt = '';

            const size = 70 + Math.random() * 130;           // 70–200px
            const topPct = band.minY + Math.random() * (band.maxY - band.minY);
            const duration = 25 + Math.random() * 45;            // 25–70s
            const delay = -(Math.random() * duration);         // inicio distribuido
            const opacity = 0.10 + Math.random() * 0.15;        // 0.10–0.25

            img.style.cssText = `
                top: ${topPct}%;
                width: ${size}px;
                height: auto;
                opacity: ${opacity};
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
            `;
            layer.appendChild(img);
        }
    });
})();

/* ── UTILIDADES DE SEGURIDAD ───────────────────────────────── */

/**
 * Elimina etiquetas HTML y scripts del texto del usuario.
 * Previene inyección de HTML/XSS en caso de que el servidor
 * refleje el texto sin escapar.
 */
function sanitizeInput(text) {
    return text
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')          // quitar cualquier tag HTML
        .replace(/javascript:/gi, '')      // quitar proto js:
        .replace(/on\w+\s*=/gi, '')        // quitar event handlers inline
        .trim();
}

/**
 * Validación básica antes de enviar (sin mínimo ni máximo de chars).
 * Retorna { ok: boolean, message: string }
 */
function validateInput(text) {
    if (!text || text.replace(/\s/g, '').length === 0) {
        return { ok: false, message: '¡Escribe algo antes de confesar! 🧐' };
    }
    return { ok: true, message: '' };
}

/* ── RATE LIMITING (cliente) ───────────────────────────────── */
let lastSubmitTime = 0;
let cooldownInterval = null;

function isOnCooldown() {
    return (Date.now() - lastSubmitTime) < COOLDOWN_SEC * 1000;
}

function getRemainingSeconds() {
    return Math.ceil((COOLDOWN_SEC * 1000 - (Date.now() - lastSubmitTime)) / 1000);
}

function startCooldownUI() {
    const badge = document.getElementById('cooldownBadge');
    const label = document.getElementById('cooldownLabel');
    const btn = document.getElementById('submitBtn');

    if (!badge || !label || !btn) return;

    btn.disabled = true;
    badge.classList.add('visible');

    function tick() {
        const remaining = getRemainingSeconds();
        if (remaining <= 0) {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
            btn.disabled = false;
            badge.classList.remove('visible');
        } else {
            label.textContent = `Podrás confesar de nuevo en ${remaining}s`;
        }
    }

    tick();
    cooldownInterval = setInterval(tick, 500);
}

/* ── CONFETI ───────────────────────────────────────────────── */
function launchConfetti() {
    const colors = ['#884e96', '#eb598e', '#ffd981', '#c2f8f9', '#f0a2d6'];
    for (let i = 0; i < 60; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.cssText = `
            left: ${Math.random() * 100}vw;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            width:  ${6 + Math.random() * 8}px;
            height: ${6 + Math.random() * 8}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            animation-duration: ${2 + Math.random() * 3}s;
            animation-delay: ${Math.random() * 0.8}s;
        `;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove(), { once: true });
    }
}

/* ── FEEDBACK ──────────────────────────────────────────────── */
function showFeedback(message, type) {
    const el = document.getElementById('feedback');
    if (!el) return;

    el.textContent = message;
    el.className = `${type} visible`;

    // Scroll suave hacia el feedback
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideFeedback() {
    const el = document.getElementById('feedback');
    if (el) { el.className = ''; el.textContent = ''; }
}

/* ── LOADING OVERLAY ───────────────────────────────────────── */
function setLoading(visible) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    if (visible) overlay.classList.add('visible');
    else overlay.classList.remove('visible');
}

/* ── ANIMACIONES DE SECCIONES CON INTERSECTION OBSERVER ─────── */
function initSectionAnimations() {
    const sections = document.querySelectorAll('.section, .confession-type, .warning-text, .quote');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Entra al viewport → forzar re-animación
                entry.target.classList.remove('anim-visible');
                // Pequeño frame para que el browser detecte el cambio de clase
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        entry.target.classList.add('anim-visible');
                    });
                });
            } else {
                // Sale del viewport → resetear para que vuelva a animarse
                entry.target.classList.remove('anim-visible');
            }
        });
    }, { threshold: 0.12 });

    sections.forEach(el => observer.observe(el));
}

/* ── ANIMACIÓN DE LISTA (reglas y demás) ───────────────────── */
function initListItemAnimations() {
    const items = document.querySelectorAll('li');
    items.forEach((li, i) => {
        li.style.setProperty('--li-delay', `${i * 0.07}s`);
        li.classList.add('anim-li');
    });
}

/* ── SUBMIT ────────────────────────────────────────────────── */
function initForm() {
    const form = document.getElementById('dataForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideFeedback();

        // ── Verificar cooldown ──────────────────────────────
        if (isOnCooldown()) {
            showFeedback(`⏳ Espera ${getRemainingSeconds()}s antes de volver a confesar.`, 'error');
            return;
        }

        // ── Obtener y sanitizar texto ───────────────────────
        const textarea = document.getElementById('texto_entrada_id');
        const rawText = textarea.value;
        const cleanText = sanitizeInput(rawText);

        // ── Validar ─────────────────────────────────────────
        const validation = validateInput(cleanText);
        if (!validation.ok) {
            showFeedback('⚠️ ' + validation.message, 'error');
            textarea.focus();
            return;
        }

        // ── Enviar ──────────────────────────────────────────
        setLoading(true);
        const btn = document.getElementById('submitBtn');
        if (btn) btn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('texto_entrada', cleanText);

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.result === 'success') {
                lastSubmitTime = Date.now();
                launchConfetti();
                showFeedback('✅ ¡Confesión enviada y guardada anónimamente! 🤫', 'success');
                form.reset();
                startCooldownUI();
            } else {
                throw new Error(data.message || 'Respuesta inesperada del servidor.');
            }

        } catch (err) {
            console.error('[Confesionario] Error:', err);
            showFeedback('❌ Error al enviar: ' + err.message, 'error');
            if (btn) btn.disabled = false;
        } finally {
            setLoading(false);
        }
    });
}

/* ── INIT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initSectionAnimations();
    initListItemAnimations();
    initForm();
});
