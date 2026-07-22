import json
import re

from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor


BLOCK_RE = re.compile(r"```blockscape\s*\n(.*?)\n```", re.DOTALL)


class BlockscapePreprocessor(Preprocessor):
    def run(self, lines):
        text = "\n".join(lines)

        def replace(match):
            raw = match.group(1).strip()

            try:
                json.loads(raw)
            except json.JSONDecodeError as error:
                raise RuntimeError(f"Invalid blockscape JSON: {error}") from error

            return (
                '<div class="blockscape-root">\n'
                '  <script type="application/json" class="blockscape-seed">\n'
                f"{raw}\n"
                "  </script>\n"
                "</div>"
            )

        return BLOCK_RE.sub(replace, text).split("\n")


class BlockscapeExtension(Extension):
    def extendMarkdown(self, md):
        md.preprocessors.register(
            BlockscapePreprocessor(md),
            "blockscape",
            35,
        )


def makeExtension(**kwargs):
    return BlockscapeExtension(**kwargs)

