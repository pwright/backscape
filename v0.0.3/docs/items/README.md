# Item details


Optionally add html corresponding to any item in a registered model.

You can use md and template, eg:


```bash
pandoc --template=template.html credibility.md -o credibility.html
```


Build all md files:

```bash
for file in *.md; do
  # Get the filename without the .md extension (e.g., 'credibility')
  base=$(basename "$file" .md)
  
  # Run the pandoc command for each file
  pandoc --template=template.html "$file" -o "$base.html"
done
```