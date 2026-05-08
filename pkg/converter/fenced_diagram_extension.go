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
	"html"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/renderer"
	goldmarkHTML "github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/util"
)

// fenceDiagramExtension registers a high-priority fenced-code renderer for mermaid / TeX blocks.
type fenceDiagramExtension struct{}

func (e *fenceDiagramExtension) Extend(m goldmark.Markdown) {
	m.Renderer().AddOptions(renderer.WithNodeRenderers(
		util.Prioritized(&fenceDiagramFencedRenderer{
			Config: goldmarkHTML.NewConfig(),
		}, -1),
	))
}

type fenceDiagramFencedRenderer struct {
	goldmarkHTML.Config
}

func (r *fenceDiagramFencedRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	reg.Register(ast.KindFencedCodeBlock, r.renderFencedCodeBlock)
}

func fencedCodeBlockBody(source []byte, n *ast.FencedCodeBlock) string {
	var b strings.Builder
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		line := lines.At(i)
		b.Write(source[line.Start:line.Stop])
	}
	return strings.TrimSuffix(b.String(), "\n")
}

func fencedCodeLanguage(source []byte, n *ast.FencedCodeBlock) string {
	lang := n.Language(source)
	if lang == nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(string(lang)))
}

func isDiagramFenceLanguage(lang string) bool {
	switch lang {
	case "mermaid", "math", "latex", "tex":
		return true
	default:
		return false
	}
}

func (r *fenceDiagramFencedRenderer) writeLinesRaw(w util.BufWriter, source []byte, n ast.Node) {
	l := n.Lines().Len()
	for i := 0; i < l; i++ {
		line := n.Lines().At(i)
		r.Writer.RawWrite(w, line.Value(source))
	}
}

func (r *fenceDiagramFencedRenderer) renderFencedCodeBlock(
	w util.BufWriter, source []byte, node ast.Node, entering bool,
) (ast.WalkStatus, error) {
	n := node.(*ast.FencedCodeBlock)
	lang := fencedCodeLanguage(source, n)

	if !entering {
		if isDiagramFenceLanguage(lang) {
			return ast.WalkContinue, nil
		}
		_, _ = w.WriteString("</code></pre>\n")
		return ast.WalkContinue, nil
	}

	switch lang {
	case "mermaid":
		body := fencedCodeBlockBody(source, n)
		_, _ = w.WriteString(`<div class="an-diagram an-diagram--mermaid">`)
		_, _ = w.WriteString(`<pre class="an-diagram__src">`)
		_, _ = w.WriteString(html.EscapeString(body))
		_, _ = w.WriteString(`</pre><div class="an-diagram__out" aria-hidden="true"></div></div>`)
		return ast.WalkSkipChildren, nil
	case "math", "latex", "tex":
		body := fencedCodeBlockBody(source, n)
		_, _ = w.WriteString(`<div class="an-diagram an-diagram--math" data-an-math-display="1">`)
		_, _ = w.WriteString(`<pre class="an-diagram__src">`)
		_, _ = w.WriteString(html.EscapeString(body))
		_, _ = w.WriteString(`</pre><div class="an-diagram__out" aria-hidden="true"></div></div>`)
		return ast.WalkSkipChildren, nil
	default:
	}

	_, _ = w.WriteString("<pre><code")
	lb := n.Language(source)
	if lb != nil {
		_, _ = w.WriteString(` class="language-`)
		r.Writer.Write(w, lb)
		_, _ = w.WriteString(`"`)
	}
	_ = w.WriteByte('>')
	r.writeLinesRaw(w, source, n)
	return ast.WalkContinue, nil
}
