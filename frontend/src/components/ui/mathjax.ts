declare global {
  interface Window {
    MathJax?: any;
    __mathjaxLoadingPromise?: Promise<void>;
    __mathjaxTypesetPromise?: Promise<void>;
  }
}

const MATHJAX_SRC =
  "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });

export const ensureMathJax = async () => {
  if (window.MathJax) return;
  if (!window.__mathjaxLoadingPromise) {
    window.MathJax = {
      tex: {
        inlineMath: [
          ["\\(", "\\)"],
          ["$", "$"],
        ],
        displayMath: [
          ["\\[", "\\]"],
          ["$$", "$$"],
        ],
      },
      options: {
        renderActions: {
          addMenu: [],
        },
      },
    };
    window.__mathjaxLoadingPromise = loadScript(MATHJAX_SRC);
  }
  try {
    await window.__mathjaxLoadingPromise;
  } catch (error) {
    // Keep UI usable even if CDN is blocked; renderer will show raw text fallback.
    console.error("MathJax failed to load:", error);
    window.MathJax = undefined;
  }
};

export const typesetMathJax = async (elements?: HTMLElement[]) => {
  await ensureMathJax();
  if (!window.MathJax) return;

  const runTypeset = async () => {
    if (window.MathJax.typesetClear) {
      window.MathJax.typesetClear(elements);
    }

    if (window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise(elements);
      return;
    }

    if (window.MathJax.typeset) {
      window.MathJax.typeset(elements);
    }
  };

  const previous = window.__mathjaxTypesetPromise ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(runTypeset);
  window.__mathjaxTypesetPromise = next.catch(() => undefined);
  await next;
};
