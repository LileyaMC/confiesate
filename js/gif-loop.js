/**
 * gif-loop.js
 * Fuerza bucle infinito en todas las imágenes GIF con clase .reglas-gif
 * usando gifuct-js para parsear frames y renderizarlos en <canvas>.
 */

async function makeGifLoop(img) {
    try {
        const response = await fetch(img.src);
        if (!response.ok) throw new Error(`No se pudo cargar: ${img.src}`);
        const buffer = await response.arrayBuffer();

        // Parsear el GIF con gifuct-js (globals: parseGIF, decompressFrames)
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);

        if (!frames || frames.length === 0) {
            console.warn('GIF sin frames:', img.src);
            return;
        }

        // Crear canvas con las mismas dimensiones lógicas del GIF
        const canvas = document.createElement('canvas');
        canvas.className = img.className;
        if (img.id) canvas.id = img.id;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', img.getAttribute('alt') || '');

        const gifW = gif.lsd.width;
        const gifH = gif.lsd.height;
        canvas.width  = gifW;
        canvas.height = gifH;

        // Canvas oculto para composición de frames
        const offscreen    = document.createElement('canvas');
        offscreen.width    = gifW;
        offscreen.height   = gifH;
        const offscreenCtx = offscreen.getContext('2d');

        const ctx = canvas.getContext('2d');
        let frameIndex  = 0;
        let timeoutId   = null;

        function renderFrame() {
            const frame = frames[frameIndex];
            const { left, top, width, height } = frame.dims;

            // Poner los píxeles del frame en el canvas offscreen
            const frameData = new ImageData(
                new Uint8ClampedArray(frame.patch),
                width,
                height
            );
            offscreenCtx.putImageData(frameData, left, top);

            // Copiar al canvas visible
            ctx.clearRect(0, 0, gifW, gifH);
            ctx.drawImage(offscreen, 0, 0);

            // Limpiar zona del frame si el modo de disposición lo requiere
            if (frame.disposalType === 2) {
                offscreenCtx.clearRect(left, top, width, height);
            }

            // Siguiente frame (bucle infinito)
            frameIndex = (frameIndex + 1) % frames.length;
            const delay = frame.delay > 0 ? frame.delay : 100; // ms (gifuct ya convierte cs→ms)
            timeoutId = setTimeout(renderFrame, delay);
        }

        // Reemplazar el <img> por el <canvas>
        img.parentNode.replaceChild(canvas, img);
        renderFrame();

    } catch (err) {
        console.error('[gif-loop] Error procesando GIF:', img.src, err);
        // Si falla, el <img> original sigue visible
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const gifs = document.querySelectorAll('img.reglas-gif');
    gifs.forEach(img => makeGifLoop(img));
});
