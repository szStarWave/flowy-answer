/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/** Client-side enrichment for server-rendered markdown (Mermaid, KaTeX). */

let mermaidInitPromise: Promise<void> | null = null;

async function ensureMermaid(): Promise<typeof import('mermaid').default> {
  const m = await import('mermaid');
  if (!mermaidInitPromise) {
    mermaidInitPromise = (async () => {
      const isDark =
        document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
        document.documentElement.classList.contains('dark');
      m.default.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'default',
      });
    })();
  }
  await mermaidInitPromise;
  return m.default;
}

async function renderMermaidBlocks(root: HTMLElement): Promise<void> {
  const blocks = Array.from(
    root.querySelectorAll('.an-diagram--mermaid:not([data-an-diagram-ready])'),
  ) as HTMLElement[];
  if (!blocks.length) {
    return;
  }
  const mermaid = await ensureMermaid();
  await Promise.all(
    blocks.map(async (block, i) => {
      const srcEl = block.querySelector('.an-diagram__src');
      const outEl = block.querySelector(
        '.an-diagram__out',
      ) as HTMLElement | null;
      if (!srcEl || !outEl) {
        return;
      }
      const definition = srcEl.textContent || '';
      if (!definition.trim()) {
        block.setAttribute('data-an-diagram-ready', '1');
        return;
      }
      const id = `an-mer-${crypto.randomUUID?.() ?? `${Date.now()}-${i}`}`;
      try {
        const out = await mermaid.render(id, definition);
        const svg =
          typeof out === 'string' ? out : (out as { svg: string }).svg;
        outEl.innerHTML = svg;
        block.setAttribute('data-an-diagram-ready', '1');
      } catch {
        outEl.innerHTML = `<span class="text-danger small">Mermaid</span>`;
        block.setAttribute('data-an-diagram-ready', '1');
      }
    }),
  );
}

async function renderMathBlocks(root: HTMLElement): Promise<void> {
  const blocks = Array.from(
    root.querySelectorAll('.an-diagram--math:not([data-an-diagram-ready])'),
  ) as HTMLElement[];
  if (!blocks.length) {
    return;
  }
  const katex = (await import('katex')).default;
  await import('katex/dist/katex.min.css');
  blocks.forEach((block) => {
    const srcEl = block.querySelector('.an-diagram__src');
    const outEl = block.querySelector('.an-diagram__out') as HTMLElement | null;
    if (!srcEl || !outEl) {
      return;
    }
    const tex = srcEl.textContent || '';
    const display = block.getAttribute('data-an-math-display') === '1';
    try {
      katex.render(tex, outEl, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
      });
      block.setAttribute('data-an-diagram-ready', '1');
    } catch {
      block.setAttribute('data-an-diagram-ready', '1');
    }
  });
}

async function renderInlineMath(root: HTMLElement): Promise<void> {
  if (root.dataset.anMathAutorender === '1') {
    return;
  }
  const text = root.innerHTML || '';
  if (!/(\$\$|\\\(|\\\[)/.test(text)) {
    return;
  }
  const autoRenderMod: { default?: (el: HTMLElement, opts: object) => void } =
    await import('katex/contrib/auto-render');
  const renderMathInElement =
    autoRenderMod.default ??
    (autoRenderMod as unknown as (el: HTMLElement, opts: object) => void);
  await import('katex/dist/katex.min.css');
  renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    ignoredTags: [
      'script',
      'noscript',
      'style',
      'textarea',
      'pre',
      'code',
      'svg',
      'annotation',
    ],
    throwOnError: false,
    strict: 'ignore',
  });
  root.dataset.anMathAutorender = '1';
}

/**
 * Run after trusted server HTML is injected into the DOM.
 * Safe: only executes Mermaid/KaTeX on known mount points and math delimiters.
 */
export async function enrichFormattedContent(
  root: HTMLElement | null,
): Promise<void> {
  if (!root) {
    return;
  }
  await renderMermaidBlocks(root);
  await renderMathBlocks(root);
  await renderInlineMath(root);
}
