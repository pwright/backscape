# BS File Opener for macOS

Set up Finder so `.bs` files open with `encode-bs-share.py` via a small Automator app.

## Prerequisites

- macOS with Automator (built-in)
- Python 3 available as `python3`
- `encode-bs-share.py` located in a fixed path (do not move it after setup)

## Setup Steps

1) Make the script executable:

```bash
chmod +x /Users/yourname/repos/blockscape/encode-bs-share.py
```

2) Open **Automator** → **New Document** → choose **Application**.

3) Add a **Run Shell Script** action and configure:

- Shell: `/bin/zsh`
- Pass input: `as arguments`
- Script body (update the `cd` path to your repo):

```bash
cd "/Users/yourname/repos/blockscape"
./encode-bs-share.py "$@"
```

4) Save as `BS File Opener.app` (e.g., in `~/Applications`).

5) Set the default association:

- Finder → right-click any `.bs` file → **Get Info**
- **Open With** → choose `BS File Opener.app`
- Click **Change All…** and confirm

6) Test by double-clicking a `.bs` file; a Terminal window should run the script.

## Updating or Moving the Repo

If you move the repo, open `BS File Opener.app` in Automator, update the `cd` path in the script body, save, and repeat the **Open With → Change All…** step to refresh the association.
