from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor
import re
import html
import json

BLOCK_RE = re.compile(
    r"```blockscape\s*\n(.*?)\n```",
    re.DOTALL
)

class BlockscapePreprocessor(Preprocessor):
    def run(self, lines):
        text = "\n".join(lines)

        def replace(match):
            raw = match.group(1).strip()

            try:
                json.loads(raw)
            except json.JSONDecodeError as e:
                raise RuntimeError(f"Invalid blockscape JSON: {e}")

            return f"""
<div class=\"blockscape-root\">
  <script type=\"application/json\" class=\"blockscape-seed\">
{raw}
  </script>
</div>
""".strip()

        text = BLOCK_RE.sub(replace, text)
        return text.split("\n")

class BlockscapeExtension(Extension):
    def extendMarkdown(self, md):
        md.preprocessors.register(
            BlockscapePreprocessor(md),
            "blockscape",
            35
        )

def makeExtension(**kwargs):
    return BlockscapeExtension(**kwargs)
