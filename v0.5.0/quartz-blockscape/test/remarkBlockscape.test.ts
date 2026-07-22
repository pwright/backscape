import fs from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { unified } from "unified"
import remarkParse from "remark-parse"
import { toHast } from "mdast-util-to-hast"
import { toHtml } from "hast-util-to-html"
import { VFile } from "vfile"
import { remarkBlockscape, type RemarkBlockscapeOptions } from "../src/remarkBlockscape"

const fixtures = path.join(import.meta.dirname, "fixtures")

async function readFixture(name: string): Promise<string> {
  return fs.readFile(path.join(fixtures, name), "utf8")
}

async function renderMarkdown(name: string, options?: RemarkBlockscapeOptions): Promise<string> {
  const markdown = await readFixture(name)
  const tree = unified().use(remarkParse).use(remarkBlockscape, options).parse(new VFile({ path: name, value: markdown }))
  await unified().use(remarkBlockscape, options).run(tree, new VFile({ path: name, value: markdown }))
  const hast = toHast(tree, { allowDangerousHtml: true })
  return toHtml(hast, { allowDangerousHtml: true }).trim()
}

describe("remarkBlockscape", () => {
  it("converts blockscape fenced blocks", async () => {
    await expect(renderMarkdown("inline.md")).resolves.toBe((await readFixture("inline.expected.html")).trim())
  })

  it("converts bs fenced blocks", async () => {
    const html = await renderMarkdown("alias.md")
    expect(html).toContain('class="blockscape-root" data-blockscape-mode="inline"')
    expect(html).toContain('"id": "alias"')
  })

  it("marks full renderer fenced blocks", async () => {
    const html = await renderMarkdown("full.md")
    expect(html).toContain('data-blockscape-renderer="full"')
  })

  it("uses plugin default renderer for ordinary blockscape fences", async () => {
    const html = await renderMarkdown("inline.md", { defaultRenderer: "full" })
    expect(html).toContain('data-blockscape-renderer="full"')
  })

  it("validates inline series arrays", async () => {
    const html = await renderMarkdown("series.md")
    expect(html).toContain('data-blockscape-renderer="full"')
    expect(html).toContain('"id": "series-v2"')
  })

  it("leaves source embed markers for the client runtime", async () => {
    const html = await renderMarkdown("src-embed.md")
    expect(html).toContain('<div class="blockscape-root" data-src="./maps/skupper.bs"></div>')
  })

  it("fails invalid inline JSON with the markdown path", async () => {
    await expect(renderMarkdown("invalid.md")).rejects.toThrow(/Invalid Blockscape JSON in invalid\.md/)
  })

  it("leaves ordinary code blocks alone", async () => {
    const html = await renderMarkdown("ordinary.md")
    expect(html).toContain('<code class="language-json">')
    expect(html).not.toContain("blockscape-root")
  })
})
