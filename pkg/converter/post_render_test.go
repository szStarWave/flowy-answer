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

package converter

import (
	"strings"
	"testing"
)

func TestRenderPostMarkdownForAPI_HeadingsAndGFM(t *testing.T) {
	const src = `# Hello

Some intro.

## Section **A**

| a | b |
|---|---|
| 1 | 2 |

### Sub
`
	html, outline, err := RenderPostMarkdownForAPI(src)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(html, `<table`) {
		t.Fatalf("expected GFM table in html, got: %s", html)
	}
	if len(outline) < 3 {
		t.Fatalf("expected at least 3 headings, got %d: %#v", len(outline), outline)
	}
	if outline[0].Level != 1 || !strings.Contains(outline[0].Text, "Hello") {
		t.Fatalf("first heading: %#v", outline[0])
	}
	if outline[0].ID == "" {
		t.Fatal("heading id should not be empty")
	}
	if !strings.Contains(html, `id="`+outline[0].ID+`"`) {
		t.Fatalf("html should contain heading id %q", outline[0].ID)
	}
}

func TestMarkdownHeadingOutlines_DeduplicatesViaGoldmark(t *testing.T) {
	src := "# Title\n\n## Same\n\n## Same\n"
	out := MarkdownHeadingOutlines(src)
	if len(out) != 3 {
		t.Fatalf("got %d outlines: %#v", len(out), out)
	}
	if out[1].ID == out[2].ID {
		t.Fatalf("expected distinct ids for duplicate heading text, got %q and %q", out[1].ID, out[2].ID)
	}
}

func TestRenderPostMarkdownForAPI_MermaidFence(t *testing.T) {
	const src = "```mermaid\ngraph TD\n  A-->B\n```\n"
	html, _, err := RenderPostMarkdownForAPI(src)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(html, `an-diagram--mermaid`) {
		t.Fatalf("expected mermaid mount, got: %s", html)
	}
	if !strings.Contains(html, `an-diagram__src`) {
		t.Fatal("expected escaped source pre")
	}
}

func TestRenderPostMarkdownForAPI_MathFence(t *testing.T) {
	const src = "```math\nE = mc^2\n```\n"
	html, _, err := RenderPostMarkdownForAPI(src)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(html, `an-diagram--math`) {
		t.Fatalf("expected math mount: %s", html)
	}
}

// Non-diagram fenced blocks use goldmarkHTML.Config.Writer; a zero Config panics (regression: Ask page preview).
func TestRenderPostMarkdownForAPI_PlainFencedCode(t *testing.T) {
	const src = "```go\nfunc main() {}\n```\n"
	html, _, err := RenderPostMarkdownForAPI(src)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(html, `language-go`) || !strings.Contains(html, `<pre><code`) {
		t.Fatalf("expected highlighted fenced code, got: %s", html)
	}
}

func TestMayHaveMarkdownHeadings(t *testing.T) {
	if !MayHaveMarkdownHeadings("# x") {
		t.Fatal()
	}
	if !MayHaveMarkdownHeadings("a\n## x") {
		t.Fatal()
	}
	if !MayHaveMarkdownHeadings("intro\n   ## indented-atx") {
		t.Fatal("ATX headings may be indented with spaces")
	}
	if MayHaveMarkdownHeadings("no headings here") {
		t.Fatal()
	}
}
