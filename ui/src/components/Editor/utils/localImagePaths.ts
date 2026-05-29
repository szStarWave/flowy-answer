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

const MARKDOWN_IMAGE_URL_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
const HTML_IMG_SRC_RE = /<img[^>]+src\s*=\s*['"]([^'"]+)['"]/gi;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff?)(\?.*)?$/i;

/** Returns true when the URL cannot be loaded by other users (local / relative paths). */
export function isLocalOrUnsafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  if (/^\/uploads\//i.test(trimmed)) {
    return false;
  }
  if (/^data:image\//i.test(trimmed)) {
    return false;
  }
  if (/^file:/i.test(trimmed)) {
    return true;
  }
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return true;
  }
  if (/^\.\.?\//.test(trimmed)) {
    return true;
  }
  if (/^\/(?!uploads\/)/.test(trimmed) && IMAGE_EXT_RE.test(trimmed)) {
    return true;
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && IMAGE_EXT_RE.test(trimmed)) {
    return true;
  }
  return false;
}

function collectFromMarkdown(text: string, found: Set<string>) {
  Array.from(text.matchAll(MARKDOWN_IMAGE_URL_RE)).forEach((match) => {
    const src = match[1]?.trim();
    if (src && isLocalOrUnsafeImageUrl(src)) {
      found.add(src);
    }
  });
}

function collectFromHtml(text: string, found: Set<string>) {
  const re = new RegExp(HTML_IMG_SRC_RE.source, 'gi');
  Array.from(text.matchAll(re)).forEach((match) => {
    const src = match[1]?.trim();
    if (src && isLocalOrUnsafeImageUrl(src)) {
      found.add(src);
    }
  });
}

/** Scan pasted plain text / HTML for image URLs that only exist on the author's machine. */
export function findLocalImagePathsInTexts(...texts: string[]): string[] {
  const found = new Set<string>();
  texts.forEach((text) => {
    if (!text) {
      return;
    }
    collectFromMarkdown(text, found);
    collectFromHtml(text, found);
  });
  return Array.from(found);
}

export function findLocalImagePathsInClipboard(
  clipboard: DataTransfer | null,
): string[] {
  if (!clipboard) {
    return [];
  }
  return findLocalImagePathsInTexts(
    clipboard.getData('text/plain'),
    clipboard.getData('text/html'),
  );
}
